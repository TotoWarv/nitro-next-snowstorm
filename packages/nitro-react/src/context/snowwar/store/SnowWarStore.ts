import { createStore } from 'zustand';

import { SnowWarPhase } from './SnowWarPhase';
import type { SnowWarArenaPlayerView, SnowWarChatLine, SnowWarCounterView, SnowWarErrorView, SnowWarHudView, SnowWarLeaderboardKind, SnowWarLeaderboardView, SnowWarLoadingView, SnowWarLobbyView, SnowWarResultsView } from './SnowWarViews';

export const SNOWWAR_CHAT_HISTORY = 50;

const EMPTY_HUD: SnowWarHudView = { ownHumanId: -1, own: undefined, humans: [], teamScores: [ 0, 0 ], hitsGiven: 0, hitsTaken: 0 };
const EMPTY_LOADING: SnowWarLoadingView = { percentage: 0, readyUserIds: [] };

type GameState = {
    phase: SnowWarPhase;
    lobby: SnowWarLobbyView | undefined;
    counter: SnowWarCounterView | undefined;
    queuePosition: number | undefined;
    arenaPlayers: SnowWarArenaPlayerView[];
    loading: SnowWarLoadingView;
    countdownSeconds: number;
    durationSeconds: number;
    secondsLeft: number;
    hud: SnowWarHudView;
    hoveredHumanId: number | undefined;
    results: SnowWarResultsView | undefined;
    rematchUserIds: number[];
    rematchRequested: boolean;
    afterSki: boolean;
    awaitingRematch: boolean;
    chat: SnowWarChatLine[];
};

type AccountState = {
    blockedUntil: number;
    directoryStatus: number;
    gamesPlayed: number;
    freeGamesLeft: number;
    error: SnowWarErrorView | undefined;
    leaderboards: Partial<Record<SnowWarLeaderboardKind, SnowWarLeaderboardView>>;
    previousRoomId: number;
    mainViewOpen: boolean;
    leaderboardOpen: boolean;
};

type Actions = {
    resetGame: () => void;
    beginGame: (lobby: SnowWarLobbyView) => void;
    setPhase: (phase: SnowWarPhase) => void;
    setLobby: (lobby: SnowWarLobbyView | undefined) => void;
    updateLobby: (update: (lobby: SnowWarLobbyView) => SnowWarLobbyView) => void;
    setCounter: (counter: SnowWarCounterView | undefined) => void;
    setQueuePosition: (position: number | undefined) => void;
    setArenaPlayers: (players: SnowWarArenaPlayerView[]) => void;
    setLoading: (loading: SnowWarLoadingView) => void;
    setCountdownSeconds: (seconds: number) => void;
    setDurationSeconds: (seconds: number) => void;
    setSecondsLeft: (seconds: number) => void;
    setHud: (hud: SnowWarHudView) => void;
    setHoveredHumanId: (humanId: number | undefined) => void;
    setResults: (results: SnowWarResultsView | undefined) => void;
    addRematchUserId: (userId: number) => void;
    setRematchRequested: (flag: boolean) => void;
    setAfterSki: (flag: boolean) => void;
    setAwaitingRematch: (flag: boolean) => void;
    addChatLine: (line: SnowWarChatLine) => void;
    setBlockedUntil: (time: number) => void;
    setDirectory: (status: number, gamesPlayed: number, freeGamesLeft: number) => void;
    setAccount: (gamesPlayed: number, freeGamesLeft: number) => void;
    setError: (error: SnowWarErrorView | undefined) => void;
    setLeaderboard: (kind: SnowWarLeaderboardKind, view: SnowWarLeaderboardView) => void;
    setPreviousRoomId: (roomId: number) => void;
    setMainViewOpen: (open: boolean) => void;
    setLeaderboardOpen: (open: boolean) => void;
};

export type SnowWarStore = GameState & AccountState & Actions;

const freshGame = (): GameState => ({
    phase: SnowWarPhase.Inactive,
    lobby: undefined,
    counter: undefined,
    queuePosition: undefined,
    arenaPlayers: [],
    loading: EMPTY_LOADING,
    countdownSeconds: 0,
    durationSeconds: 0,
    secondsLeft: 0,
    hud: EMPTY_HUD,
    hoveredHumanId: undefined,
    results: undefined,
    rematchUserIds: [],
    rematchRequested: false,
    afterSki: false,
    awaitingRematch: false,
    chat: [],
});

export const createSnowWarStore = () => createStore<SnowWarStore>()(set => ({
    ...freshGame(),
    blockedUntil: 0,
    directoryStatus: 0,
    gamesPlayed: 0,
    freeGamesLeft: -1,
    error: undefined,
    leaderboards: {},
    previousRoomId: 0,
    mainViewOpen: false,
    leaderboardOpen: false,
    resetGame: () => set(freshGame()),
    beginGame: lobby => set({ ...freshGame(), phase: SnowWarPhase.Loading, lobby }),
    setPhase: phase => set({ phase }),
    setLobby: lobby => set({ lobby }),
    updateLobby: update => set(x => (x.lobby ? { lobby: update(x.lobby) } : {})),
    setCounter: counter => set({ counter }),
    setQueuePosition: queuePosition => set({ queuePosition }),
    setArenaPlayers: arenaPlayers => set({ arenaPlayers }),
    setLoading: loading => set({ loading }),
    setCountdownSeconds: countdownSeconds => set({ countdownSeconds }),
    setDurationSeconds: durationSeconds => set({ durationSeconds }),
    setSecondsLeft: secondsLeft => set({ secondsLeft }),
    setHud: hud => set({ hud }),
    setHoveredHumanId: hoveredHumanId => set({ hoveredHumanId }),
    setResults: results => set({ results }),
    addRematchUserId: userId => set(x => (x.rematchUserIds.includes(userId) ? {} : { rematchUserIds: [ ...x.rematchUserIds, userId ] })),
    setRematchRequested: rematchRequested => set({ rematchRequested }),
    setAfterSki: afterSki => set({ afterSki }),
    setAwaitingRematch: awaitingRematch => set({ awaitingRematch }),
    addChatLine: line => set(x => ({ chat: [ ...x.chat, line ].slice(-SNOWWAR_CHAT_HISTORY) })),
    setBlockedUntil: blockedUntil => set({ blockedUntil }),
    setDirectory: (directoryStatus, gamesPlayed, freeGamesLeft) => set({ directoryStatus, gamesPlayed, freeGamesLeft }),
    setAccount: (gamesPlayed, freeGamesLeft) => set({ gamesPlayed, freeGamesLeft }),
    setError: error => set({ error }),
    setLeaderboard: (kind, view) => set(x => ({ leaderboards: { ...x.leaderboards, [kind]: view } })),
    setPreviousRoomId: previousRoomId => set({ previousRoomId }),
    setMainViewOpen: mainViewOpen => set({ mainViewOpen }),
    setLeaderboardOpen: leaderboardOpen => set({ leaderboardOpen }),
}));

export const snowWarStore = createSnowWarStore();
