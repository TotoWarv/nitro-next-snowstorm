import type { SnowWarFuseObjectData } from '@nitrodevco/nitro-packets';

import { SnowWarConstants } from './SnowWarConstants';

const SPREAD_X = [ 0, 0, 1, -1, -1, 1, 1 ];
const SPREAD_Y = [ 0, 1, 0, 1, -1, -1, 1 ];

const FORWARD_BY_DIRECTION: Record<number, readonly [number, number]> = {
    0: [ 0, -1 ],
    2: [ 1, 0 ],
    4: [ 0, 1 ],
    6: [ -1, 0 ],
};

export class SnowWarRayGun {
    private constructor(
        private readonly fuse: SnowWarFuseObjectData,
        private readonly forwardX: number,
        private readonly forwardY: number,
    ) {}

    public static tryCreate(fuse: SnowWarFuseObjectData): SnowWarRayGun | null {
        const forward = FORWARD_BY_DIRECTION[fuse.direction];

        return forward ? new SnowWarRayGun(fuse, forward[0], forward[1]) : null;
    }

    public get fuseId(): number {
        return this.fuse.id;
    }

    public get direction(): number {
        return this.fuse.direction;
    }

    public targetTileX(index: number): number {
        return this.fuse.x + (SnowWarConstants.RAY_GUN_RANGE * this.forwardX) + SPREAD_X[index];
    }

    public targetTileY(index: number): number {
        return this.fuse.y + (SnowWarConstants.RAY_GUN_RANGE * this.forwardY) + SPREAD_Y[index];
    }
}
