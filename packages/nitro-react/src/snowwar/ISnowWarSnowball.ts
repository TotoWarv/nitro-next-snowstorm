import type { SnowWarTrajectory } from './SnowWarConstants';

export interface ISnowWarSnowball {
    readonly id: number;
    readonly throwerId: number;
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly direction: number;
    readonly trajectory: SnowWarTrajectory;
    readonly life: number;
}
