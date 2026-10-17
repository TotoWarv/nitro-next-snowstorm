import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

export type Game2GameChatFromPlayerMessageType = {
    userId: number;
    message: string;
};

export class Game2GameChatFromPlayerMessage implements IIncomingPacket<Game2GameChatFromPlayerMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2GameChatFromPlayerMessageType {
        const userId = wrapper.readInt();
        const message = wrapper.readString();

        return { userId, message };
    }
}
