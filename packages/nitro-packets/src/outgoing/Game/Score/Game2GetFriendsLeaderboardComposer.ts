import { IOutgoingPacket } from '@nitrodevco/nitro-api';

export type Game2GetFriendsLeaderboardComposerType = {
    gameTypeId: number;
    startRank: number;
    direction: number;
    viewSize: number;
    windowSize: number;
};

export class Game2GetFriendsLeaderboardComposer implements IOutgoingPacket<Game2GetFriendsLeaderboardComposerType> {
    public constructor(private params: Game2GetFriendsLeaderboardComposerType) { }

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
