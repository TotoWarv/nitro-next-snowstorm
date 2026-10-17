import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2GameChatComposerType = {
    message: string;
};

export class Game2GameChatComposer implements IOutgoingPacket<Game2GameChatComposerType> {
    public constructor(private params: Game2GameChatComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.message,
        ];
    }
}
