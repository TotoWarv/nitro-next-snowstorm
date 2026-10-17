import { snowWarTemplate } from '#base/context/snowwar';
import { useViewportSize } from '#base/hooks';
import { Box, ColorLayer, FillLayout, TemplateBindings, TemplateWindow, TemplateWindows } from '#base/theme';

const BACKGROUND_TEMPLATE = snowWarTemplate('snowwar_loading_background_xml');
const BOARD_TEMPLATE = snowWarTemplate('snowwar_ending');
const BACKGROUND_COLOR = '#EEFAFC';
const BOARD_WIDTH = 882;
const BOARD_HEIGHT = 510;
const BOARD_X = -25;
const EDGE = 8;

export interface SnowWarScreenProps {
    bindings: TemplateBindings;
    arrange?: (windows: TemplateWindows) => void;
}

export const SnowWarScreen = ({ bindings, arrange }: SnowWarScreenProps) => {
    const { width, height } = useViewportSize();
    const scale = Math.min(1, (width - (2 * EDGE)) / BOARD_WIDTH, (height - (2 * EDGE)) / BOARD_HEIGHT);
    const left = Math.round(((width - (BOARD_WIDTH * scale)) / 2) - (BOARD_X * scale));
    const top = Math.round((height - (BOARD_HEIGHT * scale)) / 2);

    return (
        <Box
            eventMode="static"
            layout={{ position: 'absolute', left: 0, top: 0, width, height }}
        >
            <ColorLayer
                color={BACKGROUND_COLOR}
                layout={FillLayout}
            />
            <Box
                pointerTransparent
                layout={{ position: 'absolute', left: 0, top: 0 }}
            >
                <TemplateWindow
                    id={BACKGROUND_TEMPLATE}
                    width={width}
                    height={height}
                />
            </Box>
            <pixiContainer
                x={left}
                y={top}
                scale={scale}
            >
                <TemplateWindow
                    id={BOARD_TEMPLATE}
                    bindings={bindings}
                    arrange={arrange}
                />
            </pixiContainer>
        </Box>
    );
};
