import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

export type Game2StageRunningMessageType = {
    timeToStageEnd: number;
};

export class Game2StageRunningMessage implements IIncomingPacket<Game2StageRunningMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2StageRunningMessageType {
        const timeToStageEnd = wrapper.readInt();

        return { timeToStageEnd };
    }
}
