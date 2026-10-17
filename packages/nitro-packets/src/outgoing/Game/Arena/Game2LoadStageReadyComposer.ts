import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2LoadStageReadyComposerType = {
    percentage: number;
};

export class Game2LoadStageReadyComposer implements IOutgoingPacket<Game2LoadStageReadyComposerType> {
    public constructor(private params: Game2LoadStageReadyComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.percentage,
        ];
    }
}
