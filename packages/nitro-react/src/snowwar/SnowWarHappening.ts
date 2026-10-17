export type SnowWarHappening
    = | { kind: 'snowballThrown'; humanId: number }
        | { kind: 'humanHit'; humanId: number; throwerId: number; knockedDown: boolean }
        | { kind: 'snowballLanded'; snowballId: number; x: number; y: number; z: number; stoppedById: number }
        | { kind: 'snowballPicked'; humanId: number; sourceId: number }
        | { kind: 'snowballMakingStarted'; humanId: number }
        | { kind: 'rayGunFired'; humanId: number; fuseId: number };
