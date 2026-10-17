import { IIncomingPacket, IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarList, SnowWarListLimits } from '../Data/SnowWarBoundedList';

export type Game2StageStillLoadingMessageType = {
    percentage: number;
    finishedUserIds: number[];
};

export class Game2StageStillLoadingMessage implements IIncomingPacket<Game2StageStillLoadingMessageType> {
    public parse(wrapper: IMessageDataWrapper): Game2StageStillLoadingMessageType {
        const percentage = wrapper.readInt();
        const finishedUserIds = readSnowWarList(wrapper, SnowWarListLimits.players, () => wrapper.readInt());

        return { percentage, finishedUserIds };
    }
}
