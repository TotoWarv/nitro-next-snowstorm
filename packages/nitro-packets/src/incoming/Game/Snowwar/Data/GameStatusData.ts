import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarList, SnowWarListLimits } from './SnowWarBoundedList';
import { SnowWarGameEventData, SnowWarGameEventDataParser } from './SnowWarGameEventData';

export interface GameStatusData {
    turn: number;
    checksum: number;
    events: SnowWarGameEventData[][];
}

export const GameStatusDataParser = (wrapper: IMessageDataWrapper): GameStatusData => {
    const turn = wrapper.readInt();
    const checksum = wrapper.readInt();
    const events = readSnowWarList(wrapper, SnowWarListLimits.subturns, SnowWarGameEventDataParser);

    return { turn, checksum, events };
};
