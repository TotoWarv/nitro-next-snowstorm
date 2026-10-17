import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarCount, SnowWarListLimits } from './SnowWarBoundedList';
import { SnowWarGameEventData, SnowWarGameEventDataParser } from './SnowWarGameEventData';

export interface GameStatusData {
    turn: number;
    checksum: number;
    events: SnowWarGameEventData[][];
}

export const GameStatusDataParser = (wrapper: IMessageDataWrapper): GameStatusData => {
    const turn = wrapper.readInt();
    const checksum = wrapper.readInt();
    const subturnCount = readSnowWarCount(wrapper, SnowWarListLimits.subturns);
    const events: SnowWarGameEventData[][] = [];

    while ((events.length < subturnCount) && wrapper.bytesAvailable) {
        const subturn = SnowWarGameEventDataParser(wrapper);

        events.push(subturn.events);

        if (!subturn.complete) break;
    }

    return { turn, checksum, events };
};
