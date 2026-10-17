import { AlphaTolerance, IObjectVisualizationData, IRoomGeometry } from '@nitrodevco/nitro-api';

import { RoomObjectSpriteVisualization } from '../RoomObjectSpriteVisualization';
import { SnowWarGameAssets } from './SnowWarGameAssets';

const FRAME_DURATION_MS = SnowWarGameAssets.SPLASH_DURATION_MS / SnowWarGameAssets.SPLASH_FRAME_COUNT;

export class SnowSplashVisualization extends RoomObjectSpriteVisualization {
    private _startTime: number = NaN;
    private _frame: number = -1;
    private _geometryUpdateId: number = -1;

    public override initialize(_data: IObjectVisualizationData): boolean {
        this.createSprites(1);

        for (const sprite of this.sprites) sprite.alphaTolerance = AlphaTolerance.MATCH_NOTHING;

        return true;
    }

    public override update(geometry: IRoomGeometry, time: number, _update: boolean, _skipUpdate: boolean): void {
        if (!this.object || !geometry) return;

        if (isNaN(this._startTime)) this._startTime = time;

        const frame = Math.min(SnowWarGameAssets.SPLASH_FRAME_COUNT, Math.max(0, Math.trunc((time - this._startTime) / FRAME_DURATION_MS)));
        const finished = (frame === SnowWarGameAssets.SPLASH_FRAME_COUNT);

        if ((frame === this._frame) && (finished || (geometry.updateId === this._geometryUpdateId))) return;

        this._frame = frame;
        this._geometryUpdateId = geometry.updateId;

        const sprite = this.getSprite(0);

        if (!sprite) return;

        sprite.visible = !finished;

        if (sprite.visible) {
            sprite.texture = SnowWarGameAssets.getSplashFrame(geometry.scale, frame);
            sprite.offsetX = -Math.trunc(sprite.texture.width / 2);
            sprite.offsetY = -Math.trunc(sprite.texture.height / 2);
        }

        this.updateSpriteCounter++;
    }
}
