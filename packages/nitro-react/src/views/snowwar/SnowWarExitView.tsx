import { useState } from 'react';

import { snowWarExit } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { snowWarAsset, snowWarTemplate } from '#base/context/snowwar';
import { Box, TemplateWindow, useTemplateFrame } from '#base/theme';

const EXIT_TEMPLATE = snowWarTemplate('snowwar_exit');
const CONFIRMATION_TEMPLATE = snowWarTemplate('snowwar_exit_confirmation');

export interface SnowWarExitViewProps {
    left: number;
    top: number;
}

export const SnowWarExitView = ({ left, top }: SnowWarExitViewProps) => {
    const [ confirming, setConfirming ] = useState(false);
    const [ pressed, setPressed ] = useState(false);
    const { send } = useWebSocketContext();
    const frame = useTemplateFrame({ id: 'snowwar_exit_confirmation', centered: true, rememberPosition: false, resizeDirection: 'none', onClose: () => setConfirming(false) });

    return (
        <>
            <Box layout={{ position: 'absolute', left, top }}>
                <TemplateWindow
                    id={EXIT_TEMPLATE}
                    bindings={{
                        exitButton: {
                            onPointerDown: () => setPressed(true),
                            onPointerUp: () => setPressed(false),
                            onPointerOut: () => setPressed(false),
                            onPointerTap: () => setConfirming(true),
                        },
                        backgroundImage: { asset: snowWarAsset(pressed ? 'ui_exit_down' : 'ui_exit_up') },
                    }}
                />
            </Box>
            {confirming && (
                <TemplateWindow
                    id={CONFIRMATION_TEMPLATE}
                    frame={frame}
                    bindings={{
                        no: { onPointerTap: () => setConfirming(false) },
                        yes: {
                            onPointerTap: () => {
                                setConfirming(false);
                                snowWarExit(send);
                            },
                        },
                    }}
                />
            )}
        </>
    );
};
