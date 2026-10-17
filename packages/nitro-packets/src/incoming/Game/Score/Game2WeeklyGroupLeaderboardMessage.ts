import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarLeaderboardData, SnowWarLeaderboardDataParser, SnowWarLeaderboardWeekData, SnowWarLeaderboardWeekDataParser } from './Data/SnowWarLeaderboardData';

export type Game2WeeklyGroupLeaderboardMessageType = SnowWarLeaderboardWeekData & SnowWarLeaderboardData & {
    favouriteGroupId: number;
};

export class Game2WeeklyGroupLeaderboardMessage implements IIncomingPacket<Game2WeeklyGroupLeaderboardMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2WeeklyGroupLeaderboardMessageType {
        const week = SnowWarLeaderboardWeekDataParser(wrapper);
        const board = SnowWarLeaderboardDataParser(wrapper);
        const favouriteGroupId = wrapper.readInt();

        return { ...week, ...board, favouriteGroupId };
    }
}
