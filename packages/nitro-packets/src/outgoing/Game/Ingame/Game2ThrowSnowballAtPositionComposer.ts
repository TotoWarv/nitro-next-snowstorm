import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2ThrowSnowballAtPositionComposerType = {
    x: number;
    y: number;
    trajectory: number;
    turn: number;
    subturn: number;
};

export class Game2ThrowSnowballAtPositionComposer implements IOutgoingPacket<Game2ThrowSnowballAtPositionComposerType> {
    public constructor(private params: Game2ThrowSnowballAtPositionComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.x,
            this.params.y,
            this.params.trajectory,
            this.params.turn,
            this.params.subturn,
        ];
    }
}
