import { useState } from 'react';

import { snowWarAsset, SnowWarPhase, snowWarTemplate, useSnowWarStore } from '#base/context/snowwar';
import { useViewportSize } from '#base/hooks';
import { Box, TemplateWindow, TemplateWindows } from '#base/theme';

import { useSnowWarClock } from './useSnowWarClock';

const TEMPLATE = snowWarTemplate('counter');
const COUNTER_SIZE = 164;
const DIGIT_FRAMES = 5;
const EXPLOSION_FIRST_FRAME = 6;
const EXPLOSION_FRAMES = 5;
const EXPLOSION_FRAME_MS = 100;
const SECOND_MS = 1000;
const TICK_MS = 50;

const frameAsset = (frame: number) => snowWarAsset(`explosion${String(frame).padStart(4, '0')}`);

const arrange = ({ find }: TemplateWindows) => find('counterBitmap')?.setRectangle(0, 0, COUNTER_SIZE, COUNTER_SIZE);

export const SnowWarCountdownView = () => {
    const phase = useSnowWarStore(x => x.phase);
    const countdownSeconds = useSnowWarStore(x => x.countdownSeconds);
    const now = useSnowWarClock(TICK_MS);
    const [ startedAt, setStartedAt ] = useState<number | undefined>(undefined);
    const { width, height } = useViewportSize();

    if ((phase === SnowWarPhase.Starting) && (startedAt === undefined)) setStartedAt(now);

    if (startedAt === undefined) return null;

    const countdownMs = countdownSeconds * SECOND_MS;
    const elapsed = now - startedAt;
    let frame: number | undefined;

    if (elapsed < countdownMs) {
        const remaining = Math.ceil((countdownMs - elapsed) / SECOND_MS);

        frame = (DIGIT_FRAMES + 1) - Math.min(DIGIT_FRAMES, Math.max(1, remaining));
    } else if (elapsed < countdownMs + (EXPLOSION_FRAMES * EXPLOSION_FRAME_MS)) {
        frame = EXPLOSION_FIRST_FRAME + Math.floor((elapsed - countdownMs) / EXPLOSION_FRAME_MS);
    }

    if (frame === undefined) return null;

    return (
        <Box
            pointerTransparent
            layout={{ position: 'absolute', left: Math.round((width - COUNTER_SIZE) / 2), top: Math.round((height - COUNTER_SIZE) / 2) }}
        >
            <TemplateWindow
                id={TEMPLATE}
                arrange={arrange}
                bindings={{ counterBitmap: { asset: frameAsset(frame), pivot: 'center' } }}
            />
        </Box>
    );
};
