import type { SnowWarEventType, SnowWarTrajectory } from './SnowWarConstants';
import type { SnowWarHuman } from './SnowWarHuman';
import type { SnowWarMachine } from './SnowWarMachine';
import type { SnowWarRayGun } from './SnowWarRayGun';
import type { ISnowWarSnowballSource } from './SnowWarSnowballSource';

type Resolved<T extends SnowWarEventType, F> = { readonly type: T; readonly subturn: number } & F;

export type SnowWarResolvedEvent
    = | Resolved<SnowWarEventType.HumanLeftGame, { human: SnowWarHuman }>
        | Resolved<SnowWarEventType.NewMoveTarget, { human: SnowWarHuman; x: number; y: number }>
        | Resolved<SnowWarEventType.HumanThrowsSnowballAtHuman, { human: SnowWarHuman; target: SnowWarHuman }>
        | Resolved<SnowWarEventType.HumanThrowsSnowballAtPosition, { human: SnowWarHuman; x: number; y: number }>
        | Resolved<SnowWarEventType.HumanStartsToMakeASnowball, { human: SnowWarHuman }>
        | Resolved<SnowWarEventType.CreateSnowball, { human: SnowWarHuman; snowballId: number; x: number; y: number; trajectory: SnowWarTrajectory }>
        | Resolved<SnowWarEventType.MachineCreatesSnowball, { machine: SnowWarMachine }>
        | Resolved<SnowWarEventType.HumanGetsSnowballsFromMachine, { human: SnowWarHuman; source: ISnowWarSnowballSource; sourceId: number }>
        | Resolved<SnowWarEventType.RayGunBurst, { human: SnowWarHuman; rayGun: SnowWarRayGun; firstSnowballId: number }>;
