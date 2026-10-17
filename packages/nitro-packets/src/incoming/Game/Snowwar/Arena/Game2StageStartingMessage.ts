import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarString } from '../Data/SnowWarBoundedList';
import { SnowWarGameObjectData, SnowWarGameObjectDataParser } from '../Data/SnowWarGameObjectData';

export type Game2StageStartingMessageType = {
    gameType: number;
    roomType: string;
    countDown: number;
    objects: SnowWarGameObjectData[];
};

export class Game2StageStartingMessage implements IIncomingPacket<Game2StageStartingMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2StageStartingMessageType {
        const gameType = wrapper.readInt();
        const roomType = readSnowWarString(wrapper);
        const countDown = wrapper.readInt();
        const objects = SnowWarGameObjectDataParser(wrapper);

        return { gameType, roomType, countDown, objects };
    }
}
