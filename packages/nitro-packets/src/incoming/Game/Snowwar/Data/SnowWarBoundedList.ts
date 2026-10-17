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

export class SnowWarMalformedPacketError extends Error {
    public constructor(reason: string) {
        super(`SnowWar packet rejected: ${reason}`);

        this.name = 'SnowWarMalformedPacketError';
    }
}

export const readSnowWarCount = (wrapper: IMessageDataWrapper, limit: number): number => {
    const count = wrapper.readInt();

    if ((count < 0) || (count > limit)) throw new SnowWarMalformedPacketError(`list length ${count} outside 0..${limit}`);

    return count;
};

export const requireSnowWarBytes = (wrapper: IMessageDataWrapper, read: number, count: number): void => {
    if (!wrapper.bytesAvailable) throw new SnowWarMalformedPacketError(`data ends after ${read} of ${count} list items`);
};

export const readSnowWarString = (wrapper: IMessageDataWrapper): string => {
    const length = wrapper.readShort();

    if (length < 0) throw new SnowWarMalformedPacketError(`string length ${length}`);

    const bytes = wrapper.readBytes(length);

    if ((bytes?.remaining() ?? 0) !== length) throw new SnowWarMalformedPacketError(`string cut before its ${length} bytes`);

    return bytes?.toString('utf8') ?? '';
};

export const readSnowWarList = <T>(wrapper: IMessageDataWrapper, limit: number, parser: (wrapper: IMessageDataWrapper) => T): T[] => {
    const count = readSnowWarCount(wrapper, limit);
    const results: T[] = [];

    while (results.length < count) {
        requireSnowWarBytes(wrapper, results.length, count);
        results.push(parser(wrapper));
    }

    return results;
};
