import { snowWarLeaveLobby } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { SNOWWAR_LIBRARY, SNOWWAR_TEAM_RED, snowWarAsset, snowWarSecondsUntil, snowWarTemplate, useSnowWarStore } from '#base/context/snowwar';
import { useTranslation } from '#base/context/system';
import { TemplateBindings, TemplateItem, TemplateWindow, TemplateWindows, useTemplateLibrary } from '#base/theme';

import { SnowWarPlayerHead } from './SnowWarPlayerHead';
import { useSnowWarClock } from './useSnowWarClock';

const TEMPLATE = snowWarTemplate('games_main');
const PLAYER_TEMPLATE = snowWarTemplate('snowwar_lobby_player');
const PART = 'snowwar_lobby_cont';
const PLAYERS_PER_ROW = 5;
const PLAYER_WIDTH = 62;
const PLAYER_HEIGHT = 63;
const GRID_SPACING = 3;
const GRID_WIDTH = (PLAYERS_PER_ROW * PLAYER_WIDTH) + ((PLAYERS_PER_ROW - 1) * GRID_SPACING);
const GRID_Y = 178;
const GRID_HEIGHT = 130;
const WAIT_TEXT_WIDTH = 335;
const CANCEL_WIDTH = 63;
const COUNTER_TICK_MS = 250;

export interface SnowWarLobbyViewProps {
    width: number;
}

const centered = (width: number, inner: number) => Math.round((width - inner) / 2);

export const SnowWarLobbyView = ({ width }: SnowWarLobbyViewProps) => {
    const lobby = useSnowWarStore(x => x.lobby);
    const counter = useSnowWarStore(x => x.counter);
    const queuePosition = useSnowWarStore(x => x.queuePosition);
    const now = useSnowWarClock(COUNTER_TICK_MS, !!counter);
    const templates = useTemplateLibrary(SNOWWAR_LIBRARY);
    const t = useTranslation();
    const { send } = useWebSocketContext();
    const playerTemplate = templates?.[PLAYER_TEMPLATE];

    if (!lobby) return null;

    const statusText = counter
        ? t('snowwar.lobby_game_start_countdown', '', { seconds: String(snowWarSecondsUntil(counter.endsAt, now)) })
        : ((queuePosition !== undefined)
                ? t('snowwar.lobby_arena_queue_position', '', { position: String(queuePosition) })
                : t('snowwar.lobby_waiting_for_more_players'));

    const items: TemplateItem[] = playerTemplate
        ? lobby.players.map(player => ({
                key: String(player.userId),
                from: playerTemplate,
                bindings: {
                    region: { tooltip: player.name },
                    bg_image: { asset: snowWarAsset((player.teamId === SNOWWAR_TEAM_RED) ? 'red_square' : 'blue_square') },
                    image: {
                        children: (
                            <SnowWarPlayerHead
                                figure={player.figure}
                                gender={player.gender}
                                width={PLAYER_WIDTH}
                                height={PLAYER_HEIGHT}
                            />
                        ),
                    },
                },
            }))
        : [];

    const bindings: TemplateBindings = {
        '': { visible: true },
        wait_text: { caption: statusText, setCaptionAfterBuild: true },
        wait_text_stroke: { caption: statusText, setCaptionAfterBuild: true },
        players_grid: { items },
        cancel_link_region: { onPointerTap: () => snowWarLeaveLobby(send) },
    };

    const arrange = ({ find }: TemplateWindows) => {
        find('wait_text')?.setX(centered(width, WAIT_TEXT_WIDTH));
        find('wait_text_stroke')?.setX(centered(width, WAIT_TEXT_WIDTH));
        find('players_grid')?.setRectangle(centered(width, GRID_WIDTH), GRID_Y, GRID_WIDTH, GRID_HEIGHT);
        find('cancel_link_region')?.setX(centered(width, CANCEL_WIDTH));
    };

    return (
        <TemplateWindow
            id={TEMPLATE}
            part={PART}
            width={width}
            bindings={bindings}
            arrange={arrange}
        />
    );
};
