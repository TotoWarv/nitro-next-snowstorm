import type { SnowWarGameObjectData } from '@nitrodevco/nitro-packets';

import type { ISnowWarHuman } from './ISnowWarHuman';
import { SnowWarActivityState, SnowWarConstants, SnowWarObjectType, SnowWarTrajectory } from './SnowWarConstants';
import { SnowWarGameObject } from './SnowWarGameObject';
import type { SnowWarGrid } from './SnowWarGrid';
import type { SnowWarHumanIdentity } from './SnowWarHumanIdentity';
import { angle, dir360ToDir8, isInTile, isWithinDistance, rotateDir8, tileToWorld } from './SnowWarMath';
import type { SnowWarRayGun } from './SnowWarRayGun';
import { SnowWarSnowball } from './SnowWarSnowball';
import type { ISnowWarSnowballSource } from './SnowWarSnowballSource';
import type { SnowWarTile } from './SnowWarTile';
import type { SnowWarWorld } from './SnowWarWorld';

const HUMAN_VARIABLE_COUNT = 17;
const HUMAN_STRING_COUNT = 4;
const SIDESTEP_TURNS = [ -1, 1 ];

const stepAxis = (position: number, center: number): number => {
    const gap = position - center;

    if (gap === 0) return position;

    if (Math.abs(gap) < SnowWarConstants.WALK_STEP) return center;

    return (gap > 0) ? position - SnowWarConstants.WALK_STEP : position + SnowWarConstants.WALK_STEP;
};

export class SnowWarHuman extends SnowWarGameObject implements ISnowWarHuman {
    public readonly type = SnowWarObjectType.Human;
    public x: number;
    public y: number;
    public nextTile: SnowWarTile | null = null;
    public targetX: number;
    public targetY: number;
    public hp: number = SnowWarConstants.MAX_HEALTH;
    public balls: number = SnowWarConstants.MAX_SNOWBALLS;
    public activityTimer = 0;
    public activityState = SnowWarActivityState.Normal;
    public throwTimer = 0;
    public score = 0;
    public isWalking = false;

    constructor(
        id: number,
        private readonly identity: SnowWarHumanIdentity,
        public tile: SnowWarTile,
        public bodyDirection: number,
    ) {
        super(id);

        this.x = tile.centerX;
        this.y = tile.centerY;
        this.targetX = this.x;
        this.targetY = this.y;
    }

    public static fromData(data: SnowWarGameObjectData, grid: SnowWarGrid): SnowWarHuman {
        const v = data.variables;

        if ((v.length !== HUMAN_VARIABLE_COUNT) || (data.strings.length !== HUMAN_STRING_COUNT)) throw new Error(`SnowWar human ${data.id} has a malformed state`);

        if ((v[4] < 0) || (v[4] > 7)) throw new Error(`SnowWar human ${data.id} faces invalid direction ${v[4]}`);

        const [ name, mission, figure, gender ] = data.strings;
        const human = new SnowWarHuman(data.id, { userId: v[16], team: v[15], name, mission, figure, gender }, grid.tileAt(v[2], v[3]), v[4]);
        const next = grid.tileAt(v[10], v[11]);

        human.x = v[0];
        human.y = v[1];
        human.hp = v[5];
        human.balls = v[6];
        human.activityTimer = v[8];
        human.activityState = v[9];
        human.targetX = v[12];
        human.targetY = v[13];
        human.score = v[14];

        if (next === human.tile) {
            human.tile.setOccupant(human);
        } else {
            human.nextTile = next;
            human.isWalking = true;
            next.setOccupant(human);
        }

        return human;
    }

    public get userId(): number {
        return this.identity.userId;
    }

    public get team(): number {
        return this.identity.team;
    }

    public get name(): string {
        return this.identity.name;
    }

    public get mission(): string {
        return this.identity.mission;
    }

    public get figure(): string {
        return this.identity.figure;
    }

    public get gender(): string {
        return this.identity.gender;
    }

    public get tileX(): number {
        return this.tile.x;
    }

    public get tileY(): number {
        return this.tile.y;
    }

