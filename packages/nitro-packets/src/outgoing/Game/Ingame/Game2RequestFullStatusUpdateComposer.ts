import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2RequestFullStatusUpdateComposerType = {
    reason: number;
};

export class Game2RequestFullStatusUpdateComposer implements IOutgoingPacket<Game2RequestFullStatusUpdateComposerType> {
    public constructor(private params: Game2RequestFullStatusUpdateComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.reason,
        ];
    }
}
