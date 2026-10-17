import type { Game2EnterArenaMessageType, SnowWarGameLobbyData } from '@nitrodevco/nitro-packets';
import { Game2AccountGameStatusMessage, Game2ArenaEnteredMessage, Game2EnterArenaFailedMessage, Game2EnterArenaMessage, Game2FriendsLeaderboardMessage, Game2FullGameStatusMessage, Game2GameCancelledMessage, Game2GameChatFromPlayerMessage, Game2GameCreatedMessage, Game2GameDirectoryStatusMessage, Game2GameEndingMessage, Game2GameLongDataMessage, Game2GameNotFoundMessage, Game2GameRejoinMessage, Game2GameStartedMessage, Game2GameStatusMessage, Game2InArenaQueueMessage, Game2JoiningGameFailedMessage, Game2PlayerExitedGameArenaMessage, Game2PlayerRematchesMessage, Game2StageEndingMessage, Game2StageLoadMessage, Game2StageRunningMessage, Game2StageStartingMessage, Game2StageStillLoadingMessage, Game2StartCounterMessage, Game2StartingGameFailedMessage, Game2StopCounterMessage, Game2TotalGroupLeaderboardMessage, Game2TotalLeaderboardMessage, Game2UserBlockedMessage, Game2UserJoinedGameMessage, Game2UserLeftGameMessage, Game2WeeklyFriendsLeaderboardMessage, Game2WeeklyGroupLeaderboardMessage, Game2WeeklyLeaderboardMessage, QuitComposer } from '@nitrodevco/nitro-packets';

import { endSnowWarMatch, goToRoom, showSnowWarArena, snowWarRequestAccountStatus, snowWarStageReady } from '#base/commands';
import { WebSocketConnection } from '#base/context/communication';
import { roomStore } from '#base/context/room';
import { SnowWarErrorView, SnowWarLobbyView, SnowWarPhase, snowWarStore } from '#base/context/snowwar';
import { systemStore } from '#base/context/system';
import { userStore } from '#base/context/user';
import { getSnowWarMatch, ISnowWarMatchObserver, setSnowWarMatch, SNOWWAR_ARENA_ROOM_ID, SnowWarMatch } from '#base/snowwar';

import { on, subscribeAll } from '../packetSubscriptions';

const REMEMBERED_ROOM = 0;
const MS_PER_SECOND = 1000;

const lobbyViewOf = (lobby: SnowWarGameLobbyData): SnowWarLobbyView => ({
    gameId: lobby.gameId,
    levelName: lobby.levelName,
    fieldType: lobby.fieldType,
    maximumPlayers: lobby.maximumPlayers,
    owningPlayerName: lobby.owningPlayerName,
    players: lobby.players,
});

const storeObserver: ISnowWarMatchObserver = {
    frameChanged: ({ hud, secondsLeft }) => {
        snowWarStore.getState().setHud(hud);
        snowWarStore.getState().setSecondsLeft(secondsLeft);
    },
    hoverChanged: humanId => snowWarStore.getState().setHoveredHumanId(humanId),
};

