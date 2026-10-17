import { IRoom, IRoomGameInputHandler, RoomObjectCategoryEnum, RoomObjectLogicType, RoomObjectUserType, RoomObjectVariableEnum, Vector3d } from '@nitrodevco/nitro-api';
import type { SnowWarFuseObjectData, SnowWarLevelData } from '@nitrodevco/nitro-packets';
import { GetRoomEngine, RoomPlaneParser } from '@nitrodevco/nitro-renderer';

import { GetSoundManager, HabboSoundTypesEnum } from '#base/sound';
import { buildRoomWallGeometry } from '#base/utils';

import type { ISnowWarDecorState } from './ISnowWarDecorState';
import type { ISnowWarHuman } from './ISnowWarHuman';
import type { ISnowWarSnowball } from './ISnowWarSnowball';
import { SnowWarActivityState, SnowWarConstants } from './SnowWarConstants';

export const SNOWWAR_ARENA_ROOM_ID = 0x7FFF5357;

export const SnowWarEffects = {
    TEAM_1: 96,
    TEAM_2: 95,
    AIM: 98,
} as const;

const TEAM_EFFECTS: Readonly<Record<number, number>> = { 1: SnowWarEffects.TEAM_1, 2: SnowWarEffects.TEAM_2 };
const TEAM_SHIRTS: Readonly<Record<number, string>> = { 1: 'ch-20000', 2: 'ch-20001' };
const REMOVED_FIGURE_PARTS = [ 'ch', 'cc' ];
const WORLD_UNITS_PER_HEIGHT = 1600;
const DEGREES_PER_DIRECTION = 45;
const TURN_MS = 150;
const SPLASH_LIFETIME_MS = 500;
const RAY_GUN_FLASH_MS = 500;
const WALK_SOUND_LOOPS = 999;
const MISSING_TILE = 'x';
const ROW_SEPARATOR = /\r\n|\r|\n/;
const VISIBLE_ALPHA = 1;
const INVINCIBLE_ALPHA = 100 / 255;

const Postures = {
    THROW: 'swthrow',
    PICK: 'swpick',
    DOWN: 'swdieback',
    RUN: 'swrun',
    STAND: 'std',
} as const;

interface ArenaHuman {
    location: Vector3d;
    posture: string;
    effect: number;
    alpha: number;
}

const tileLocation = (x: number, y: number, z: number = 0) => new Vector3d(x / SnowWarConstants.TILE_SIZE, y / SnowWarConstants.TILE_SIZE, z / WORLD_UNITS_PER_HEIGHT);

const postureOf = (human: ISnowWarHuman): string => {
    if (human.throwTimer > 0) return Postures.THROW;
    if (human.activityState === SnowWarActivityState.MakingSnowball) return Postures.PICK;
    if (human.activityState === SnowWarActivityState.Stunned) return Postures.DOWN;
    if (human.isWalking) return Postures.RUN;

    return Postures.STAND;
};

const alphaOf = (human: ISnowWarHuman) => ((human.activityState === SnowWarActivityState.Invincible) ? INVINCIBLE_ALPHA : VISIBLE_ALPHA);

const canBeAimedAt = (human: ISnowWarHuman) => (human.activityState !== SnowWarActivityState.Stunned) && (human.activityState !== SnowWarActivityState.Invincible);

export const snowWarTeamFigure = (figure: string, team: number): string => {
    const kept = figure.split('.').filter(part => part && !REMOVED_FIGURE_PARTS.includes(part.split('-')[0]));
    const shirt = TEAM_SHIRTS[team];

    return (shirt ? [ ...kept, shirt ] : kept).join('.');
};

const isExistingTile = (rows: readonly string[], x: number, y: number) => (rows[y] ?? '').charAt(x).toLowerCase() !== MISSING_TILE;

export class SnowWarArenaRoom {
    private readonly humans = new Map<number, ArenaHuman>();
    private readonly snowballIds = new Set<number>();
    private readonly decorStates = new Map<number, number>();
    private aimedHumanId: number | undefined = undefined;
    private nextSplashId = 1;
    private walkSoundPlaying = false;
    private disposed = false;

