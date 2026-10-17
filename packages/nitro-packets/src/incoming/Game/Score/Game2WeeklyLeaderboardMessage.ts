import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarLeaderboardData, SnowWarLeaderboardDataParser, SnowWarLeaderboardWeekData, SnowWarLeaderboardWeekDataParser } from './Data/SnowWarLeaderboardData';

export type Game2WeeklyLeaderboardMessageType = SnowWarLeaderboardWeekData & SnowWarLeaderboardData;

export class Game2WeeklyLeaderboardMessage implements IIncomingPacket<Game2WeeklyLeaderboardMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2WeeklyLeaderboardMessageType {
        const week = SnowWarLeaderboardWeekDataParser(wrapper);
        const board = SnowWarLeaderboardDataParser(wrapper);

        return { ...week, ...board };
    }
}
