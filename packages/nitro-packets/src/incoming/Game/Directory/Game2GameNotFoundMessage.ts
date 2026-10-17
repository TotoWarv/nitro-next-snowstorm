import { IIncomingPacket } from '@nitrodevco/nitro-api';

export type Game2GameNotFoundMessageType = object;

export class Game2GameNotFoundMessage implements IIncomingPacket<Game2GameNotFoundMessageType> {
    public parse(): Game2GameNotFoundMessageType {
        return {};
    }
}
