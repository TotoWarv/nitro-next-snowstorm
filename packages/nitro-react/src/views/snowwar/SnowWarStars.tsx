import { SNOWWAR_STAR_COUNT, snowWarAsset, snowWarStarsOf } from '#base/context/snowwar';
import { Box, ThemeImage } from '#base/theme';

const STAR_STEP = 15;
const STAR_WIDTH = 14;
const STAR_HEIGHT = 13;

export interface SnowWarStarsProps {
    level: number;
}

export const SnowWarStars = ({ level }: SnowWarStarsProps) => {
    const { tier, filled } = snowWarStarsOf(level);

    return (
        <Box
            pointerTransparent
            layout={{ position: 'absolute', left: 0, top: 0, width: STAR_STEP * SNOWWAR_STAR_COUNT, height: STAR_HEIGHT }}
        >
            {Array.from({ length: SNOWWAR_STAR_COUNT }, (_, index) => (
                <ThemeImage
                    key={index}
                    src={snowWarAsset((index < filled) ? `star_filled_${tier}` : 'star_empty')}
                    layout={{ position: 'absolute', left: index * STAR_STEP, top: 0, width: STAR_WIDTH, height: STAR_HEIGHT }}
                />
            ))}
        </Box>
    );
};
