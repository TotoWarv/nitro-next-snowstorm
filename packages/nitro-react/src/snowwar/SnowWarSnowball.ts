import type { SnowWarGameObjectData } from '@nitrodevco/nitro-packets';

import type { ISnowWarSnowball } from './ISnowWarSnowball';
import { SnowWarConstants, SnowWarObjectType, SnowWarTrajectory } from './SnowWarConstants';
import { SnowWarGameObject } from './SnowWarGameObject';
import type { SnowWarGrid } from './SnowWarGrid';
import { angle, baseVectorX, baseVectorY, dir360ToDir8, divide, fastSqrt, normalizeDirection, rotateDir8 } from './SnowWarMath';
import type { SnowWarTile } from './SnowWarTile';
import type { SnowWarWorld } from './SnowWarWorld';

const SNOWBALL_VARIABLE_COUNT = 9;

interface SnowWarFlight {
    readonly life: number;
    readonly speed: number;
}

const resolveTrajectory = (distance: number): SnowWarTrajectory => {
    if (distance <= SnowWarConstants.DEFAULT_QUICK_RANGE) return SnowWarTrajectory.Quick;

    if (distance <= SnowWarConstants.DEFAULT_SHORT_LOB_RANGE) return SnowWarTrajectory.ShortLob;

    return SnowWarTrajectory.LongLob;
};

const lob = (distance: number, timePerUnit: number): SnowWarFlight => {
    const life = Math.trunc(distance * timePerUnit);

    return { life, speed: (life === 0) ? 0 : divide(distance, life) };
};

const flightOf = (trajectory: SnowWarTrajectory, distance: number): SnowWarFlight => {
    switch (trajectory) {
        case SnowWarTrajectory.Quick:
            return { life: SnowWarConstants.QUICK_LIFE, speed: SnowWarConstants.QUICK_SPEED };
        case SnowWarTrajectory.ShortLob:
            return lob(Math.min(distance, SnowWarConstants.SHORT_LOB_RANGE), SnowWarConstants.SHORT_LOB_TIME_PER_UNIT);
        case SnowWarTrajectory.LongLob:
            return lob(Math.min(distance, SnowWarConstants.LONG_LOB_RANGE), SnowWarConstants.LONG_LOB_TIME_PER_UNIT);
        default:
            throw new Error(`SnowWar trajectory ${trajectory} cannot fly`);
    }
};

const heightFactorOf = (trajectory: SnowWarTrajectory): number => {
    switch (trajectory) {
        case SnowWarTrajectory.Quick:
            return SnowWarConstants.QUICK_HEIGHT_FACTOR;
        case SnowWarTrajectory.ShortLob:
            return SnowWarConstants.SHORT_LOB_HEIGHT_FACTOR;
        default:
            return SnowWarConstants.LONG_LOB_HEIGHT_FACTOR;
    }
};

export class SnowWarSnowball extends SnowWarGameObject implements ISnowWarSnowball {
    public readonly type = SnowWarObjectType.Snowball;

    constructor(
        id: number,
        public x: number,
        public y: number,
        public z: number,
        public readonly direction: number,
        public readonly trajectory: SnowWarTrajectory,
        public life: number,
        public throwerId: number,
        public readonly parabolaOffset: number,
        public readonly speed: number,
    ) {
        super(id);
    }

    public static create(id: number, throwerId: number, x: number, y: number, targetX: number, targetY: number, requested: SnowWarTrajectory): SnowWarSnowball {
        const dx = divide(targetX - x, SnowWarConstants.THROW_DISTANCE_STEP);
        const dy = divide(targetY - y, SnowWarConstants.THROW_DISTANCE_STEP);
        const direction = normalizeDirection(angle(dx, dy));
        const distance = fastSqrt((dx * dx) + (dy * dy)) * SnowWarConstants.THROW_DISTANCE_STEP;
        const trajectory = (requested === SnowWarTrajectory.Default) ? resolveTrajectory(distance) : requested;
        const { life, speed } = flightOf(trajectory, distance);

        return new SnowWarSnowball(id, x, y, SnowWarConstants.SNOWBALL_START_HEIGHT, direction, trajectory, life, throwerId, divide(life, 2), speed);
    }

    public static fromData(data: SnowWarGameObjectData): SnowWarSnowball {
        const v = data.variables;

        if (v.length !== SNOWBALL_VARIABLE_COUNT) throw new Error(`SnowWar snowball ${data.id} has a malformed state`);

        return new SnowWarSnowball(data.id, v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]);
    }

    public variables(): number[] {
        return [ this.x, this.y, this.z, this.direction, this.trajectory, this.life, this.throwerId, this.parabolaOffset, this.speed ];
    }

    public copyOn(_grid: SnowWarGrid): SnowWarSnowball {
        return new SnowWarSnowball(this.id, this.x, this.y, this.z, this.direction, this.trajectory, this.life, this.throwerId, this.parabolaOffset, this.speed);
    }

    public forgetThrower(): void {
        this.throwerId = 0;
    }

    public override update(world: SnowWarWorld): void {
        this.life--;
        this.x += divide(baseVectorX(this.direction) * this.speed, SnowWarConstants.BASE_VECTOR_DIVISOR);
        this.y += divide(baseVectorY(this.direction) * this.speed, SnowWarConstants.BASE_VECTOR_DIVISOR);

        const fromVertex = this.life - this.parabolaOffset;

        this.z = (((this.parabolaOffset * this.parabolaOffset) - (fromVertex * fromVertex)) * heightFactorOf(this.trajectory)) + SnowWarConstants.SNOWBALL_START_HEIGHT;

        if (this.trajectory === SnowWarTrajectory.Quick) this.z = Math.min(this.z, SnowWarConstants.SNOWBALL_START_HEIGHT);

        const tile = world.grid.atWorld(this.x, this.y);
        const stopper = tile && this.findStopperAround(world, tile);

        if (stopper) {
            stopper.onSnowballImpact(world, this);
            this.land(world, stopper.id);
            return;
        }

        if ((this.z < 1) || (tile && (this.z < tile.height))) this.land(world, 0);
    }

    private land(world: SnowWarWorld, stoppedById: number): void {
        this.markRemoved();
        world.happen({ kind: 'snowballLanded', snowballId: this.id, x: this.x, y: this.y, z: this.z, stoppedById });
    }

    private findStopperAround(world: SnowWarWorld, tile: SnowWarTile): SnowWarGameObject | null {
        const heading = dir360ToDir8(this.direction);
        const candidates = [ tile, world.grid.neighbor(tile, heading), world.grid.neighbor(tile, rotateDir8(heading, -1)), world.grid.neighbor(tile, rotateDir8(heading, 1)) ];

        for (const candidate of candidates) {
            const occupant = candidate?.occupant;

            if (occupant?.isActive && occupant.stopsSnowball(this)) return occupant;
        }

        return null;
    }
}
