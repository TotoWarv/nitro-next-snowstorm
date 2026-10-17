import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2ExitGameComposerType = {
    exitToRoomBeforeGame: boolean;
};

export class Game2ExitGameComposer implements IOutgoingPacket<Game2ExitGameComposerType> {
    public constructor(private params: Game2ExitGameComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.exitToRoomBeforeGame,
        ];
    }
}
