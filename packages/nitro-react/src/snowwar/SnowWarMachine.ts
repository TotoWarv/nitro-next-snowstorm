import type { SnowWarGameObjectData } from '@nitrodevco/nitro-packets';

import { SnowWarConstants, SnowWarObjectType } from './SnowWarConstants';
import { decorTileOf, requireDir8 } from './SnowWarDecorObject';
import { SnowWarGameObject } from './SnowWarGameObject';
import type { SnowWarGrid } from './SnowWarGrid';
import { isWithinDistance } from './SnowWarMath';
import type { SnowWarSnowball } from './SnowWarSnowball';
import type { ISnowWarSnowballSource } from './SnowWarSnowballSource';
import type { SnowWarTile } from './SnowWarTile';

const MACHINE_VARIABLE_COUNT = 6;

export class SnowWarMachine extends SnowWarGameObject implements ISnowWarSnowballSource {
    public readonly type = SnowWarObjectType.Machine;

    constructor(
        id: number,
        public readonly tile: SnowWarTile,
        public readonly direction: number,
        public readonly max: number,
        public stock: number,
        public readonly fuseId: number,
    ) {
        super(id);
    }

    public static fromData(data: SnowWarGameObjectData, grid: SnowWarGrid): SnowWarMachine {
        const v = data.variables;
        const machine = new SnowWarMachine(data.id, decorTileOf(data, MACHINE_VARIABLE_COUNT, grid), requireDir8(data, v[2]), v[3], v[4], v[5]);

        machine.tile.setOccupant(machine);

        return machine;
    }

    public variables(): number[] {
        return [ this.tile.centerX, this.tile.centerY, this.direction, this.max, this.stock, this.fuseId ];
    }

    public copyOn(grid: SnowWarGrid): SnowWarMachine {
        return new SnowWarMachine(this.id, grid.tileAt(this.tile.x, this.tile.y), this.direction, this.max, this.stock, this.fuseId);
    }

    public override stopsSnowball(snowball: SnowWarSnowball): boolean {
        return (snowball.z < SnowWarConstants.MACHINE_RADIUS)
            && isWithinDistance(this.tile.centerX, this.tile.centerY, snowball.x, snowball.y, SnowWarConstants.MACHINE_RADIUS + SnowWarConstants.SNOWBALL_RADIUS);
    }

    public addSnowball(): void {
        if (this.stock < this.max) this.stock++;
    }

    public tryTakeSnowball(): boolean {
        if (this.stock <= 0) return false;

        this.stock--;

        return true;
    }
}
