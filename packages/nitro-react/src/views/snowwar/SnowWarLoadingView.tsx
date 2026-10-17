import { snowWarExit } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { SNOWWAR_LIBRARY, snowWarArenaNameKey, useSnowWarStore } from '#base/context/snowwar';
import { useTranslation } from '#base/context/system';
import { useOwnUserId } from '#base/context/user';
import { useTemplateLibrary } from '#base/theme';

import { snowWarWaitingBindings } from './snowWarBoardBindings';
import { SnowWarScreen } from './SnowWarScreen';
import { snowWarFrameAt, useSnowWarClock } from './useSnowWarClock';

const LOADING_FRAME_MS = 100;
const LOADING_FRAMES = 8;
const ALL_READY = 100;

export const SnowWarLoadingView = () => {
    const lobby = useSnowWarStore(x => x.lobby);
    const loading = useSnowWarStore(x => x.loading);
    const ownUserId = useOwnUserId();
    const templates = useTemplateLibrary(SNOWWAR_LIBRARY);
    const now = useSnowWarClock(LOADING_FRAME_MS);
    const { send } = useWebSocketContext();
    const t = useTranslation();

    if (!lobby) return null;

    const allReady = loading.percentage >= ALL_READY;

    return (
        <SnowWarScreen bindings={snowWarWaitingBindings({
            templates,
            players: lobby.players,
            ownUserId,
            readyUserIds: loading.readyUserIds,
            loadingFrame: snowWarFrameAt(now, LOADING_FRAME_MS, LOADING_FRAMES),
            fieldType: lobby.fieldType,
            arenaName: t(snowWarArenaNameKey(lobby.fieldType), lobby.levelName),
            loadingText: t(allReady ? 'snowwar.loading_arena' : 'snowwar.waiting_players'),
            scoreLabel: t('snowwar.stats.total_score'),
            title: undefined,
            onLeave: () => snowWarExit(send),
        })}
        />
    );
};
