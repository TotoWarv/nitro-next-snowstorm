import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { GameStatusDataParser } from '../Data/GameStatusData';
import { SnowWarGameEventData } from '../Data/SnowWarGameEventData';
import { SnowWarGameObjectData, SnowWarGameObjectDataParser } from '../Data/SnowWarGameObjectData';

export type Game2FullGameStatusMessageType = {
    remainingSeconds: number;
    durationSeconds: number;
    objects: SnowWarGameObjectData[];
    numberOfTeams: number;
    turn: number;
    checksum: number;
    events: SnowWarGameEventData[][];
};

export class Game2FullGameStatusMessage implements IIncomingPacket<Game2FullGameStatusMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2FullGameStatusMessageType {
        wrapper.readInt();

        const remainingSeconds = wrapper.readInt();
        const durationSeconds = wrapper.readInt();
        const objects = SnowWarGameObjectDataParser(wrapper);

        wrapper.readInt();

        const numberOfTeams = wrapper.readInt();
        const { turn, checksum, events } = GameStatusDataParser(wrapper);

        return { remainingSeconds, durationSeconds, objects, numberOfTeams, turn, checksum, events };
    }
}
