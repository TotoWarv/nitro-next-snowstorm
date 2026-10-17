import { useState } from 'react';

import { snowWarChat } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { SNOWWAR_TEAM_RED, snowWarTeamColor, useSnowWarStore } from '#base/context/snowwar';
import { useViewportSize } from '#base/hooks';
import { Box, TextInput, ThemeText } from '#base/theme';

const VISIBLE_LINES = 6;
const CHAT_MAX_LENGTH = 100;
const INPUT_HEIGHT = 22;
const LINE_HEIGHT = 18;
const MAX_WIDTH = 600;
const EDGE = 10;
const LINES_GAP = 4;

export interface SnowWarChatViewProps {
    left: number;
    bottom: number;
}

const hexColor = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

export const SnowWarChatView = ({ left, bottom }: SnowWarChatViewProps) => {
    const chat = useSnowWarStore(x => x.chat);
    const [ text, setText ] = useState('');
    const { width, height } = useViewportSize();
    const { send } = useWebSocketContext();
    const inputWidth = Math.max(0, Math.min(MAX_WIDTH, width - left - EDGE));
    const inputLeft = Math.max(left, Math.round((width - inputWidth) / 2));
    const linesWidth = Math.min(MAX_WIDTH, width - (2 * EDGE));
    const linesLeft = Math.round((width - linesWidth) / 2);
    const inputTop = height - bottom - INPUT_HEIGHT;
    const lines = chat.slice(-VISIBLE_LINES);

    const submit = () => {
        if (snowWarChat(send, text)) setText('');
    };

    return (
        <>
            <Box
                pointerTransparent
                layout={{ position: 'absolute', left: linesLeft, top: inputTop - LINES_GAP - (lines.length * LINE_HEIGHT), width: linesWidth, flexDirection: 'column' }}
            >
                {lines.map((line, index) => (
                    <Box
                        key={`${index}-${line.userId}`}
                        pointerTransparent
                        layout={{ height: LINE_HEIGHT, alignSelf: (line.team === SNOWWAR_TEAM_RED) ? 'flex-end' : 'flex-start' }}
                    >
                        <ThemeText
                            text={`${line.name}: ${line.message}`}
                            textStyle="u_bold"
                            textOptions={{ fill: hexColor(snowWarTeamColor(line.team)) }}
                        />
                    </Box>
                ))}
            </Box>
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
