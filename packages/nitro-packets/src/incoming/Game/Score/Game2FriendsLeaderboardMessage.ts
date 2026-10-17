import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarLeaderboardData, SnowWarLeaderboardDataParser } from './Data/SnowWarLeaderboardData';

export type Game2FriendsLeaderboardMessageType = SnowWarLeaderboardData;

export class Game2FriendsLeaderboardMessage implements IIncomingPacket<Game2FriendsLeaderboardMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2FriendsLeaderboardMessageType {
        return SnowWarLeaderboardDataParser(wrapper);
    }
}
