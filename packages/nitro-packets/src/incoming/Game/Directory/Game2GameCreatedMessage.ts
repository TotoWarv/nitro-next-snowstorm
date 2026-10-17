import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { SnowWarGameLobbyData, SnowWarGameLobbyDataParser } from '../Snowwar/Data/SnowWarGameLobbyData';

export type Game2GameCreatedMessageType = {
    lobby: SnowWarGameLobbyData;
};

export class Game2GameCreatedMessage implements IIncomingPacket<Game2GameCreatedMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2GameCreatedMessageType {
        return { lobby: SnowWarGameLobbyDataParser(wrapper) };
    }
}
