import { RoomGeometryScaleType } from '@nitrodevco/nitro-api';

const UNSCALED_IMAGE_MARKER = 'noscale';

export const backgroundImageOffset = (offset: number, imageUrl: string | undefined, scale: RoomGeometryScaleType): number => ((scale === RoomGeometryScaleType.ZoomedOut) && (imageUrl?.includes(UNSCALED_IMAGE_MARKER) ?? false)) ? offset / 2 : offset;
