import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

export type Game2EnterArenaFailedMessageType = {
    reason: number;
};

export class Game2EnterArenaFailedMessage implements IIncomingPacket<Game2EnterArenaFailedMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2EnterArenaFailedMessageType {
        const reason = wrapper.readInt();

        return { reason };
    }
}
