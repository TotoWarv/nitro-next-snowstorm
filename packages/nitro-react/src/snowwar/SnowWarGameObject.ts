import type { SnowWarGameObjectData } from '@nitrodevco/nitro-packets';

import type { SnowWarObjectType } from './SnowWarConstants';
import type { SnowWarGrid } from './SnowWarGrid';
import type { SnowWarSnowball } from './SnowWarSnowball';
import type { SnowWarWorld } from './SnowWarWorld';

export abstract class SnowWarGameObject {
    private active = true;

    public abstract readonly type: SnowWarObjectType;

    constructor(public readonly id: number) {}

    public get isActive(): boolean {
        return this.active;
    }

    public markRemoved(): void {
        this.active = false;
    }

    public get strings(): string[] {
        return [];
    }

    public toData(): SnowWarGameObjectData {
        return { type: this.type, id: this.id, variables: this.variables(), strings: this.strings };
    }

    public update(_world: SnowWarWorld): void {}

    public stopsSnowball(_snowball: SnowWarSnowball): boolean {
        return false;
    }

    public onSnowballImpact(_world: SnowWarWorld, _snowball: SnowWarSnowball): void {}

    public abstract variables(): number[];

    public abstract copyOn(grid: SnowWarGrid): SnowWarGameObject;
}
