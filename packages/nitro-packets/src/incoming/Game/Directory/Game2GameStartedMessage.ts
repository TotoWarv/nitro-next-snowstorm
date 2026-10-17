import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarGameLobbyData, SnowWarGameLobbyDataParser } from '../Snowwar/Data/SnowWarGameLobbyData';

export type Game2GameStartedMessageType = {
    lobby: SnowWarGameLobbyData;
};

export class Game2GameStartedMessage implements IIncomingPacket<Game2GameStartedMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2GameStartedMessageType {
        return { lobby: SnowWarGameLobbyDataParser(wrapper) };
    }
}