    private constructor(public readonly room: IRoom) {}

    public static build(level: SnowWarLevelData, inputHandler: IRoomGameInputHandler): SnowWarArenaRoom {
        const arena = new SnowWarArenaRoom(GetRoomEngine().createRoom(SNOWWAR_ARENA_ROOM_ID));

        arena.applyLevelMap(level);
        arena.room.setGameMode(true);
        arena.room.setGameInputHandler(inputHandler);

        for (const fuse of level.fuseObjects) arena.addFuseObject(fuse);

        return arena;
    }

    private applyLevelMap(level: SnowWarLevelData): void {
        const rows = level.heightMap.split(ROW_SEPARATOR);
        const planeParser = new RoomPlaneParser();

        planeParser.initializeTileMap(level.width, level.height);

        for (let y = 0; y < level.height; y++) {
            for (let x = 0; x < level.width; x++) {
                if (isExistingTile(rows, x, y)) planeParser.setTileHeight(x, y, 0);
            }
        }

        planeParser.initializeFromTileData();

        this.room.setLegacyGeometry(buildRoomWallGeometry(planeParser, level.width, level.height));
        this.room.applyRoomMap(planeParser.getMapData());
        this.room.setRoomValue(RoomObjectVariableEnum.CameraInitX, level.width / 2);
        this.room.setRoomValue(RoomObjectVariableEnum.CameraInitY, level.height / 2);
        this.room.setRoomValue(RoomObjectVariableEnum.CameraInitZ, 0);
    }

    private addFuseObject(fuse: SnowWarFuseObjectData): void {
        const location = new Vector3d(fuse.x, fuse.y, fuse.altitude / WORLD_UNITS_PER_HEIGHT);
        const direction = new Vector3d(fuse.direction * DEGREES_PER_DIRECTION);
        const state = Number(fuse.stuffData?.state ?? 0) || 0;

        this.room.addFurnitureFloorByTypeName(fuse.id, fuse.name, location, direction, state, fuse.stuffData);
    }

    public sync(humans: readonly ISnowWarHuman[], snowballs: readonly ISnowWarSnowball[], decorStates: readonly ISnowWarDecorState[]): void {
        if (this.disposed) return;

        this.syncHumans(humans);
        this.syncSnowballs(snowballs);
        this.syncDecor(decorStates);
        this.syncWalkSound(humans.some(human => human.isWalking));
    }

    private syncHumans(humans: readonly ISnowWarHuman[]): void {
        const present = new Set<number>();

        for (const human of humans) {
            present.add(human.id);
            this.syncHuman(human);
        }

        for (const id of [ ...this.humans.keys() ]) {
            if (!present.has(id)) this.removeHuman(id);
        }
    }

    private syncHuman(human: ISnowWarHuman): void {
        const location = tileLocation(human.x, human.y);
        const degrees = human.bodyDirection * DEGREES_PER_DIRECTION;
        const direction = new Vector3d(degrees);
        const known = this.humans.get(human.id);

        if (!known) {
            this.room.addRoomObjectUser(human.id, location, direction, degrees, RoomObjectUserType.User, snowWarTeamFigure(human.figure, human.team));
            this.room.updateRoomObjectUserFigure(human.id, snowWarTeamFigure(human.figure, human.team), human.gender);
        } else {
            this.room.updateRoomObjectUser(human.id, known.location, location, true, 0, direction, degrees, TURN_MS);
        }

        const entry: ArenaHuman = known ?? { location, posture: '', effect: 0, alpha: VISIBLE_ALPHA };
        const posture = postureOf(human);
        const effect = ((this.aimedHumanId === human.id) && canBeAimedAt(human)) ? SnowWarEffects.AIM : (TEAM_EFFECTS[human.team] ?? 0);
        const alpha = alphaOf(human);

        if (posture !== entry.posture) this.room.updateRoomObjectUserPosture(human.id, posture);
        if (effect !== entry.effect) this.room.updateRoomObjectUserEffect(human.id, effect);
        if (alpha !== entry.alpha) this.room.getRoomObject(human.id, RoomObjectCategoryEnum.Unit)?.model.setValue(RoomObjectVariableEnum.FigureAlphaMultiplier, alpha);

        this.humans.set(human.id, { location, posture, effect, alpha });
    }

