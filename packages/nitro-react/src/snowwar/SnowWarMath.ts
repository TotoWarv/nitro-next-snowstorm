import { SnowWarConstants } from './SnowWarConstants';
import { SNOWWAR_ARC_TANGENT, SNOWWAR_BASE_VECTOR_X, SNOWWAR_BASE_VECTOR_Y, SNOWWAR_SQUARE_ROOT } from './SnowWarTables';

const DIR8_OFFSET_X = [ 0, 1, 1, 1, 0, -1, -1, -1 ];
const DIR8_OFFSET_Y = [ -1, -1, 0, 1, 1, 1, 0, -1 ];

export const divide = (dividend: number, divisor: number): number => (dividend / divisor) | 0;

export const normalizeDirection = (value: number): number => {
    if (value > 359) return value % 360;

    if (value < 0) return 360 + (value % 360);

    return value;
};

export const baseVectorX = (direction: number): number => SNOWWAR_BASE_VECTOR_X[normalizeDirection(direction) % 360];

export const baseVectorY = (direction: number): number => SNOWWAR_BASE_VECTOR_Y[normalizeDirection(direction) % 360];

export const dir360ToDir8 = (direction: number): number => (divide(normalizeDirection(direction - 22), 45) + 1) & 7;

export const rotateDir8 = (direction: number, steps: number): number => (direction + steps) & 7;

export const dir8OffsetX = (direction: number): number => DIR8_OFFSET_X[direction & 7];

export const dir8OffsetY = (direction: number): number => DIR8_OFFSET_Y[direction & 7];

const arcTangent = (numerator: number, denominator: number): number => SNOWWAR_ARC_TANGENT[Math.min(255, Math.abs(divide(256 * numerator, denominator)))];

export const angle = (x: number, y: number): number => {
    if (Math.abs(x) <= Math.abs(y)) {
        const divisor = (y === 0) ? 1 : y;
        const steep = arcTangent(x, divisor);

        if (divisor < 0) return (x > 0) ? steep : 360 - steep;

        return (x > 0) ? 180 - steep : 180 + steep;
    }

    const flat = arcTangent(y, x);

    if (y < 0) return (x > 0) ? 90 - flat : 270 + flat;

    return (x > 0) ? 90 + flat : 270 - flat;
};

export const fastSqrt = (value: number): number => {
    if (value < 0) return -1;

    let shift = 0;

    while ((value >> (2 * shift)) >= 256) shift++;

    const root = SNOWWAR_SQUARE_ROOT[value >> (2 * shift)];

    return (shift >= 4) ? root << (shift - 4) : root >> (4 - shift);
};

export const isWithinDistance = (ax: number, ay: number, bx: number, by: number, radius: number): boolean => {
    const dx = ax - bx;
    const dy = ay - by;

    if ((Math.abs(dx) > radius) || (Math.abs(dy) > radius)) return false;

    return ((dx * dx) + (dy * dy)) < (radius * radius);
};

export const worldToTile = (world: number): number => divide(world + SnowWarConstants.HALF_TILE, SnowWarConstants.TILE_SIZE);

export const tileToWorld = (tile: number): number => tile * SnowWarConstants.TILE_SIZE;

export const isInTile = (x: number, y: number, centerX: number, centerY: number): boolean => (Math.abs(x - centerX) < SnowWarConstants.HALF_TILE) && (Math.abs(y - centerY) < SnowWarConstants.HALF_TILE);
