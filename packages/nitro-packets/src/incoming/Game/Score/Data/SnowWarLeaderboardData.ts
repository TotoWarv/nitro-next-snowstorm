import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { ILeaderboardEntry, LeaderboardEntryParser } from '../../../Data/LeaderboardEntryParser';
import { readSnowWarList, SnowWarListLimits } from '../../Snowwar/Data/SnowWarBoundedList';

export interface SnowWarLeaderboardData {
    entries: ILeaderboardEntry[];
    totalListSize: number;
    gameTypeId: number;
}

export interface SnowWarLeaderboardWeekData {
    year: number;
    week: number;
    maxOffset: number;
    currentOffset: number;
    minutesUntilReset: number;
}

export const SnowWarLeaderboardDataParser = (wrapper: IMessageDataWrapper): SnowWarLeaderboardData => {
    const entries = readSnowWarList(wrapper, SnowWarListLimits.leaderboardEntries, LeaderboardEntryParser);
    const totalListSize = wrapper.readInt();
    const gameTypeId = wrapper.readInt();

    return { entries, totalListSize, gameTypeId };
};

export const SnowWarLeaderboardWeekDataParser = (wrapper: IMessageDataWrapper): SnowWarLeaderboardWeekData => {
    const year = wrapper.readInt();
    const week = wrapper.readInt();
    const maxOffset = wrapper.readInt();
    const currentOffset = wrapper.readInt();
    const minutesUntilReset = wrapper.readInt();

    return { year, week, maxOffset, currentOffset, minutesUntilReset };
};
