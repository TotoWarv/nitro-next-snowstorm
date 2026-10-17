import type { SnowWarFuseObjectData, SnowWarLevelData } from '@nitrodevco/nitro-packets';

import type { SnowWarGameObject } from './SnowWarGameObject';
import { dir8OffsetX, dir8OffsetY, worldToTile } from './SnowWarMath';
import { SnowWarTile } from './SnowWarTile';

const MISSING_TILE = 'x';
const ROW_SEPARATOR = /\r\n|\r|\n/;

export const footprintWidth = (fuse: SnowWarFuseObjectData): number => ((fuse.direction === 2) || (fuse.direction === 6)) ? fuse.yDimension : fuse.xDimension;

export const footprintDepth = (fuse: SnowWarFuseObjectData): number => ((fuse.direction === 2) || (fuse.direction === 6)) ? fuse.xDimension : fuse.yDimension;

export class SnowWarGrid {
    private constructor(
        public readonly width: number,
        public readonly height: number,
        private readonly tiles: (SnowWarTile | null)[],
    ) {}

    public static fromLevel(level: SnowWarLevelData): SnowWarGrid {
        if ((level.width <= 0) || (level.height <= 0)) throw new Error(`SnowWar level size ${level.width}x${level.height} is invalid`);

        const rows = level.heightMap.split(ROW_SEPARATOR);
        const tiles: (SnowWarTile | null)[] = [];

        for (let y = 0; y < level.height; y++) {
            const row = rows[y] ?? '';

            for (let x = 0; x < level.width; x++) tiles.push((row[x] === MISSING_TILE) ? null : new SnowWarTile(x, y));
        }

        const grid = new SnowWarGrid(level.width, level.height, tiles);

        for (const fuse of level.fuseObjects) grid.registerFuseObject(fuse);

        return grid;
    }

    public get(x: number, y: number): SnowWarTile | null {
        if ((x < 0) || (y < 0) || (x >= this.width) || (y >= this.height)) return null;

        return this.tiles[(y * this.width) + x];
    }

    public tileAt(x: number, y: number): SnowWarTile {
        const tile = this.get(x, y);

        if (!tile) throw new Error(`SnowWar tile ${x},${y} does not exist`);

        return tile;
    }

    public atWorld(x: number, y: number): SnowWarTile | null {
        return this.get(worldToTile(x), worldToTile(y));
    }

    public neighbor(tile: SnowWarTile, direction: number): SnowWarTile | null {
        return this.get(tile.x + dir8OffsetX(direction), tile.y + dir8OffsetY(direction));
    }

    public copyGround(): SnowWarGrid {
        return new SnowWarGrid(this.width, this.height, this.tiles.map(tile => tile?.copyGround() ?? null));
    }

    public copyOccupantsTo(other: SnowWarGrid, counterpartOf: (occupant: SnowWarGameObject) => SnowWarGameObject | undefined): void {
        this.tiles.forEach((tile, index) => {
            const counterpart = tile?.occupant && counterpartOf(tile.occupant);

            if (counterpart) other.tiles[index]?.setOccupant(counterpart);
        });
    }

    private registerFuseObject(fuse: SnowWarFuseObjectData): void {
        const anchor = this.get(fuse.x, fuse.y);

        if (!anchor) return;

        anchor.registerAnchor(fuse.height, fuse.canStandOn);

        for (let k = 1; k < footprintWidth(fuse); k++) this.get(fuse.x + k, fuse.y)?.registerFootprint(fuse.height, fuse.canStandOn);

        for (let k = 1; k < footprintDepth(fuse); k++) this.get(fuse.x, fuse.y + k)?.registerFootprint(fuse.height, fuse.canStandOn);
    }
}
