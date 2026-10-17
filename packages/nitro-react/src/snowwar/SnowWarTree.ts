import type { SnowWarGameObjectData } from '@nitrodevco/nitro-packets';

import { SnowWarConstants, SnowWarObjectType } from './SnowWarConstants';
import { decorTileOf, requireDir8 } from './SnowWarDecorObject';
import { SnowWarGameObject } from './SnowWarGameObject';
import type { SnowWarGrid } from './SnowWarGrid';
import { isWithinDistance } from './SnowWarMath';
import type { SnowWarSnowball } from './SnowWarSnowball';
import type { SnowWarTile } from './SnowWarTile';

const TREE_VARIABLE_COUNT = 7;

export class SnowWarTree extends SnowWarGameObject {
    public readonly type = SnowWarObjectType.Tree;

    constructor(
        id: number,
        public readonly tile: SnowWarTile,
        public readonly direction: number,
        public readonly height: number,
        public readonly fuseId: number,
        public readonly maxHits: number,
        public hits: number,
    ) {
        super(id);
    }

    public static fromData(data: SnowWarGameObjectData, grid: SnowWarGrid): SnowWarTree {
        const v = data.variables;
        const tile = decorTileOf(data, TREE_VARIABLE_COUNT, grid);
        const tree = new SnowWarTree(data.id, tile, requireDir8(data, v[2]), v[3], v[4], v[5], v[6]);

        tile.addHeight(-tree.height);

        if (tree.isStanding) tile.setOccupant(tree);

        return tree;
    }

    public get isStanding(): boolean {
        return this.hits < this.maxHits;
    }

    public variables(): number[] {
        return [ this.tile.centerX, this.tile.centerY, this.direction, this.height, this.fuseId, this.maxHits, this.hits ];
    }

    public copyOn(grid: SnowWarGrid): SnowWarTree {
        return new SnowWarTree(this.id, grid.tileAt(this.tile.x, this.tile.y), this.direction, this.height, this.fuseId, this.maxHits, this.hits);
    }

    public override stopsSnowball(snowball: SnowWarSnowball): boolean {
        return this.isStanding
            && (snowball.z < this.height)
            && isWithinDistance(this.tile.centerX, this.tile.centerY, snowball.x, snowball.y, SnowWarConstants.TREE_RADIUS + SnowWarConstants.SNOWBALL_RADIUS);
    }

    public override onSnowballImpact(): void {
        if (!this.isStanding) return;

        this.hits++;

        if (!this.isStanding) this.tile.clearOccupant(this);
    }
}
