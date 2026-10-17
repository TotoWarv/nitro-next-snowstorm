import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

export type Game2PlayerRematchesMessageType = {
    userId: number;
};

export class Game2PlayerRematchesMessage implements IIncomingPacket<Game2PlayerRematchesMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2PlayerRematchesMessageType {
        const userId = wrapper.readInt();

        return { userId };
    }
}
