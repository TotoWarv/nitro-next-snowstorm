import { Graphics, Texture } from 'pixi.js';

import { TextureUtils } from '../../../../utils';

const BALL_RADIUS_PER_SCALE = 5 / 64;
const MINIMUM_BALL_RADIUS = 2;
const SPLASH_PARTICLE_COUNT = 8;
const SPLASH_REACH = 3;

export class SnowWarGameAssets {
    public static readonly SPLASH_FRAME_COUNT = 3;
    public static readonly SPLASH_DURATION_MS = 50;

    private static _textures: Map<string, Texture> = new Map();

    public static getBall(scale: number): Texture {
        return SnowWarGameAssets.getTexture(`ball:${scale}`, () => {
            const radius = SnowWarGameAssets.ballRadius(scale);
            const size = (radius * 2) + 2;
            const center = size / 2;

            return SnowWarGameAssets.box(size, size)
                .circle(center, center, radius).fill(0xC8D4E2)
                .circle(center - (radius * 0.2), center - (radius * 0.2), radius * 0.78).fill(0xEEF3F9)
                .circle(center - (radius * 0.38), center - (radius * 0.4), radius * 0.32).fill(0xFFFFFF);
        });
    }

    public static getShadow(scale: number): Texture {
        return SnowWarGameAssets.getTexture(`shadow:${scale}`, () => {
            const radius = SnowWarGameAssets.ballRadius(scale);
            const width = (radius * 2) + 2;
            const height = radius + 2;

            return SnowWarGameAssets.box(width, height)
                .ellipse(width / 2, height / 2, radius, radius / 2).fill(0x000000);
        });
    }

    public static getSplashFrame(scale: number, frame: number): Texture {
        const clampedFrame = Math.max(0, Math.min(SnowWarGameAssets.SPLASH_FRAME_COUNT - 1, frame));

        return SnowWarGameAssets.getTexture(`splash:${scale}:${clampedFrame}`, () => {
            const radius = SnowWarGameAssets.ballRadius(scale);
            const reach = radius * (SPLASH_REACH + 1);
            const size = Math.ceil(reach * 2) + 2;
            const center = size / 2;
            const progress = (clampedFrame + 1) / SnowWarGameAssets.SPLASH_FRAME_COUNT;
            const graphics = SnowWarGameAssets.box(size, size);

            for (let index = 0; index < SPLASH_PARTICLE_COUNT; index++) {
                const angle = ((index * Math.PI * 2) / SPLASH_PARTICLE_COUNT) + ((index % 2) * 0.35);
                const distance = radius * (0.4 + (SPLASH_REACH * progress * (((index % 3) + 2) / 4)));
                const rise = radius * 2 * progress * (1 - progress);
                const x = center + (Math.cos(angle) * distance);
                const y = center + (Math.sin(angle) * distance * 0.5) - rise;
                const particleRadius = Math.max(0.75, radius * 0.55 * (1 - (progress * 0.7)));

                graphics.circle(x, y, particleRadius).fill({ color: 0xF4F8FC, alpha: 1 - (progress * 0.65) });
            }

            return graphics;
        });
    }

    private static ballRadius(scale: number): number {
        return Math.max(MINIMUM_BALL_RADIUS, Math.round(Math.abs(scale) * BALL_RADIUS_PER_SCALE));
    }

    private static box(width: number, height: number): Graphics {
        return new Graphics().rect(0, 0, width, height).fill({ color: 0x000000, alpha: 0 });
    }

    private static getTexture(key: string, draw: () => Graphics): Texture {
        const existing = SnowWarGameAssets._textures.get(key);

        if (existing) return existing;

        const graphics = draw();
        const texture = TextureUtils.generateTexture(graphics);

        graphics.destroy();

        SnowWarGameAssets._textures.set(key, texture);

        return texture;
    }
}
