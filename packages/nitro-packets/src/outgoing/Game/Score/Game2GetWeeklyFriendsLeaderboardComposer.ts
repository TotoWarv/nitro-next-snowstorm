import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2GetWeeklyFriendsLeaderboardComposerType = {
    gameTypeId: number;
    weekOffset: number;
    startRank: number;
    direction: number;
    viewSize: number;
    windowSize: number;
};

export class Game2GetWeeklyFriendsLeaderboardComposer implements IOutgoingPacket<Game2GetWeeklyFriendsLeaderboardComposerType> {
    public constructor(private params: Game2GetWeeklyFriendsLeaderboardComposerType) { }

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
