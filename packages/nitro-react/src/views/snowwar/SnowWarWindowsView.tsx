import { useSnowWarStore } from '#base/context/snowwar';

import { SnowWarGamesMainView } from './SnowWarGamesMainView';
import { SnowWarLeaderboardView } from './SnowWarLeaderboardView';

export const SnowWarWindowsView = () => {
    const leaderboardOpen = useSnowWarStore(x => x.leaderboardOpen);

    return (
        <>
            <SnowWarGamesMainView />
            {leaderboardOpen && <SnowWarLeaderboardView />}
        </>
    );
};
