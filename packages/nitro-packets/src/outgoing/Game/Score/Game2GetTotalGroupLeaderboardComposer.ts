import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2GetTotalGroupLeaderboardComposerType = {
    gameTypeId: number;
    startRank: number;
    direction: number;
    viewSize: number;
    windowSize: number;
};

export class Game2GetTotalGroupLeaderboardComposer implements IOutgoingPacket<Game2GetTotalGroupLeaderboardComposerType> {
    public constructor(private params: Game2GetTotalGroupLeaderboardComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.gameTypeId,
            this.params.startRank,
            this.params.direction,
            this.params.viewSize,
            this.params.windowSize,
        ];
    }
}
