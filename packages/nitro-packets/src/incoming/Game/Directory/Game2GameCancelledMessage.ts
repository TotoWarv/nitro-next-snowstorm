import { IIncomingPacket } from '@nitrodevco/nitro-api';

export type Game2GameCancelledMessageType = object;

export class Game2GameCancelledMessage implements IIncomingPacket<Game2GameCancelledMessageType> {
    public parse(): Game2GameCancelledMessageType {
        return {};
    }
}
