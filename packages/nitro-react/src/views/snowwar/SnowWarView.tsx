import { useEffect } from 'react';

import { showSnowWarError } from '#base/commands';
import { isSnowWarScreenPhase, SnowWarPhase, snowWarStore, useSnowWarStore } from '#base/context/snowwar';

import { SnowWarEndingView } from './SnowWarEndingView';
import { SnowWarGamesMainView } from './SnowWarGamesMainView';
import { SnowWarHudView } from './SnowWarHudView';
import { SnowWarLeaderboardView } from './SnowWarLeaderboardView';
import { SnowWarLoadingView } from './SnowWarLoadingView';

const HUD_PHASES = [ SnowWarPhase.Starting, SnowWarPhase.Running, SnowWarPhase.Ending ];

export const SnowWarView = () => {
    const phase = useSnowWarStore(x => x.phase);
    const hasResults = useSnowWarStore(x => !!x.results);
    const leaderboardOpen = useSnowWarStore(x => x.leaderboardOpen);
    const error = useSnowWarStore(x => x.error);

    useEffect(() => {
        if (error) showSnowWarError(error);
    }, [ error ]);

    useEffect(() => {
        if (phase === SnowWarPhase.Loading) snowWarStore.getState().setMainViewOpen(false);
    }, [ phase ]);

    return (
        <>
            {!isSnowWarScreenPhase(phase) && <SnowWarGamesMainView />}
            {(phase === SnowWarPhase.Loading) && <SnowWarLoadingView />}
            {HUD_PHASES.includes(phase) && !hasResults && <SnowWarHudView />}
            {hasResults && <SnowWarEndingView />}
            {leaderboardOpen && <SnowWarLeaderboardView />}
        </>
    );
};
