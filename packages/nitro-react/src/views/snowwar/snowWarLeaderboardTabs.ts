import { snowWarAsset } from '#base/context/snowwar';

const SELECTED_TAB_TEXT = 0x000000;
const TAB_TEXT = 0xFFFFFF;

export type SnowWarLeaderboardTabSide = 'left' | 'right';

export interface SnowWarLeaderboardTabStyle {
    asset: string;
    color: number;
}

export const snowWarLeaderboardTabStyle = (side: SnowWarLeaderboardTabSide, selected: boolean): SnowWarLeaderboardTabStyle => ({
    asset: snowWarAsset(`${side}_${selected ? 'blue' : 'black'}`),
    color: selected ? SELECTED_TAB_TEXT : TAB_TEXT,
});
