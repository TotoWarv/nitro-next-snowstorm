import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { Game2GameResultParser } from '../../../Data/Game2GameResultParser';
import { Game2SnowWarGameStatsParser } from '../../../Data/Game2SnowWarGameStatsParser';
import { readSnowWarList, readSnowWarString, SnowWarListLimits } from '../Data/SnowWarBoundedList';

export interface SnowWarPlayerStatsData {
    score: number;
    kills: number;
    deaths: number;
    snowballHits: number;
    snowballHitsTaken: number;
    snowballsThrown: number;
    snowballsCreated: number;
    snowballsFromMachine: number;
    friendlyHits: number;
    friendlyKills: number;
}

export interface SnowWarTeamPlayerData {
    userName: string;
    userId: number;
    figure: string;
    gender: string;
    score: number;
    stats: SnowWarPlayerStatsData;
}

export interface SnowWarTeamScoreData {
    teamId: number;
    score: number;
    players: SnowWarTeamPlayerData[];
}

export type Game2GameEndingMessageType = {
    timeToNextState: number;
    isDeathMatch: boolean;
    resultType: number;
    winnerId: number;
    teams: SnowWarTeamScoreData[];
    playerWithMostKills: number;
    playerWithMostHits: number;
};

const SnowWarPlayerStatsDataParser = (wrapper: IMessageDataWrapper): SnowWarPlayerStatsData => {
    const score = wrapper.readInt();
    const kills = wrapper.readInt();
    const deaths = wrapper.readInt();
    const snowballHits = wrapper.readInt();
    const snowballHitsTaken = wrapper.readInt();
    const snowballsThrown = wrapper.readInt();
    const snowballsCreated = wrapper.readInt();
    const snowballsFromMachine = wrapper.readInt();
    const friendlyHits = wrapper.readInt();
    const friendlyKills = wrapper.readInt();

    return { score, kills, deaths, snowballHits, snowballHitsTaken, snowballsThrown, snowballsCreated, snowballsFromMachine, friendlyHits, friendlyKills };
};

const SnowWarTeamPlayerDataParser = (wrapper: IMessageDataWrapper): SnowWarTeamPlayerData => {
    const userName = readSnowWarString(wrapper);
    const userId = wrapper.readInt();
    const figure = readSnowWarString(wrapper);
    const gender = readSnowWarString(wrapper);
    const score = wrapper.readInt();
    const stats = SnowWarPlayerStatsDataParser(wrapper);

    return { userName, userId, figure, gender, score, stats };
};

const SnowWarTeamScoreDataParser = (wrapper: IMessageDataWrapper): SnowWarTeamScoreData => {
    const teamId = wrapper.readInt();
    const score = wrapper.readInt();
    const players = readSnowWarList(wrapper, SnowWarListLimits.players, SnowWarTeamPlayerDataParser);

    return { teamId, score, players };
};

export class Game2GameEndingMessage implements IIncomingPacket<Game2GameEndingMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2GameEndingMessageType {
        const timeToNextState = wrapper.readInt();
        const { isDeathMatch, resultType, winnerId } = Game2GameResultParser(wrapper);
        const teams = readSnowWarList(wrapper, SnowWarListLimits.teams, SnowWarTeamScoreDataParser);
        const { playerWithMostKills, playerWithMostHits } = Game2SnowWarGameStatsParser(wrapper);

        return { timeToNextState, isDeathMatch, resultType, winnerId, teams, playerWithMostKills, playerWithMostHits };
    }
}
