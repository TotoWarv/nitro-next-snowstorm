import { AvatarImage } from '#base/components';
import { snowWarGenderOf } from '#base/context/snowwar';
import { Box } from '#base/theme';

const HEAD_DIRECTION = 2;

export interface SnowWarPlayerHeadProps {
    figure: string;
    gender: string;
    width: number;
    height: number;
}

export const SnowWarPlayerHead = ({ figure, gender, width, height }: SnowWarPlayerHeadProps) => (
    <Box
        pointerTransparent
        layout={{ position: 'absolute', left: 0, top: 0, width, height, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}
    >
        {!!figure && (
            <AvatarImage
                figure={figure}
                gender={snowWarGenderOf(gender)}
                headOnly
                cropped
                direction={HEAD_DIRECTION}
            />
        )}
    </Box>
);