    public removeHuman(humanId: number): void {
        if (!this.humans.delete(humanId) || this.disposed) return;

        if (this.aimedHumanId === humanId) this.aimedHumanId = undefined;

        this.room.removeRoomObjectUser(humanId);
    }

    public aimAt(humanId: number | undefined, humans: readonly ISnowWarHuman[]): void {
        this.aimedHumanId = humanId;

        if (this.disposed) return;

        for (const human of humans) {
            if (this.humans.has(human.id)) this.syncHuman(human);
        }
    }

    private syncSnowballs(snowballs: readonly ISnowWarSnowball[]): void {
        const present = new Set<number>();

        for (const snowball of snowballs) {
            present.add(snowball.id);

            if (!this.snowballIds.has(snowball.id)) {
                this.room.createRoomObjectAndInitalize(snowball.id, RoomObjectLogicType.GAME_SNOWBALL, RoomObjectCategoryEnum.Snowball);
                this.snowballIds.add(snowball.id);
            }

            this.room.getRoomObject(snowball.id, RoomObjectCategoryEnum.Snowball)?.setLocation(tileLocation(snowball.x, snowball.y, snowball.z));
        }

        for (const id of [ ...this.snowballIds ]) {
            if (present.has(id)) continue;

            this.snowballIds.delete(id);
            this.room.removeRoomObject(id, RoomObjectCategoryEnum.Snowball);
        }
    }

    private syncDecor(decorStates: readonly ISnowWarDecorState[]): void {
        for (const { fuseId, state } of decorStates) {
            if (this.decorStates.get(fuseId) === state) continue;

            this.decorStates.set(fuseId, state);
            this.room.updateRoomObjectFloor(fuseId, undefined, undefined, state);
        }
    }

    private syncWalkSound(anyoneWalking: boolean): void {
        if (anyoneWalking === this.walkSoundPlaying) return;

        this.walkSoundPlaying = anyoneWalking;

        if (anyoneWalking) GetSoundManager().playSound(HabboSoundTypesEnum.GAMES_SW_WALK, WALK_SOUND_LOOPS);
        else GetSoundManager().stopSound(HabboSoundTypesEnum.GAMES_SW_WALK);
    }

    public silence(): void {
        this.syncWalkSound(false);
    }

    public splash(x: number, y: number, z: number): void {
        if (this.disposed) return;

        const id = this.nextSplashId++;

        this.room.createRoomObjectAndInitalize(id, RoomObjectLogicType.GAME_SNOWSPLASH, RoomObjectCategoryEnum.SnowSplash);
        this.room.getRoomObject(id, RoomObjectCategoryEnum.SnowSplash)?.setLocation(tileLocation(x, y, Math.max(0, z)));

        setTimeout(() => {
            if (!this.disposed) this.room.removeRoomObject(id, RoomObjectCategoryEnum.SnowSplash);
        }, SPLASH_LIFETIME_MS);
    }

    public flashRayGun(fuseId: number): void {
        if (this.disposed) return;

        this.room.updateRoomObjectFloor(fuseId, undefined, undefined, 1);

        setTimeout(() => {
            if (!this.disposed) this.room.updateRoomObjectFloor(fuseId, undefined, undefined, 0);
        }, RAY_GUN_FLASH_MS);
    }

    public playSound(soundId: string): void {
        if (!this.disposed) GetSoundManager().playSound(soundId);
    }

    public dispose(): void {
        if (this.disposed) return;

        this.syncWalkSound(false);
        this.disposed = true;
        this.humans.clear();
        this.snowballIds.clear();

        GetRoomEngine().disposeRoom(SNOWWAR_ARENA_ROOM_ID);
    }
}
