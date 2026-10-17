export const SnowWarConstants = {
    SUBTURNS_PER_TURN: 3,
    TILE_SIZE: 3200,
    HALF_TILE: 1600,
    WALK_STEP: 534,
    ARRIVAL_THRESHOLD: 267,
    MAX_HEALTH: 5,
    MAX_SNOWBALLS: 5,
    MAKE_SNOWBALL_SUBTURNS: 20,
    STUN_SUBTURNS: 100,
    INVINCIBILITY_SUBTURNS: 60,
    THROW_INTERVAL: 5,
    HIT_POINTS: 1,
    KNOCKDOWN_POINTS: 5,
    HUMAN_RADIUS: 1600,
    HUMAN_HIT_HEIGHT: 5000,
    SNOWBALL_RADIUS: 400,
    SNOWBALL_START_HEIGHT: 3000,
    THROW_DISTANCE_STEP: 200,
    QUICK_SPEED: 2000,
    QUICK_LIFE: 10,
    SHORT_LOB_TIME_PER_UNIT: 0.000559,
    LONG_LOB_TIME_PER_UNIT: 0.0007072135785007072,
    SHORT_LOB_RANGE: 60000,
    LONG_LOB_RANGE: 100000,
    DEFAULT_QUICK_RANGE: 42000,
    DEFAULT_SHORT_LOB_RANGE: 60000,
    QUICK_HEIGHT_FACTOR: 10,
    SHORT_LOB_HEIGHT_FACTOR: 25,
    LONG_LOB_HEIGHT_FACTOR: 50,
    BASE_VECTOR_DIVISOR: 255,
    TREE_RADIUS: 2799,
    PILE_RADIUS_PER_SNOWBALL: 100,
    MACHINE_RADIUS: 1200,
    RAY_GUN_FURNI: 'ads_igorraygun',
    RAY_GUN_SNOWBALLS: 7,
    RAY_GUN_RANGE: 15,
} as const;

export enum SnowWarObjectType {
    Snowball = 1,
    Tree = 2,
    Pile = 3,
    Machine = 4,
    Human = 5,
}

export enum SnowWarActivityState {
    Normal = 0,
    MakingSnowball = 1,
    Stunned = 2,
    Invincible = 3,
}

export enum SnowWarTrajectory {
    Quick = 0,
    ShortLob = 1,
    LongLob = 2,
    Default = 3,
}

export enum SnowWarEventType {
    HumanLeftGame = 1,
    NewMoveTarget = 2,
    HumanThrowsSnowballAtHuman = 3,
    HumanThrowsSnowballAtPosition = 4,
    HumanStartsToMakeASnowball = 7,
    CreateSnowball = 8,
    MachineCreatesSnowball = 11,
    HumanGetsSnowballsFromMachine = 12,
    RayGunBurst = 100,
}
