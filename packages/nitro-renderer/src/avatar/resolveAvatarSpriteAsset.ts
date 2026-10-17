import { AvatarScaleType, IGraphicAsset } from '@nitrodevco/nitro-api';

export interface AvatarSpriteAssetSource {
    scale: AvatarScaleType;
    largeScaledSmall: boolean;
    getAsset(name: string): IGraphicAsset | undefined;
    reduce(asset: IGraphicAsset): IGraphicAsset | undefined;
}

export const avatarSpriteAssetName = (scale: AvatarScaleType, member: string, direction: number, frame: number): string => `${scale}_${member}_${direction}_${frame}`;

export const resolveAvatarSpriteAsset = (source: AvatarSpriteAssetSource, member: string, direction: number, frame: number): IGraphicAsset | undefined => {
    const asset = source.getAsset(avatarSpriteAssetName(source.scale, member, direction, frame));

    if (asset || !source.largeScaledSmall) return asset;

    const large = source.getAsset(avatarSpriteAssetName(AvatarScaleType.Large, member, direction, frame));

    return large ? source.reduce(large) : undefined;
};
