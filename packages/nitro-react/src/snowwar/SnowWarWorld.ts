import type { SnowWarGameObjectData, SnowWarLevelData } from '@nitrodevco/nitro-packets';

import { SnowWarChecksumBuilder } from './SnowWarChecksum';
import { SnowWarConstants, SnowWarObjectType } from './SnowWarConstants';
import type { SnowWarGameObject } from './SnowWarGameObject';
import { SnowWarGrid } from './SnowWarGrid';
import type { SnowWarHappening } from './SnowWarHappening';
import { SnowWarHuman } from './SnowWarHuman';
import { SnowWarMachine } from './SnowWarMachine';
import { SnowWarPile } from './SnowWarPile';
import { SnowWarRayGun } from './SnowWarRayGun';
import { SnowWarSnowball } from './SnowWarSnowball';
import { SnowWarTree } from './SnowWarTree';

const rayGunsOf = (level: SnowWarLevelData, grid: SnowWarGrid): SnowWarRayGun[] => level.fuseObjects
    .filter(fuse => (fuse.name === SnowWarConstants.RAY_GUN_FURNI) && grid.get(fuse.x, fuse.y))
    .map(fuse => SnowWarRayGun.tryCreate(fuse))
    .filter(gun => gun !== null);

const objectFromData = (data: SnowWarGameObjectData, grid: SnowWarGrid): SnowWarGameObject => {
    const type: SnowWarObjectType = data.type;

    switch (type) {
        case SnowWarObjectType.Snowball:
            return SnowWarSnowball.fromData(data);
        case SnowWarObjectType.Tree:
            return SnowWarTree.fromData(data, grid);
        case SnowWarObjectType.Pile:
            return SnowWarPile.fromData(data, grid);
        case SnowWarObjectType.Machine:
            return SnowWarMachine.fromData(data, grid);
        case SnowWarObjectType.Human:
            return SnowWarHuman.fromData(data, grid);
        default:
            throw new Error(`SnowWar object ${data.id} has unknown type ${data.type}`);
    }
};

export class SnowWarWorld {
    public readonly happenings: SnowWarHappening[] = [];
    private objects: SnowWarGameObject[] = [];
    private readonly objectsById = new Map<number, SnowWarGameObject>();

    private constructor(
        public readonly grid: SnowWarGrid,
        private readonly rayGuns: readonly SnowWarRayGun[],
    ) {}

    public static fromData(level: SnowWarLevelData, objects: readonly SnowWarGameObjectData[]): SnowWarWorld {
        const grid = SnowWarGrid.fromLevel(level);
        const world = new SnowWarWorld(grid, rayGunsOf(level, grid));

        for (const data of objects) {
            if (world.contains(data.id)) throw new Error(`SnowWar object id ${data.id} appears twice`);

            world.add(objectFromData(data, grid));
        }

        for (const snowball of world.activeOfType(SnowWarSnowball)) {
            if (!world.findActiveHuman(snowball.throwerId)) snowball.forgetThrower();
        }

        return world;
    }

    public copy(): SnowWarWorld {
        const world = new SnowWarWorld(this.grid.copyGround(), this.rayGuns);

        for (const object of this.objects) {
            if (object.isActive) world.add(object.copyOn(world.grid));
        }

        this.grid.copyOccupantsTo(world.grid, occupant => world.objectsById.get(occupant.id));

        return world;
    }

    public contains(id: number): boolean {
        return this.objectsById.has(id);
    }

    public findActive(id: number): SnowWarGameObject | null {
        const found = this.objectsById.get(id);

        return found?.isActive ? found : null;
    }

    public findActiveHuman(id: number): SnowWarHuman | null {
        const found = this.findActive(id);

        return (found instanceof SnowWarHuman) ? found : null;
    }

    public findRayGun(fuseId: number): SnowWarRayGun | null {
        return this.rayGuns.find(gun => gun.fuseId === fuseId) ?? null;
    }

    public activeOfType<T extends SnowWarGameObject>(kind: abstract new (...args: never[]) => T): T[] {
        return this.objects.filter((object): object is T => object.isActive && (object instanceof kind));
    }

    public add(object: SnowWarGameObject): void {
        this.objects.push(object);
        this.objectsById.set(object.id, object);
    }

    public happen(happening: SnowWarHappening): void {
        this.happenings.push(happening);
    }

    public forgetThrower(humanId: number): void {
        for (const snowball of this.activeOfType(SnowWarSnowball)) {
            if (snowball.throwerId === humanId) snowball.forgetThrower();
        }
    }

    public updateObjects(): void {
        for (let i = 0; i < this.objects.length; i++) {
            const object = this.objects[i];

            if (object.isActive) object.update(this);
        }
    }

    public removeInactive(): void {
        for (const object of this.objects) {
            if (!object.isActive) this.objectsById.delete(object.id);
        }

        this.objects = this.objects.filter(object => object.isActive);
    }

    public snapshot(): SnowWarGameObjectData[] {
        return this.objects.filter(object => object.isActive).map(object => object.toData());
    }

    public computeChecksum(turn: number): number {
        const active = this.objects.filter(object => object.isActive);
        const checksum = new SnowWarChecksumBuilder();

        checksum.add(turn);
        checksum.add(active.length);

        for (const object of active) {
            checksum.add(object.type);
            checksum.add(object.id);

            for (const variable of object.variables()) checksum.add(variable);
        }

        return checksum.finish();
    }
}
