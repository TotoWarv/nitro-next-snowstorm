import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2MakeSnowballComposerType = {
    turn: number;
    subturn: number;
};

export class Game2MakeSnowballComposer implements IOutgoingPacket<Game2MakeSnowballComposerType> {
    public constructor(private params: Game2MakeSnowballComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.turn,
            this.params.subturn,
        ];
    }
}