    public get nextTileX(): number {
        return (this.nextTile ?? this.tile).x;
    }

    public get nextTileY(): number {
        return (this.nextTile ?? this.tile).y;
    }

    public get canWalk(): boolean {
        return (this.activityState === SnowWarActivityState.Normal) || (this.activityState === SnowWarActivityState.Invincible);
    }

    public get canMakeSnowball(): boolean {
        return this.canWalk && (this.balls < SnowWarConstants.MAX_SNOWBALLS);
    }

    private get isTouchable(): boolean {
        return (this.activityState === SnowWarActivityState.Normal) || (this.activityState === SnowWarActivityState.MakingSnowball);
    }

    public override get strings(): string[] {
        return [ this.name, this.mission, this.figure, this.gender ];
    }

    public variables(): number[] {
        return [
            this.x, this.y, this.tileX, this.tileY, this.bodyDirection, this.hp, this.balls, 0, this.activityTimer, this.activityState,
            this.nextTileX, this.nextTileY, this.targetX, this.targetY, this.score, this.team, this.userId,
        ];
    }

    public copyOn(grid: SnowWarGrid): SnowWarHuman {
        const copy = new SnowWarHuman(this.id, this.identity, grid.tileAt(this.tile.x, this.tile.y), this.bodyDirection);

        copy.x = this.x;
        copy.y = this.y;
        copy.nextTile = this.nextTile && grid.tileAt(this.nextTile.x, this.nextTile.y);
        copy.targetX = this.targetX;
        copy.targetY = this.targetY;
        copy.hp = this.hp;
        copy.balls = this.balls;
        copy.activityTimer = this.activityTimer;
        copy.activityState = this.activityState;
        copy.throwTimer = this.throwTimer;
        copy.score = this.score;
        copy.isWalking = this.isWalking;

        return copy;
    }

    public override update(world: SnowWarWorld): void {
        if (this.activityTimer > 0) {
            if (this.activityTimer === 1) this.endActivity();

            this.activityTimer--;
        }

        if (this.throwTimer > 0) this.throwTimer--;

        if (!this.canWalk) {
            this.isWalking = false;
            return;
        }

        if (this.nextTile) {
            this.step(this.nextTile);
            return;
        }

        if (isInTile(this.targetX, this.targetY, this.tile.centerX, this.tile.centerY)) {
            this.isWalking = false;
            return;
        }

        this.chooseNextTile(world.grid);
    }

    public override stopsSnowball(snowball: SnowWarSnowball): boolean {
        return this.isTouchable
            && (snowball.throwerId !== this.id)
            && (snowball.z < SnowWarConstants.HUMAN_HIT_HEIGHT)
            && isWithinDistance(this.x, this.y, snowball.x, snowball.y, SnowWarConstants.HUMAN_RADIUS + SnowWarConstants.SNOWBALL_RADIUS);
    }

    public override onSnowballImpact(world: SnowWarWorld, snowball: SnowWarSnowball): void {
        const thrower = world.findActiveHuman(snowball.throwerId);

        if (!thrower || (thrower.team === this.team) || (this.hp === 0)) return;

        const knockedDown = (this.hp === 1);

        if (knockedDown) {
            this.knockDown(snowball.direction);
            thrower.score += SnowWarConstants.KNOCKDOWN_POINTS;
        }

        this.hp--;
        thrower.score += SnowWarConstants.HIT_POINTS;
        world.happen({ kind: 'humanHit', humanId: this.id, throwerId: thrower.id, knockedDown });
    }

    public setMoveTarget(x: number, y: number): void {
        if (this.activityState === SnowWarActivityState.MakingSnowball) {
            this.activityState = SnowWarActivityState.Normal;
            this.activityTimer = 0;
        }

        if (!this.canWalk) return;

        this.targetX = x;
        this.targetY = y;
    }

    public throwAt(x: number, y: number): boolean {
        const threw = (this.balls >= 1);

        if (threw) {
            this.stop();
            this.bodyDirection = dir360ToDir8(angle(x - this.x, y - this.y));
            this.balls--;
        }

        this.throwTimer = SnowWarConstants.THROW_INTERVAL;

        return threw;
    }

