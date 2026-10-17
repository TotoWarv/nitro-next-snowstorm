import type { SnowWarActivityState } from './SnowWarConstants';
import type { SnowWarHumanIdentity } from './SnowWarHumanIdentity';

export interface ISnowWarHuman extends SnowWarHumanIdentity {
    readonly id: number;
    readonly x: number;
    readonly y: number;
    readonly tileX: number;
    readonly tileY: number;
    readonly nextTileX: number;
    readonly nextTileY: number;
    readonly targetX: number;
    readonly targetY: number;
    readonly bodyDirection: number;
    readonly hp: number;
    readonly balls: number;
    readonly activityState: SnowWarActivityState;
    readonly activityTimer: number;
    readonly throwTimer: number;
    readonly score: number;
    readonly isWalking: boolean;
}
