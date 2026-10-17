import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

export type Game2PlayerExitedGameArenaMessageType = {
    userId: number;
    playerGameObjectId: number;
};

export class Game2PlayerExitedGameArenaMessage implements IIncomingPacket<Game2PlayerExitedGameArenaMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2PlayerExitedGameArenaMessageType {
        const userId = wrapper.readInt();
        const playerGameObjectId = wrapper.readInt();

        return { userId, playerGameObjectId };
    }
}
