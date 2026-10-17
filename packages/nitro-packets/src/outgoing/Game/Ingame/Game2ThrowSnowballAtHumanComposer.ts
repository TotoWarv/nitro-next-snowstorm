import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2ThrowSnowballAtHumanComposerType = {
    targetHumanId: number;
    trajectory: number;
    turn: number;
    subturn: number;
};

export class Game2ThrowSnowballAtHumanComposer implements IOutgoingPacket<Game2ThrowSnowballAtHumanComposerType> {
    public constructor(private params: Game2ThrowSnowballAtHumanComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.targetHumanId,
            this.params.trajectory,
            this.params.turn,
            this.params.subturn,
        ];
    }
}
