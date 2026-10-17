import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarGameLobbyData, SnowWarGameLobbyDataParser } from '../Snowwar/Data/SnowWarGameLobbyData';

export type Game2GameLongDataMessageType = {
    lobby: SnowWarGameLobbyData;
};

export class Game2GameLongDataMessage implements IIncomingPacket<Game2GameLongDataMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2GameLongDataMessageType {
        return { lobby: SnowWarGameLobbyDataParser(wrapper) };
    }
}
