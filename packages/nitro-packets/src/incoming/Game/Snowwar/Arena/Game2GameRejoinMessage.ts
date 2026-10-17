import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

export type Game2GameRejoinMessageType = {
    roomId: number;
};

export class Game2GameRejoinMessage implements IIncomingPacket<Game2GameRejoinMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2GameRejoinMessageType {
        const roomId = wrapper.readInt();

        return { roomId };
    }
}
