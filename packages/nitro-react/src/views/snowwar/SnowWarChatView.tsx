import { useState } from 'react';

import { snowWarChat } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { SnowWarChatLine, snowWarTeamColor, useSnowWarStore } from '#base/context/snowwar';
import { useViewportSize } from '#base/hooks';
import { Box, ColorLayer, FillLayout, TextInput, ThemeText } from '#base/theme';

import { snowWarChatBubbleLeft, snowWarChatBubbleWidth } from './snowWarChatLayout';
import { SnowWarPlayerHead } from './SnowWarPlayerHead';

const VISIBLE_LINES = 6;
const CHAT_MAX_LENGTH = 100;
const INPUT_HEIGHT = 22;
const MAX_INPUT_WIDTH = 600;
const EDGE = 10;
const LINES_GAP = 4;
const BUBBLE_HEIGHT = 30;
const BUBBLE_SPACING = 3;
const BUBBLE_ALPHA = 0.85;
const HEAD_WIDTH = 30;
const TEXT_LEFT = HEAD_WIDTH + 4;
const TEXT_RIGHT = 6;
const TEXT_TOP = 7;
const DEFAULT_GENDER = 'M';

export interface SnowWarChatViewProps {
    left: number;
    bottom: number;
}

const hexColor = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

interface SnowWarChatBubbleProps {
    line: SnowWarChatLine;
    gender: string;
    left: number;
    top: number;
    width: number;
}

const SnowWarChatBubble = ({ line, gender, left, top, width }: SnowWarChatBubbleProps) => (
    <Box
        pointerTransparent
        layout={{ position: 'absolute', left, top, width, height: BUBBLE_HEIGHT, overflow: 'hidden' }}
    >
        <ColorLayer
            color={hexColor(snowWarTeamColor(line.team))}
            alpha={BUBBLE_ALPHA}
            layout={FillLayout}
        />
        <SnowWarPlayerHead
            figure={line.figure}
            gender={gender}
            width={HEAD_WIDTH}
            height={BUBBLE_HEIGHT}
        />
        <ThemeText
            text={`${line.name}: ${line.message}`}
            textStyle="u_bold"
            textOptions={{ fill: '#FFFFFF' }}
            crop={Math.max(0, width - TEXT_LEFT - TEXT_RIGHT)}
            layout={{ position: 'absolute', left: TEXT_LEFT, top: TEXT_TOP }}
        />
    </Box>
);

export const SnowWarChatView = ({ left, bottom }: SnowWarChatViewProps) => {
    const chat = useSnowWarStore(x => x.chat);
    const arenaPlayers = useSnowWarStore(x => x.arenaPlayers);
    const [ text, setText ] = useState('');
    const { width, height } = useViewportSize();
    const { send } = useWebSocketContext();
    const inputWidth = Math.max(0, Math.min(MAX_INPUT_WIDTH, width - left - EDGE));
    const inputLeft = Math.max(left, Math.round((width - inputWidth) / 2));
    const inputTop = height - bottom - INPUT_HEIGHT;
    const area = { width, minLeft: left, edge: EDGE };
    const bubbleWidth = snowWarChatBubbleWidth(area);
    const lines = chat.slice(-VISIBLE_LINES);
    const genderOf = (userId: number) => arenaPlayers.find(player => player.referenceId === userId)?.gender ?? DEFAULT_GENDER;

    const submit = () => {
        if (snowWarChat(send, text)) setText('');
    };

    return (
        <>
            {lines.map((line, index) => (
                <SnowWarChatBubble
                    key={`${chat.length - lines.length + index}`}
                    line={line}
                    gender={genderOf(line.userId)}
                    left={snowWarChatBubbleLeft(line.team, bubbleWidth, area)}
                    top={inputTop - LINES_GAP - ((lines.length - index) * (BUBBLE_HEIGHT + BUBBLE_SPACING))}
                    width={bubbleWidth}
                />
            ))}
            <TextInput
                value={text}
                onChange={value => setText(value.slice(0, CHAT_MAX_LENGTH))}
                onEnter={submit}
                maxLength={CHAT_MAX_LENGTH}
                focusCapturer
                textStyle="u_regular"
                layout={{ position: 'absolute', left: inputLeft, top: inputTop, width: inputWidth, height: INPUT_HEIGHT }}
            />
        </>
    );
};
