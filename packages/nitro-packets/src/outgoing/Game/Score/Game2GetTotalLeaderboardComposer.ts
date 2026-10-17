import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2GetTotalLeaderboardComposerType = {
    gameTypeId: number;
    startRank: number;
    direction: number;
    viewSize: number;
    windowSize: number;
};

export class Game2GetTotalLeaderboardComposer implements IOutgoingPacket<Game2GetTotalLeaderboardComposerType> {
    public constructor(private params: Game2GetTotalLeaderboardComposerType) { }

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
