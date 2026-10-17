import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2GetWeeklyGroupLeaderboardComposerType = {
    gameTypeId: number;
    weekOffset: number;
    startRank: number;
    direction: number;
    viewSize: number;
    windowSize: number;
};

export class Game2GetWeeklyGroupLeaderboardComposer implements IOutgoingPacket<Game2GetWeeklyGroupLeaderboardComposerType> {
    public constructor(private params: Game2GetWeeklyGroupLeaderboardComposerType) { }

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
