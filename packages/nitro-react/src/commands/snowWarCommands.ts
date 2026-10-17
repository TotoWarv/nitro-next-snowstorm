import { IRoom, NitroLogger } from '@nitrodevco/nitro-api';
import { Game2CheckGameDirectoryStatusComposer, Game2ExitGameComposer, Game2GameChatComposer, Game2GetAccountGameStatusComposer, Game2GetFriendsLeaderboardComposer, Game2GetTotalGroupLeaderboardComposer, Game2GetTotalLeaderboardComposer, Game2GetWeeklyFriendsLeaderboardComposer, Game2GetWeeklyGroupLeaderboardComposer, Game2GetWeeklyLeaderboardComposer, Game2LeaveGameComposer, Game2LoadStageReadyComposer, Game2PlayAgainComposer, Game2QuickJoinGameComposer } from '@nitrodevco/nitro-packets';

import { WebSocketConnection } from '#base/context/communication';
import { roomStore } from '#base/context/room';
import { SnowWarLeaderboardKind, SnowWarPhase, snowWarStore } from '#base/context/snowwar';
import { systemStore } from '#base/context/system';
import { getSnowWarMatch, setSnowWarMatch, SNOWWAR_ARENA_ROOM_ID, SnowWarTrajectory } from '#base/snowwar';

type Send = WebSocketConnection['send'];

export interface SnowWarLeaderboardRequest {
    startRank?: number;
    weekOffset?: number;
}

const SNOWWAR_GAME_TYPE = 0;
const STAGE_READY_PERCENTAGE = 100;
const CHAT_MAX_LENGTH = 100;
const AROUND_ME = -1;
const LEADERBOARD_DIRECTION = 0;
const LEADERBOARD_VIEW_SIZE = 8;
const LEADERBOARD_WINDOW_SIZE = 50;
const RETURN_ROOM_KEY = 'nitro.snowwar.return_room';
const CHAT_PHASES = [ SnowWarPhase.Loading, SnowWarPhase.Starting, SnowWarPhase.Running, SnowWarPhase.Ending ];

export const showSnowWarArena = (room: IRoom): void => {
    systemStore.getState().setLandingViewVisible(false);
    roomStore.getState().setRoom(room);
    roomStore.getState().setIsPlayingGame(true);
};

export const endSnowWarMatch = (): void => {
    const shown = roomStore.getState().room?.roomId === SNOWWAR_ARENA_ROOM_ID;

    if (shown) {
        roomStore.getState().setIsPlayingGame(false);
        roomStore.getState().setRoom(undefined);
        systemStore.getState().setLandingViewVisible(true);
    }

    setSnowWarMatch(undefined);
};

const closeSnowWarGame = (): void => {
    endSnowWarMatch();
    snowWarStore.getState().resetGame();
};

const rememberReturnRoom = (roomId: number): void => {
    try {
        globalThis.sessionStorage?.setItem(RETURN_ROOM_KEY, String(roomId));
    } catch (error) {
        NitroLogger.warn('SnowWar could not remember the room to go back to', error);
    }
};

export const takeSnowWarReturnRoom = (): number => {
    try {
        const storage = globalThis.sessionStorage;
        const roomId = Number(storage?.getItem(RETURN_ROOM_KEY) ?? 0);

        storage?.removeItem(RETURN_ROOM_KEY);

        return (Number.isInteger(roomId) && (roomId > 0)) ? roomId : 0;
    } catch (error) {
        NitroLogger.warn('SnowWar could not read the room to go back to', error);

        return 0;
    }
};

export const abandonSnowWarOnDisconnect = (): void => {
    const { phase, previousRoomId, setPreviousRoomId } = snowWarStore.getState();

    if ((phase === SnowWarPhase.Inactive) && !getSnowWarMatch()) return;

    if (previousRoomId > 0) rememberReturnRoom(previousRoomId);

    setPreviousRoomId(0);
    closeSnowWarGame();
};

export const snowWarCheckDirectory = (send: Send): void => send(new Game2CheckGameDirectoryStatusComposer({}));

