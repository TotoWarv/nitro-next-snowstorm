import type { SnowWarGameObjectData } from '@nitrodevco/nitro-packets';

import type { SnowWarGrid } from './SnowWarGrid';
import type { SnowWarTile } from './SnowWarTile';

export const decorTileOf = (data: SnowWarGameObjectData, variableCount: number, grid: SnowWarGrid): SnowWarTile => {
    if (data.variables.length !== variableCount) throw new Error(`SnowWar object ${data.id} has a malformed state`);

    const tile = grid.atWorld(data.variables[0], data.variables[1]);

    if (!tile) throw new Error(`SnowWar object ${data.id} stands outside the arena`);

    return tile;
};

export const requireDir8 = (data: SnowWarGameObjectData, direction: number): number => {
    if ((direction < 0) || (direction > 7)) throw new Error(`SnowWar object ${data.id} faces invalid direction ${direction}`);

    return direction;
};