    public startMakingSnowball(): boolean {
        if (!this.canMakeSnowball) return false;

        this.activityState = SnowWarActivityState.MakingSnowball;
        this.activityTimer = SnowWarConstants.MAKE_SNOWBALL_SUBTURNS;
        this.stop();

        return true;
    }

    public receiveSnowball(source: ISnowWarSnowballSource): boolean {
        if ((this.balls >= SnowWarConstants.MAX_SNOWBALLS) || !source.tryTakeSnowball()) return false;

        this.balls++;

        return true;
    }

    public fireRayGun(world: SnowWarWorld, gun: SnowWarRayGun, firstSnowballId: number): void {
        this.bodyDirection = gun.direction;
        this.throwTimer = SnowWarConstants.THROW_INTERVAL;

        for (let i = 0; i < SnowWarConstants.RAY_GUN_SNOWBALLS; i++) {
            const id = firstSnowballId + i;

            if (world.contains(id)) continue;

            world.add(SnowWarSnowball.create(id, this.id, this.x, this.y, tileToWorld(gun.targetTileX(i)), tileToWorld(gun.targetTileY(i)), SnowWarTrajectory.Default));
        }
    }

    public leave(world: SnowWarWorld): void {
        this.tile.clearOccupant(this);
        this.nextTile?.clearOccupant(this);
        this.markRemoved();
        world.forgetThrower(this.id);
    }

    private knockDown(snowballDirection: number): void {
        this.activityState = SnowWarActivityState.Stunned;
        this.activityTimer = SnowWarConstants.STUN_SUBTURNS;
        this.bodyDirection = rotateDir8(dir360ToDir8(snowballDirection), 4);
        this.stop();
    }

    private endActivity(): void {
        switch (this.activityState) {
            case SnowWarActivityState.Stunned:
                this.hp = SnowWarConstants.MAX_HEALTH;
                this.activityState = SnowWarActivityState.Invincible;
                this.activityTimer = SnowWarConstants.INVINCIBILITY_SUBTURNS;
                break;
            case SnowWarActivityState.MakingSnowball:
                this.balls++;
                this.activityState = SnowWarActivityState.Normal;
                break;
            case SnowWarActivityState.Invincible:
                this.activityState = SnowWarActivityState.Normal;
                break;
            case SnowWarActivityState.Normal:
                break;
        }
    }

    private stop(): void {
        if (this.nextTile) {
            this.tile = this.nextTile;
            this.nextTile = null;
        }

        this.x = this.tile.centerX;
        this.y = this.tile.centerY;
        this.targetX = this.x;
        this.targetY = this.y;
        this.isWalking = false;
    }

    private chooseNextTile(grid: SnowWarGrid): void {
        const heading = dir360ToDir8(angle(this.targetX - this.tile.centerX, this.targetY - this.tile.centerY));
        const straight = grid.neighbor(this.tile, heading);

        if (straight?.isWalkable) {
            this.moveTo(straight, heading);
            return;
        }

        if (straight && (this.targetX === straight.centerX) && (this.targetY === straight.centerY)) {
            this.stop();
            return;
        }

        for (const turn of SIDESTEP_TURNS) {
            const direction = rotateDir8(heading, turn);
            const candidate = grid.neighbor(this.tile, direction);

            if (candidate?.isWalkable) {
                this.moveTo(candidate, direction);
                return;
            }
        }

        this.isWalking = false;
    }

    private moveTo(next: SnowWarTile, direction: number): void {
        this.tile.clearOccupant(this);
        next.setOccupant(this);
        this.nextTile = next;
        this.bodyDirection = direction;
        this.step(next);
    }

    private step(next: SnowWarTile): void {
        this.x = stepAxis(this.x, next.centerX);
        this.y = stepAxis(this.y, next.centerY);

        if ((Math.abs(this.x - next.centerX) + Math.abs(this.y - next.centerY)) < SnowWarConstants.ARRIVAL_THRESHOLD) {
            this.tile = next;
            this.nextTile = null;
        }

        this.isWalking = true;
    }
}