export const snowWarRequestAccountStatus = (send: Send): void => send(new Game2GetAccountGameStatusComposer({ gameTypeId: SNOWWAR_GAME_TYPE }));

export const snowWarQuickJoin = (send: Send): void => {
    snowWarStore.getState().setError(undefined);
    send(new Game2QuickJoinGameComposer({}));
};

export const snowWarLeaveLobby = (send: Send): void => {
    send(new Game2LeaveGameComposer({}));
    closeSnowWarGame();
};

export const snowWarStageReady = (send: Send): void => send(new Game2LoadStageReadyComposer({ percentage: STAGE_READY_PERCENTAGE }));

export const snowWarMoveTo = (send: Send, tileX: number, tileY: number): boolean => getSnowWarMatch()?.moveTo(send, tileX, tileY) ?? false;

export const snowWarMakeSnowball = (send: Send): boolean => getSnowWarMatch()?.makeSnowball(send) ?? false;

export const snowWarThrowAtHuman = (send: Send, humanId: number, trajectory: SnowWarTrajectory = SnowWarTrajectory.Default): boolean => getSnowWarMatch()?.throwAtHuman(send, humanId, trajectory) ?? false;

export const snowWarThrowAtPosition = (send: Send, tileX: number, tileY: number, trajectory: SnowWarTrajectory = SnowWarTrajectory.Quick): boolean => getSnowWarMatch()?.throwAtPosition(send, tileX, tileY, trajectory) ?? false;

export const snowWarChat = (send: Send, text: string): boolean => {
    const message = text.trim().slice(0, CHAT_MAX_LENGTH);

    if (!message.length || !CHAT_PHASES.includes(snowWarStore.getState().phase)) return false;

    send(new Game2GameChatComposer({ message }));

    return true;
};

export const snowWarPlayAgain = (send: Send): void => {
    const { results, rematchRequested, setRematchRequested } = snowWarStore.getState();

    if (!results || rematchRequested) return;

    setRematchRequested(true);
    send(new Game2PlayAgainComposer({}));
};

export const snowWarExit = (send: Send): void => {
    const { phase, afterSki, awaitingRematch } = snowWarStore.getState();

    if (phase === SnowWarPhase.Inactive) return;

    if ((phase === SnowWarPhase.Lobby) || awaitingRematch) {
        snowWarLeaveLobby(send);

        return;
    }

    if (!afterSki) send(new Game2ExitGameComposer({ exitToRoomBeforeGame: true }));

    closeSnowWarGame();
};

export const snowWarRequestLeaderboard = (send: Send, kind: SnowWarLeaderboardKind, { startRank = AROUND_ME, weekOffset = 0 }: SnowWarLeaderboardRequest = {}): void => {
    const page = { gameTypeId: SNOWWAR_GAME_TYPE, startRank, direction: LEADERBOARD_DIRECTION, viewSize: LEADERBOARD_VIEW_SIZE, windowSize: LEADERBOARD_WINDOW_SIZE };
    const weeklyPage = { gameTypeId: SNOWWAR_GAME_TYPE, weekOffset, startRank, direction: LEADERBOARD_DIRECTION, viewSize: LEADERBOARD_VIEW_SIZE, windowSize: LEADERBOARD_WINDOW_SIZE };

    switch (kind) {
        case 'total':
            send(new Game2GetTotalLeaderboardComposer(page));
            return;
        case 'friends':
            send(new Game2GetFriendsLeaderboardComposer(page));
            return;
        case 'totalGroup':
            send(new Game2GetTotalGroupLeaderboardComposer(page));
            return;
        case 'weekly':
            send(new Game2GetWeeklyLeaderboardComposer(weeklyPage));
            return;
        case 'weeklyFriends':
            send(new Game2GetWeeklyFriendsLeaderboardComposer(weeklyPage));
            return;
        case 'weeklyGroup':
            send(new Game2GetWeeklyGroupLeaderboardComposer(weeklyPage));
            return;
    }
};
