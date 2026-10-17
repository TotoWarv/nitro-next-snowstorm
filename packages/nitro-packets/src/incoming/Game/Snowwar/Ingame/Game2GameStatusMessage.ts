import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { GameStatusDataParser } from '../Data/GameStatusData';
import { SnowWarGameEventData } from '../Data/SnowWarGameEventData';

export type Game2GameStatusMessageType = {
    turn: number;
    checksum: number;
    events: SnowWarGameEventData[][];
};

export class Game2GameStatusMessage implements IIncomingPacket<Game2GameStatusMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2GameStatusMessageType {
        const { turn, checksum, events } = GameStatusDataParser(wrapper);

        return { turn, checksum, events };
    }
}
