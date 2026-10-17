import { useEffect, useState } from 'react';

export const useSnowWarClock = (intervalMs: number, active = true): number => {
    const [ now, setNow ] = useState(() => Date.now());

    useEffect(() => {
        if (!active) return;

        const timer = setInterval(() => setNow(Date.now()), intervalMs);

        return () => clearInterval(timer);
    }, [ intervalMs, active ]);

    return now;
};

export const snowWarFrameAt = (now: number, frameMs: number, frameCount: number): number => Math.floor(now / frameMs) % Math.max(1, frameCount);
