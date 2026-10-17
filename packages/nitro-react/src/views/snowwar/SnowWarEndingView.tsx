import type { SnowWarTeamPlayerData, SnowWarTeamScoreData } from '@nitrodevco/nitro-packets';
import { useState } from 'react';

import { askForAFriend, canBeAskedForAFriend, snowWarExit, snowWarLeaveLobby, snowWarPlayAgain, snowWarQuickJoin } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { SNOWWAR_LIBRARY, SNOWWAR_RESULT_TIE, SNOWWAR_TEAM_BLUE, SNOWWAR_TEAM_RED, SNOWWAR_TIE_COLOR, snowWarArenaNameKey, snowWarAsset, snowWarSecondsUntil, snowWarTeamColor, useSnowWarStore } from '#base/context/snowwar';
import { useTranslation } from '#base/context/system';
import { useOwnUserId, useUserStore } from '#base/context/user';
import { TemplateBindings, TemplateItem, useTemplateLibrary } from '#base/theme';

import { SNOWWAR_RESULT_ROW_TEMPLATES, snowWarWaitingBindings } from './snowWarBoardBindings';
import { SnowWarPlayerHead } from './SnowWarPlayerHead';
import { SnowWarScreen } from './SnowWarScreen';
import { snowWarResultRow, snowWarTeamAssets } from './snowWarTeamRows';
import { snowWarFrameAt, useSnowWarClock } from './useSnowWarClock';

const TICK_MS = 100;
const LOADING_FRAMES = 8;
const MS_PER_SECOND = 1000;
const STAR_IMAGE_SIZE = 70;

interface Highlight {
    player: SnowWarTeamPlayerData;
    team: number;
}

const findPlayer = (teams: readonly SnowWarTeamScoreData[], userId: number): Highlight | undefined => {
    if (userId <= 0) return undefined;

    for (const team of teams) {
        const player = team.players.find(entry => entry.userId === userId);

        if (player) return { player, team: team.teamId };
    }

    return undefined;
};

const highlightBindings = (container: string, highlight: Highlight | undefined): TemplateBindings => ({
    [container]: { visible: !!highlight },
    ...(highlight
        ? {
                [`${container}/backgroundImage`]: { asset: snowWarTeamAssets(highlight.team).square },
                [`${container}/playerName`]: { caption: highlight.player.userName, color: snowWarTeamColor(highlight.team), setCaptionAfterBuild: true },
                [`${container}/playerImage`]: {
                    children: (
                        <SnowWarPlayerHead
                            figure={highlight.player.figure}
                            gender={highlight.player.gender}
                            width={STAR_IMAGE_SIZE}
                            height={STAR_IMAGE_SIZE}
                        />
                    ),
                },
            }
        : {}),
});

