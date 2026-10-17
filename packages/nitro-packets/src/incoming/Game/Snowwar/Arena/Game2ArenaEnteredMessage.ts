import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarPlayerData, SnowWarPlayerDataParser } from '../Data/SnowWarPlayerData';

export type Game2ArenaEnteredMessageType = {
    player: SnowWarPlayerData;
};

export class Game2ArenaEnteredMessage implements IIncomingPacket<Game2ArenaEnteredMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2ArenaEnteredMessageType {
        return { player: SnowWarPlayerDataParser(wrapper) };
    }
}
