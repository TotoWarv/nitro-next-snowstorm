import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarList, SnowWarListLimits } from '../Data/SnowWarBoundedList';
import { SnowWarLevelData, SnowWarLevelDataParser } from '../Data/SnowWarLevelData';
import { SnowWarPlayerData, SnowWarPlayerDataParser } from '../Data/SnowWarPlayerData';

export type Game2EnterArenaMessageType = {
    gameType: number;
    fieldType: number;
    numberOfTeams: number;
    players: SnowWarPlayerData[];
    level: SnowWarLevelData;
};

export class Game2EnterArenaMessage implements IIncomingPacket<Game2EnterArenaMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2EnterArenaMessageType {
        const gameType = wrapper.readInt();
        const fieldType = wrapper.readInt();
        const numberOfTeams = wrapper.readInt();
        const players = readSnowWarList(wrapper, SnowWarListLimits.players, SnowWarPlayerDataParser);
        const level = SnowWarLevelDataParser(wrapper);

        return { gameType, fieldType, numberOfTeams, players, level };
    }
}