export const SnowWarEndingView = () => {
    const results = useSnowWarStore(x => x.results);
    const lobby = useSnowWarStore(x => x.lobby);
    const counter = useSnowWarStore(x => x.counter);
    const rematchUserIds = useSnowWarStore(x => x.rematchUserIds);
    const rematchRequested = useSnowWarStore(x => x.rematchRequested);
    const afterSki = useSnowWarStore(x => x.afterSki);
    const awaitingRematch = useSnowWarStore(x => x.awaitingRematch);
    const ownUserId = useOwnUserId();
    const userState = useUserStore(x => x);
    const templates = useTemplateLibrary(SNOWWAR_LIBRARY);
    const now = useSnowWarClock(TICK_MS);
    const [ shownAt ] = useState(() => Date.now());
    const [ endedGameId ] = useState(() => lobby?.gameId);
    const [ newGameRequested, setNewGameRequested ] = useState(false);
    const { send } = useWebSocketContext();
    const t = useTranslation();

    if (!results) return null;

    const loadingFrame = snowWarFrameAt(now, TICK_MS, LOADING_FRAMES);
    const waiting = awaitingRematch || newGameRequested;

    const leave = () => {
        if (newGameRequested) {
            snowWarLeaveLobby(send);

            return;
        }

        snowWarExit(send);
    };

    if (waiting) {
        const nextLobby = (lobby && (lobby.gameId !== endedGameId)) ? lobby : undefined;
        const players = nextLobby?.players ?? (lobby?.players ?? []).filter(player => rematchUserIds.includes(player.userId));
        const title = counter
            ? t('snowwar.lobby_game_start_countdown', '', { seconds: String(snowWarSecondsUntil(counter.endsAt, now)) })
            : t('snowwar.waiting_players');
        const fieldType = nextLobby?.fieldType ?? lobby?.fieldType ?? 0;

        return (
            <SnowWarScreen bindings={snowWarWaitingBindings({
                templates,
                players,
                ownUserId,
                readyUserIds: undefined,
                loadingFrame,
                fieldType,
                arenaName: t(snowWarArenaNameKey(fieldType), nextLobby?.levelName ?? lobby?.levelName ?? ''),
                loadingText: t('snowwar.waiting_players'),
                scoreLabel: t('snowwar.stats.total_score'),
                title,
                onLeave: leave,
            })}
            />
        );
    }

    const teamOf = (teamId: number) => results.teams.find(team => team.teamId === teamId);
    const rowsOf = (teamId: number): TemplateItem[] => {
        const template = templates?.[SNOWWAR_RESULT_ROW_TEMPLATES[teamId - 1]];

        if (!template) return [];

        return (teamOf(teamId)?.players ?? []).map(player => snowWarResultRow(template, teamId, player, {
            rematch: rematchUserIds.includes(player.userId),
            canAddFriend: (player.userId !== ownUserId) && canBeAskedForAFriend(player.userId, userState),
            onAddFriend: () => askForAFriend(send, player.userId, player.userName),
        }));
    };

    const tie = results.resultType === SNOWWAR_RESULT_TIE;
    const title = tie ? t('snowwar.result.tie') : t(`snowwar.team_${results.winnerId}_wins`);
    const titleColor = tie ? SNOWWAR_TIE_COLOR : snowWarTeamColor(results.winnerId);
    const blueScore = String(teamOf(SNOWWAR_TEAM_BLUE)?.score ?? 0);
    const redScore = String(teamOf(SNOWWAR_TEAM_RED)?.score ?? 0);
    const rematchSeconds = Math.max(0, results.timeToNextState - Math.floor((now - shownAt) / MS_PER_SECOND));
    const rematchCaption = rematchRequested
        ? t('snowwar.please_wait', '', { seconds: String(rematchSeconds) })
        : t('snowwar.rematch', '', { seconds: String(rematchSeconds) });

    const bindings: TemplateBindings = {
        headerContainer: { visible: true },
        endingInformation: { caption: title, color: titleColor },
        endingInformation_stroke: { caption: title },
        team1Score: { caption: blueScore, setCaptionAfterBuild: true },
        team1Score_stroke: { caption: blueScore, setCaptionAfterBuild: true },
        team2Score: { caption: redScore, setCaptionAfterBuild: true },
        team2Score_stroke: { caption: redScore, setCaptionAfterBuild: true },
        team1PlayersList: { items: rowsOf(SNOWWAR_TEAM_BLUE) },
        team2PlayersList: { items: rowsOf(SNOWWAR_TEAM_RED) },
        ...highlightBindings('mostKillsContainer', findPlayer(results.teams, results.playerWithMostKills)),
        ...highlightBindings('mostHitsContainer', findPlayer(results.teams, results.playerWithMostHits)),
        statusContainer: { visible: false },
        loadingContainer: { visible: false },
        buttonsContainer: { visible: true },
        button_rematch: {
            visible: !afterSki,
            caption: rematchCaption,
            disabled: rematchRequested || (rematchSeconds <= 0),
            onPointerTap: () => snowWarPlayAgain(send),
        },
        button_play_again: {
            visible: afterSki,
            disabled: newGameRequested,
            onPointerTap: () => {
                setNewGameRequested(true);
                snowWarQuickJoin(send);
            },
        },
        button_buy_games: { visible: false },
        leave_link_region: { onPointerTap: leave },
        mainLoadingIcon: { asset: snowWarAsset(`load_${loadingFrame + 1}`) },
    };

    return <SnowWarScreen bindings={bindings} />;
};
