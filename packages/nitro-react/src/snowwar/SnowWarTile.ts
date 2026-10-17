import type { SnowWarGameObject } from './SnowWarGameObject';
import { tileToWorld } from './SnowWarMath';

export class SnowWarTile {
    public height = 0;
    public fuseObjectCount = 0;
    public isBlocked = false;
    public occupant: SnowWarGameObject | null = null;
    private firstFuseObjectStandable = false;

    constructor(
        public readonly x: number,
        public readonly y: number,
    ) {}

    public get centerX(): number {
        return tileToWorld(this.x);
    }

    public get centerY(): number {
        return tileToWorld(this.y);
    }

    public get isWalkable(): boolean {
        return (this.occupant === null) && !this.isBlocked && !this.hasBlockingFuseObjects;
    }

    private get hasBlockingFuseObjects(): boolean {
        return (this.fuseObjectCount > 1) || ((this.fuseObjectCount === 1) && !this.firstFuseObjectStandable);
    }

    public registerAnchor(height: number, canStandOn: boolean): void {
        if (this.fuseObjectCount === 0) this.firstFuseObjectStandable = canStandOn;

        this.fuseObjectCount++;
        this.addHeight(height);
    }

    public registerFootprint(height: number, canStandOn: boolean): void {
        this.addHeight(height);

        if (!canStandOn) this.isBlocked = true;
    }

    public addHeight(height: number): void {
        this.height = Math.max(0, this.height + height);
    }

    public setOccupant(occupant: SnowWarGameObject): void {
        this.occupant ??= occupant;
    }

    public clearOccupant(occupant: SnowWarGameObject): void {
        if (this.occupant === occupant) this.occupant = null;
    }

    public copyGround(): SnowWarTile {
        const copy = new SnowWarTile(this.x, this.y);

        copy.height = this.height;
        copy.fuseObjectCount = this.fuseObjectCount;
        copy.isBlocked = this.isBlocked;
        copy.firstFuseObjectStandable = this.firstFuseObjectStandable;

        return copy;
    }
}
