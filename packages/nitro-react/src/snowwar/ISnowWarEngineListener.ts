export interface ISnowWarEngineListener {
    snowballThrown(humanId: number): void;
    humanHit(humanId: number, throwerId: number, knockedDown: boolean): void;
    snowballLanded(snowballId: number, x: number, y: number, z: number, stoppedById: number): void;
    snowballPicked(humanId: number, sourceId: number): void;
    snowballMakingStarted(humanId: number): void;
    rayGunFired(humanId: number, fuseId: number): void;
}
