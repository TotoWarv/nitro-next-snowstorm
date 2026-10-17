import { SNOWWAR_TEAM_RED } from '#base/context/snowwar';

export const SNOWWAR_CHAT_BUBBLE_WIDTH = 260;
export const SNOWWAR_CHAT_TEAM_OFFSET = 300;

export interface SnowWarChatArea {
    width: number;
    minLeft: number;
    edge: number;
}

export const snowWarChatBubbleWidth = ({ width, minLeft, edge }: SnowWarChatArea): number => Math.max(0, Math.min(SNOWWAR_CHAT_BUBBLE_WIDTH, width - edge - minLeft));

export const snowWarChatBubbleLeft = (team: number, bubbleWidth: number, { width, minLeft, edge }: SnowWarChatArea): number => {
    const offset = (team === SNOWWAR_TEAM_RED) ? SNOWWAR_CHAT_TEAM_OFFSET : -SNOWWAR_CHAT_TEAM_OFFSET;
    const centred = Math.round((width / 2) + offset - (bubbleWidth / 2));

    return Math.max(minLeft, Math.min(width - edge - bubbleWidth, centred));
};
