import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

export type Game2StageEndingMessageType = {
    timeToNextState: number;
};

export class Game2StageEndingMessage implements IIncomingPacket<Game2StageEndingMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2StageEndingMessageType {
        const timeToNextState = wrapper.readInt();

        return { timeToNextState };
    }
}
