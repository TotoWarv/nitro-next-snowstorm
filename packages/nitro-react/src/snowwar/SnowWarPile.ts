import type { SnowWarGameObjectData } from '@nitrodevco/nitro-packets';

import { SnowWarConstants, SnowWarObjectType } from './SnowWarConstants';
import { decorTileOf } from './SnowWarDecorObject';
import { SnowWarGameObject } from './SnowWarGameObject';
import type { SnowWarGrid } from './SnowWarGrid';
import { isWithinDistance } from './SnowWarMath';
import type { SnowWarSnowball } from './SnowWarSnowball';
import type { ISnowWarSnowballSource } from './SnowWarSnowballSource';
import type { SnowWarTile } from './SnowWarTile';

const PILE_VARIABLE_COUNT = 5;

export class SnowWarPile extends SnowWarGameObject implements ISnowWarSnowballSource {
    public readonly type = SnowWarObjectType.Pile;

    constructor(
        id: number,
        public readonly tile: SnowWarTile,
        public readonly max: number,
        public remaining: number,
        public readonly fuseId: number,
    ) {
        super(id);
    }

    public static fromData(data: SnowWarGameObjectData, grid: SnowWarGrid): SnowWarPile {
        const v = data.variables;
        const pile = new SnowWarPile(data.id, decorTileOf(data, PILE_VARIABLE_COUNT, grid), v[2], v[3], v[4]);

        if (pile.remaining > 0) pile.tile.setOccupant(pile);

        return pile;
    }

    private get radius(): number {
        return SnowWarConstants.PILE_RADIUS_PER_SNOWBALL * this.remaining;
    }

    public variables(): number[] {
        return [ this.tile.centerX, this.tile.centerY, this.max, this.remaining, this.fuseId ];
    }

    public copyOn(grid: SnowWarGrid): SnowWarPile {
        return new SnowWarPile(this.id, grid.tileAt(this.tile.x, this.tile.y), this.max, this.remaining, this.fuseId);
    }

    public override stopsSnowball(snowball: SnowWarSnowball): boolean {
        return (this.remaining > 0)
            && (snowball.z < this.radius)
            && isWithinDistance(this.tile.centerX, this.tile.centerY, snowball.x, snowball.y, this.radius + SnowWarConstants.SNOWBALL_RADIUS);
    }

    public tryTakeSnowball(): boolean {
        if (this.remaining <= 0) return false;

        this.remaining--;

        if (this.remaining === 0) this.tile.clearOccupant(this);

        return true;
    }
}
