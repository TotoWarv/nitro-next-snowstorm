import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarLeaderboardData, SnowWarLeaderboardDataParser } from './Data/SnowWarLeaderboardData';

export type Game2TotalLeaderboardMessageType = SnowWarLeaderboardData;

export class Game2TotalLeaderboardMessage implements IIncomingPacket<Game2TotalLeaderboardMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2TotalLeaderboardMessageType {
        return SnowWarLeaderboardDataParser(wrapper);
    }
}
