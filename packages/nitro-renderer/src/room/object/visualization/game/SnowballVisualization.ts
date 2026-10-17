import { AlphaTolerance, IObjectVisualizationData, IRoomGeometry, Vector3d } from '@nitrodevco/nitro-api';

import { RoomObjectSpriteVisualization } from '../RoomObjectSpriteVisualization';
import { SnowWarGameAssets } from './SnowWarGameAssets';

const BALL_SPRITE = 0;
const SHADOW_SPRITE = 1;

export class SnowballVisualization extends RoomObjectSpriteVisualization {
    private _geometryUpdateId: number = -1;
    private _objectUpdateId: number = -1;

    public override initialize(_data: IObjectVisualizationData): boolean {
        this.createSprites(2);

        for (const sprite of this.sprites) sprite.alphaTolerance = AlphaTolerance.MATCH_NOTHING;

        return true;
    }

    public override update(geometry: IRoomGeometry, _time: number, _update: boolean, _skipUpdate: boolean): void {
        const object = this.object;

        if (!object || !geometry) return;

        if ((geometry.updateId === this._geometryUpdateId) && (object.updateCounter === this._objectUpdateId)) return;

        this._geometryUpdateId = geometry.updateId;
        this._objectUpdateId = object.updateCounter;

        const location = object.getLocation();
        const air = geometry.getScreenPosition(location);
        const ground = geometry.getScreenPosition(new Vector3d(location.x, location.y, 0));
        const ball = this.getSprite(BALL_SPRITE);
        const shadow = this.getSprite(SHADOW_SPRITE);

        if (ball) {
            ball.texture = SnowWarGameAssets.getBall(geometry.scale);
            ball.offsetX = -Math.trunc(ball.texture.width / 2);
            ball.offsetY = -Math.trunc(ball.texture.height / 2);
            ball.relativeDepth = 0;
        }

        if (shadow) {
            shadow.texture = SnowWarGameAssets.getShadow(geometry.scale);
            shadow.offsetX = -Math.trunc(shadow.texture.width / 2);
            shadow.offsetY = Math.round(ground.y - air.y) - Math.trunc(shadow.texture.height / 2);
            shadow.relativeDepth = ground.z - air.z + 0.01;
        }

        this.updateSpriteCounter++;
    }
}
