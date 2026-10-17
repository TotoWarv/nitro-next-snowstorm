import { useState } from 'react';

import { closeSnowWarGames, openSnowWarLeaderboard, snowWarQuickJoin } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { formatSnowWarClock, snowWarAsset, SnowWarPhase, snowWarSecondsUntil, snowWarTemplate, useSnowWarStore } from '#base/context/snowwar';
import { useTranslation } from '#base/context/system';
import { useViewportSize } from '#base/hooks';
import { Box, TemplateBindings, TemplateWindow, TemplateWindows, useTemplateFrame } from '#base/theme';

import { SnowWarLobbyView } from './SnowWarLobbyView';
import { snowWarFrameAt, useSnowWarClock } from './useSnowWarClock';

const TEMPLATE = snowWarTemplate('games_main');
const FRAME_WIDTH = 413;
const FRAME_CHROME = 6;
const CONTENT_WIDTH = FRAME_WIDTH - FRAME_CHROME;
const SIDE_MARGIN = 8;
const PLAY_BUTTON_WIDTH = 190;
const PLAY_BUTTON_RIGHT = 13;
const INSTRUCTIONS_NEXT_RIGHT = 12;
const INSTRUCTION_FRAME_MS = 1000;
const CLOCK_TICK_MS = 1000;
const MODE_ELEMENTS = [ 'team_mode', 'deathmatch_mode', 'cooperative_mode', 'mode_description' ];
const PAGE_COUNT = 5;
const INSTRUCTION_FRAMES: readonly (readonly string[])[] = [
    [ 'move_1', 'move_2', 'move_3', 'move_4' ],
    [ 'throw_1_1', 'throw_1_2', 'throw_1_3', 'throw_1_4' ],
    [ 'throw_2_1', 'throw_2_2', 'throw_2_3', 'throw_2_4', 'throw_2_5' ],
    [ 'throw_3_1', 'throw_3_2', 'throw_3_3', 'throw_3_4', 'throw_3_5' ],
    [ 'balls_1', 'balls_2', 'balls_3', 'balls_4', 'balls_5' ],
];
const CENTERED_ELEMENTS: readonly { name: string; x: number }[] = [
    { name: 'quick_play_background', x: 0 },
    { name: 'quick_play_teaser', x: 0 },
    { name: 'header_text_container', x: 70 },
    { name: 'instructions_image', x: 78 },
    { name: 'instruction_text', x: 63 },
    { name: 'page_list', x: 141 },
];
const STRETCHED_ELEMENTS = [ 'teaser_container', 'instructions_container', 'footer_container', 'instructions_link', 'leaderboard_link' ];

export const SnowWarGamesMainView = () => {
    const open = useSnowWarStore(x => x.mainViewOpen);
    const phase = useSnowWarStore(x => x.phase);
    const blockedUntil = useSnowWarStore(x => x.blockedUntil);
    const [ page, setPage ] = useState<number | undefined>(undefined);
    const now = useSnowWarClock(CLOCK_TICK_MS, open);
    const { width: viewportWidth } = useViewportSize();
    const { send } = useWebSocketContext();
    const t = useTranslation();
    const frame = useTemplateFrame({ id: 'snowwar_games_main', centered: true, rememberPosition: false, resizeDirection: 'none', onClose: () => closeSnowWarGames(send) });

    if (!open) return null;

    const inLobby = phase === SnowWarPhase.Lobby;
    const width = Math.min(FRAME_WIDTH, viewportWidth - (2 * SIDE_MARGIN));
    const contentWidth = width - FRAME_CHROME;
    const shift = Math.round((contentWidth - CONTENT_WIDTH) / 2);
    const blockedSeconds = snowWarSecondsUntil(blockedUntil, now);
    const blocked = blockedSeconds > 0;
    const pageFrames = INSTRUCTION_FRAMES[page ?? 0];
    const playCaption = blocked ? formatSnowWarClock(blockedSeconds, false) : t('snowwar.play');

    const pageBindings: TemplateBindings = Object.fromEntries(Array.from({ length: PAGE_COUNT }, (_, index) => [
        [ `page_${index}`, { onPointerTap: () => setPage(index) } ],
        [ `page_${index}/@0`, { asset: snowWarAsset((index === page) ? 'pagination_ball_hilite' : 'pagination_ball'), pivot: 'center' } ],
    ]).flat());

    const bindings: TemplateBindings = {
        '': {
            children: inLobby && (
                <Box
                    pointerTransparent
                    layout={{ position: 'absolute', left: 0, top: 0 }}
                >
                    <SnowWarLobbyView width={contentWidth} />
                </Box>
            ),
        },
        quick_play_container: { visible: !inLobby },
        snowwar_lobby_cont: { visible: false },
        teaser_container: { visible: page === undefined },
        ...Object.fromEntries(MODE_ELEMENTS.map(name => [ name, { visible: false } ])),
        header_text_container: { visible: true },
        instructions_link: { onPointerTap: () => setPage(0) },
        leaderboard_link: { onPointerTap: openSnowWarLeaderboard },
        instructions_container: { visible: page !== undefined },
        instructions_image: { asset: snowWarAsset(pageFrames[snowWarFrameAt(now, INSTRUCTION_FRAME_MS, pageFrames.length)]), pivot: 'center' },
        instruction_text: { caption: t(`snowwar.instructions.${(page ?? 0) + 1}`), setCaptionAfterBuild: true },
        instructions_prev: { visible: (page ?? 0) > 0, onPointerTap: () => setPage(Math.max(0, (page ?? 0) - 1)) },
        instructions_next: { visible: (page ?? 0) < (PAGE_COUNT - 1), onPointerTap: () => setPage(Math.min(PAGE_COUNT - 1, (page ?? 0) + 1)) },
        instructions_back: { onPointerTap: () => setPage(undefined) },
        ...pageBindings,
        games_left_region: { visible: false },
        games_vip_region: { visible: false },
        'play.button': { disabled: blocked, onPointerTap: () => snowWarQuickJoin(send) },
        play_text: { caption: playCaption, setCaptionAfterBuild: true },
    };

    const arrange = ({ find }: TemplateWindows) => {
        if (contentWidth >= CONTENT_WIDTH) return;

        for (const name of STRETCHED_ELEMENTS) find(name)?.setWidth(contentWidth);
        for (const { name, x } of CENTERED_ELEMENTS) find(name)?.setX(x + shift);

        find('play.button')?.setX(contentWidth - PLAY_BUTTON_WIDTH - PLAY_BUTTON_RIGHT);
        find('instructions_next')?.setX(contentWidth - (find('instructions_next')?.width ?? 0) - INSTRUCTIONS_NEXT_RIGHT);
    };

    return (
        <TemplateWindow
            id={TEMPLATE}
            frame={frame}
            width={width}
            bindings={bindings}
            arrange={arrange}
        />
    );
};
