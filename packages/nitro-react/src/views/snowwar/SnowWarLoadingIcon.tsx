import { snowWarAsset } from '#base/context/snowwar';
import { Box, ThemeImage } from '#base/theme';

const LOADING_FRAMES = 8;
const ICON_SIZE = 29;

export interface SnowWarLoadingIconProps {
    frame: number;
    width?: number;
    height?: number;
}

export const SnowWarLoadingIcon = ({ frame, width = 61, height = 62 }: SnowWarLoadingIconProps) => (
    <Box
        pointerTransparent
        layout={{ position: 'absolute', left: 0, top: 0, width, height, justifyContent: 'center', alignItems: 'center' }}
    >
        <ThemeImage
            src={snowWarAsset(`load_${(Math.abs(Math.trunc(frame)) % LOADING_FRAMES) + 1}`)}
            layout={{ width: ICON_SIZE, height: ICON_SIZE }}
        />
    </Box>
);
