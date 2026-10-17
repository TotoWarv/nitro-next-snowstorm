import type { Game2GameEndingMessageType, IGameLobbyPlayerData, SnowWarLeaderboardData, SnowWarLeaderboardWeekData, SnowWarPlayerData } from '@nitrodevco/nitro-packets';

export interface SnowWarLobbyView {
    gameId: number;
    levelName: string;
    fieldType: number;
    maximumPlayers: number;
    owningPlayerName: string;
    players: IGameLobbyPlayerData[];
}

export interface SnowWarCounterView {
    seconds: number;
    endsAt: number;
}

export interface SnowWarLoadingView {
    percentage: number;
    readyUserIds: number[];
}

export interface SnowWarHumanView {
    id: number;
    userId: number;
    team: number;
    name: string;
    figure: string;
    hp: number;
    balls: number;
    score: number;
    activityState: number;
    isWalking: boolean;
}

export interface SnowWarHudView {
    ownHumanId: number;
    own: SnowWarHumanView | undefined;
    humans: SnowWarHumanView[];
    teamScores: number[];
    hitsGiven: number;
    hitsTaken: number;
}

export interface SnowWarChatLine {
    userId: number;
    name: string;
    figure: string;
    team: number;
    message: string;
}

export interface SnowWarErrorView {
    kind: 'joining' | 'starting' | 'enterArena' | 'notFound';
    reason: number;
}

export type SnowWarLeaderboardKind = 'total' | 'friends' | 'weekly' | 'weeklyFriends' | 'totalGroup' | 'weeklyGroup';

export type SnowWarLeaderboardView = SnowWarLeaderboardData & Partial<SnowWarLeaderboardWeekData> & { favouriteGroupId?: number };

export type SnowWarResultsView = Game2GameEndingMessageType;

export type SnowWarArenaPlayerView = SnowWarPlayerData;
