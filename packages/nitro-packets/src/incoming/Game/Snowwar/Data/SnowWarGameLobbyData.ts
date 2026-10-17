import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { GameLobbyPlayerDataParser, IGameLobbyPlayerData } from '../../../Data/GameLobbyPlayerDataParser';
import { readSnowWarList, readSnowWarString, SnowWarListLimits } from './SnowWarBoundedList';

export interface SnowWarGameLobbyData {
    gameId: number;
    levelName: string;
    gameType: number;
    fieldType: number;
    numberOfTeams: number;
    maximumPlayers: number;
    owningPlayerName: string;
    levelEntryId: number;
    players: IGameLobbyPlayerData[];
}

export const SnowWarGameLobbyDataParser = (wrapper: IMessageDataWrapper): SnowWarGameLobbyData => {
    const gameId = wrapper.readInt();
    const levelName = readSnowWarString(wrapper);
    const gameType = wrapper.readInt();
    const fieldType = wrapper.readInt();
    const numberOfTeams = wrapper.readInt();
    const maximumPlayers = wrapper.readInt();
    const owningPlayerName = readSnowWarString(wrapper);
    const levelEntryId = wrapper.readInt();
    const players = readSnowWarList(wrapper, SnowWarListLimits.players, GameLobbyPlayerDataParser);

    return { gameId, levelName, gameType, fieldType, numberOfTeams, maximumPlayers, owningPlayerName, levelEntryId, players };
};
