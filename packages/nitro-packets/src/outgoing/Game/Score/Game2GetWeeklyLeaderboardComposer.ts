import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2GetWeeklyLeaderboardComposerType = {
    gameTypeId: number;
    weekOffset: number;
    startRank: number;
    direction: number;
    viewSize: number;
    windowSize: number;
};

export class Game2GetWeeklyLeaderboardComposer implements IOutgoingPacket<Game2GetWeeklyLeaderboardComposerType> {
    public constructor(private params: Game2GetWeeklyLeaderboardComposerType) { }

    public compose(): (number | string | boolean)[] {
        return [
            this.params.gameTypeId,
            this.params.weekOffset,
            this.params.startRank,
            this.params.direction,
            this.params.viewSize,
            this.params.windowSize,
        ];
    }
}
