import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2SetUserMoveTargetComposerType = {
    x: number;
    y: number;
    turn: number;
    subturn: number;
};

export class Game2SetUserMoveTargetComposer implements IOutgoingPacket<Game2SetUserMoveTargetComposerType> {
    public constructor(private params: Game2SetUserMoveTargetComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.x,
            this.params.y,
            this.params.turn,
            this.params.subturn,
        ];
    }
}
