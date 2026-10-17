import { WebSocketConnection } from '#base/context/communication';
import { snowWarErrorKey, SnowWarErrorView, SnowWarPhase, snowWarStore } from '#base/context/snowwar';
import { systemStore } from '#base/context/system';

import { snowWarCheckDirectory, snowWarExit, snowWarLeaveLobby, snowWarQuickJoin, snowWarRequestAccountStatus } from './snowWarCommands';

type Send = WebSocketConnection['send'];

export const openSnowWarGames = (send: Send): void => {
    snowWarStore.getState().setMainViewOpen(true);
    snowWarCheckDirectory(send);
    snowWarRequestAccountStatus(send);
};

export const closeSnowWarGames = (send: Send): void => {
    const { phase, setMainViewOpen } = snowWarStore.getState();

    if (phase === SnowWarPhase.Lobby) snowWarLeaveLobby(send);

    setMainViewOpen(false);
};

export const toggleSnowWarGames = (send: Send): void => {
    if (snowWarStore.getState().mainViewOpen) {
        closeSnowWarGames(send);

        return;
    }

    openSnowWarGames(send);
};

export const openSnowWarLeaderboard = (): void => snowWarStore.getState().setLeaderboardOpen(true);

export const closeSnowWarLeaderboard = (): void => snowWarStore.getState().setLeaderboardOpen(false);

export const showSnowWarError = (error: SnowWarErrorView): void => {
    const { showAlert, getLocalizationValue } = systemStore.getState();

    snowWarStore.getState().setError(undefined);
    showAlert(getLocalizationValue('generic.alert.title'), getLocalizationValue(snowWarErrorKey(error)));
};

export const snowWarNewGame = (send: Send): void => {
    const { results, newGameRequested, setNewGameRequested } = snowWarStore.getState();

    if (!results || newGameRequested) return;

    setNewGameRequested(true);
    snowWarQuickJoin(send);
};

export const leaveSnowWarResults = (send: Send): void => {
    if (snowWarStore.getState().newGameRequested) {
        snowWarLeaveLobby(send);

        return;
    }

    snowWarExit(send);
};
