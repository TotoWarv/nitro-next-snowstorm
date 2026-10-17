import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarLeaderboardData, SnowWarLeaderboardDataParser, SnowWarLeaderboardWeekData, SnowWarLeaderboardWeekDataParser } from './Data/SnowWarLeaderboardData';

export type Game2WeeklyFriendsLeaderboardMessageType = SnowWarLeaderboardWeekData & SnowWarLeaderboardData;

export class Game2WeeklyFriendsLeaderboardMessage implements IIncomingPacket<Game2WeeklyFriendsLeaderboardMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2WeeklyFriendsLeaderboardMessageType {
        const week = SnowWarLeaderboardWeekDataParser(wrapper);
        const board = SnowWarLeaderboardDataParser(wrapper);

        return { ...week, ...board };
    }
}
