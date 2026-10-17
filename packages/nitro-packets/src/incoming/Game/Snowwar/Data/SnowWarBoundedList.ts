import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

export const SnowWarListLimits = {
    gameObjects: 1024,
    subturns: 16,
    eventsPerSubturn: 1024,
    fuseObjects: 1024,
    players: 64,
    teams: 16,
    leaderboardEntries: 256,
    tokenOffers: 64,
} as const;

export const readSnowWarCount = (wrapper: IMessageDataWrapper, limit: number): number => {
    const count = wrapper.readInt();

    if ((count < 0) || (count > limit)) return 0;

    return count;
};

export const readSnowWarList = <T>(wrapper: IMessageDataWrapper, limit: number, parser: (wrapper: IMessageDataWrapper) => T): T[] => {
    const count = readSnowWarCount(wrapper, limit);
    const results: T[] = [];

    while ((results.length < count) && wrapper.bytesAvailable) results.push(parser(wrapper));

    return results;
};
