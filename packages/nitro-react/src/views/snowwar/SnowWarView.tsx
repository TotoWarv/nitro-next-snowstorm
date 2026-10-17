import { useEffect } from 'react';

import { showSnowWarError } from '#base/commands';
import { SnowWarPhase, snowWarStore, useSnowWarStore } from '#base/context/snowwar';

import { SnowWarEndingView } from './SnowWarEndingView';
import { SnowWarHudView } from './SnowWarHudView';
import { SnowWarLoadingView } from './SnowWarLoadingView';

const HUD_PHASES = [ SnowWarPhase.Starting, SnowWarPhase.Running, SnowWarPhase.Ending ];

export const SnowWarView = () => {
    const phase = useSnowWarStore(x => x.phase);
    const hasResults = useSnowWarStore(x => !!x.results);
    const error = useSnowWarStore(x => x.error);

    useEffect(() => {
        if (error) showSnowWarError(error);
    }, [ error ]);

    useEffect(() => {
        if (phase === SnowWarPhase.Loading) snowWarStore.getState().setMainViewOpen(false);
    }, [ phase ]);

    return (
        <>
            {(phase === SnowWarPhase.Loading) && !hasResults && <SnowWarLoadingView />}
            {HUD_PHASES.includes(phase) && !hasResults && <SnowWarHudView />}
            {hasResults && <SnowWarEndingView />}
        </>
    );
};