export const registerSnowWarHandlers = ({ subscribe, send }: WebSocketConnection) => {
    const game = () => snowWarStore.getState();

    const failWith = (error: SnowWarErrorView) => game().setError(error);

    const leaveCurrentRoom = () => {
        const roomId = roomStore.getState().room?.roomId;

        if ((roomId === undefined) || (roomId === SNOWWAR_ARENA_ROOM_ID)) return;

        game().setPreviousRoomId(roomId);
        send(new QuitComposer({}));
        systemStore.getState().endRoomSession();
    };

    const returnToRoom = (roomId: number) => {
        const target = (roomId === REMEMBERED_ROOM) ? game().previousRoomId : roomId;

        game().setPreviousRoomId(0);

        if (target > 0) goToRoom(send, target);
    };

    const showLobby = (lobby: SnowWarGameLobbyData) => {
        game().setLobby(lobbyViewOf(lobby));

        if (!game().results) game().setPhase(SnowWarPhase.Lobby);
    };

    const enterArena = (data: Game2EnterArenaMessageType) => {
        leaveCurrentRoom();
        game().setArenaPlayers(data.players);
        setSnowWarMatch(new SnowWarMatch(data.level, userStore.getState().userId, send, storeObserver));
    };

    const abandonGame = () => {
        endSnowWarMatch();
        game().resetGame();
    };

    return subscribeAll(subscribe, [
        on(Game2GameDirectoryStatusMessage, (data) => {
            game().setDirectory(data.status, data.gamesPlayed, data.freeGamesLeft);
            game().setBlockedUntil(Date.now() + (data.blockLength * MS_PER_SECOND));
        }),

        on(Game2AccountGameStatusMessage, data => game().setAccount(data.gamesPlayedTotal, data.freeGamesLeft)),

        on(Game2UserBlockedMessage, data => game().setBlockedUntil(Date.now() + (data.playerBlockLength * MS_PER_SECOND))),

        on(Game2GameCreatedMessage, data => showLobby(data.lobby)),

        on(Game2GameLongDataMessage, data => showLobby(data.lobby)),

        on(Game2UserJoinedGameMessage, data => game().updateLobby(lobby => ({ ...lobby, players: [ ...lobby.players.filter(player => player.userId !== data.player.userId), data.player ] }))),

        on(Game2UserLeftGameMessage, data => game().updateLobby(lobby => ({ ...lobby, players: lobby.players.filter(player => player.userId !== data.userId) }))),

        on(Game2StartCounterMessage, (data) => {
            game().setQueuePosition(undefined);
            game().setCounter({ seconds: data.countDownLength, endsAt: Date.now() + (data.countDownLength * MS_PER_SECOND) });
        }),

        on(Game2StopCounterMessage, () => game().setCounter(undefined)),

        on(Game2InArenaQueueMessage, (data) => {
            game().setCounter(undefined);
            game().setQueuePosition(data.position);
        }),

        on(Game2JoiningGameFailedMessage, data => failWith({ kind: 'joining', reason: data.reason })),

        on(Game2StartingGameFailedMessage, (data) => {
            abandonGame();
            failWith({ kind: 'starting', reason: data.reason });
        }),

        on(Game2EnterArenaFailedMessage, (data) => {
            abandonGame();
            returnToRoom(REMEMBERED_ROOM);
            failWith({ kind: 'enterArena', reason: data.reason });
        }),

        on(Game2GameNotFoundMessage, () => failWith({ kind: 'notFound', reason: 0 })),

        on(Game2GameCancelledMessage, () => {
            abandonGame();
            returnToRoom(REMEMBERED_ROOM);
        }),

        on(Game2GameStartedMessage, (data) => {
            endSnowWarMatch();
            game().beginGame(lobbyViewOf(data.lobby));
        }),

        on(Game2EnterArenaMessage, data => enterArena(data)),

        on(Game2ArenaEnteredMessage, data => game().setArenaPlayers([ ...game().arenaPlayers.filter(player => player.referenceId !== data.player.referenceId), data.player ])),

        on(Game2StageLoadMessage, () => {
            const match = getSnowWarMatch();

            if (!match) return;

            match.buildArena();
            snowWarStageReady(send);
        }),

        on(Game2StageStillLoadingMessage, data => game().setLoading({ percentage: data.percentage, readyUserIds: data.finishedUserIds })),

        on(Game2StageStartingMessage, (data) => {
            const match = getSnowWarMatch();

            if (!match) return;

            match.buildArena();
            match.startStage(data);

            if (match.room) showSnowWarArena(match.room);

            game().setCountdownSeconds(data.countDown);
            game().setPhase(SnowWarPhase.Starting);
        }),

        on(Game2StageRunningMessage, (data) => {
            game().setDurationSeconds(data.timeToStageEnd);

            if (data.timeToStageEnd <= 0) {
                getSnowWarMatch()?.stop();
                game().setPhase(SnowWarPhase.Ending);

                return;
            }

            getSnowWarMatch()?.run(data.timeToStageEnd);
            game().setPhase(SnowWarPhase.Running);
        }),

        on(Game2GameStatusMessage, data => getSnowWarMatch()?.applyStatus(data)),

        on(Game2FullGameStatusMessage, data => getSnowWarMatch()?.applyFullStatus(data)),

        on(Game2StageEndingMessage, () => {
            getSnowWarMatch()?.stop();
            game().setPhase(SnowWarPhase.Ending);
            snowWarRequestAccountStatus(send);
        }),

        on(Game2GameEndingMessage, (data) => {
            getSnowWarMatch()?.stop();
            game().setResults(data);
            game().setPhase(SnowWarPhase.Ending);
        }),

        on(Game2PlayerRematchesMessage, data => game().addRematchUserId(data.userId)),

        on(Game2PlayerExitedGameArenaMessage, data => getSnowWarMatch()?.removeHuman(data.playerGameObjectId)),

        on(Game2GameChatFromPlayerMessage, (data) => {
            const player = game().arenaPlayers.find(entry => entry.referenceId === data.userId);
            const lobbyPlayer = game().lobby?.players.find(entry => entry.userId === data.userId);

            game().addChatLine({
                userId: data.userId,
                name: player?.userName ?? lobbyPlayer?.name ?? '',
                figure: player?.figure ?? lobbyPlayer?.figure ?? '',
                team: player?.teamId ?? lobbyPlayer?.teamId ?? 0,
                message: data.message,
            });
        }),

        on(Game2GameRejoinMessage, (data) => {
            endSnowWarMatch();

            if (game().results) {
                game().setAfterSki(!game().rematchRequested);
                game().setAwaitingRematch(game().rematchRequested);
            }

            returnToRoom(data.roomId);
        }),

        on(Game2TotalLeaderboardMessage, data => game().setLeaderboard('total', data)),

        on(Game2FriendsLeaderboardMessage, data => game().setLeaderboard('friends', data)),

        on(Game2WeeklyLeaderboardMessage, data => game().setLeaderboard('weekly', data)),

        on(Game2WeeklyFriendsLeaderboardMessage, data => game().setLeaderboard('weeklyFriends', data)),

        on(Game2TotalGroupLeaderboardMessage, data => game().setLeaderboard('totalGroup', data)),

        on(Game2WeeklyGroupLeaderboardMessage, data => game().setLeaderboard('weeklyGroup', data)),
    ]);
};
