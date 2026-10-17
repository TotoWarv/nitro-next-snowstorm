import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarLeaderboardData, SnowWarLeaderboardDataParser } from './Data/SnowWarLeaderboardData';

export type Game2TotalGroupLeaderboardMessageType = SnowWarLeaderboardData & {
    favouriteGroupId: number;
};

export class Game2TotalGroupLeaderboardMessage implements IIncomingPacket<Game2TotalGroupLeaderboardMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2TotalGroupLeaderboardMessageType {
        const board = SnowWarLeaderboardDataParser(wrapper);
        const favouriteGroupId = wrapper.readInt();

        return { ...board, favouriteGroupId };
    }
}
