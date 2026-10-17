import { useEffect, useState } from 'react';

import { closeSnowWarLeaderboard, openProfile, snowWarRequestLeaderboard } from '#base/commands';
import { AvatarFaceImage } from '#base/components';
import { useWebSocketContext } from '#base/context/communication';
import { SNOWWAR_LIBRARY, snowWarAsset, snowWarGenderOf, SnowWarLeaderboardKind, snowWarTemplate, useSnowWarStore } from '#base/context/snowwar';
import { useTranslation } from '#base/context/system';
import { useOwnUserId } from '#base/context/user';
import { Box, TemplateBindings, TemplateItem, TemplateWindow, useTemplateFrame, useTemplateLibrary } from '#base/theme';

import { snowWarLeaderboardTabStyle } from './snowWarLeaderboardTabs';
import { useSnowWarClock } from './useSnowWarClock';

const TEMPLATE = snowWarTemplate('snowwar_leaderboard');
const ENTRY_TEMPLATE = snowWarTemplate('snowwar_leaderboard_entry');
const VIEW_SIZE = 8;
const FIRST_RANK = 1;
const AROUND_ME = -1;
const FACE_DIRECTION = 2;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_MINUTE = 60000;

type LeaderboardPeriod = 'weekly' | 'total';
type LeaderboardAudience = 'all' | 'friends';

const kindOf = (period: LeaderboardPeriod, audience: LeaderboardAudience): SnowWarLeaderboardKind => {
    if (period === 'weekly') return (audience === 'friends') ? 'weeklyFriends' : 'weekly';

    return (audience === 'friends') ? 'friends' : 'total';
};

export const SnowWarLeaderboardView = () => {
    const [ period, setPeriod ] = useState<LeaderboardPeriod>('total');
    const [ audience, setAudience ] = useState<LeaderboardAudience>('friends');
    const [ weekOffset, setWeekOffset ] = useState(0);
    const kind = kindOf(period, audience);
    const board = useSnowWarStore(x => x.leaderboards[kind]);
    const ownUserId = useOwnUserId();
    const templates = useTemplateLibrary(SNOWWAR_LIBRARY);
    const now = useSnowWarClock(MS_PER_MINUTE);
    const [ receivedAt, setReceivedAt ] = useState<{ board: unknown; at: number }>({ board: undefined, at: now });
    const { send } = useWebSocketContext();
    const t = useTranslation();
    const frame = useTemplateFrame({ id: 'snowwar_leaderboard', centered: true, rememberPosition: false, resizeDirection: 'none', onClose: closeSnowWarLeaderboard });

    useEffect(() => {
        snowWarRequestLeaderboard(send, kind, { startRank: AROUND_ME, weekOffset });
    }, [ send, kind, weekOffset ]);

    if (receivedAt.board !== board) setReceivedAt({ board, at: now });

    const entries = board?.entries ?? [];
    const firstRank = entries[0]?.rank ?? FIRST_RANK;
    const total = board?.totalListSize ?? 0;
    const canScrollUp = firstRank > FIRST_RANK;
    const canScrollDown = (firstRank + VIEW_SIZE) <= total;
    const weekly = period === 'weekly';
    const maxOffset = board?.maxOffset ?? 0;
    const minutesLeft = Math.max(0, (board?.minutesUntilReset ?? 0) - Math.floor((now - receivedAt.at) / MS_PER_MINUTE));
    const resetText = t('snowwar.leaderboard.weekly_reset', '', {
        days: String(Math.floor(minutesLeft / (MINUTES_PER_HOUR * HOURS_PER_DAY))),
        hours: String(Math.floor(minutesLeft / MINUTES_PER_HOUR) % HOURS_PER_DAY),
        minutes: String(minutesLeft % MINUTES_PER_HOUR),
    });
    const weekLabel = (weekly && board?.year) ? ` ${board.year}/${board.week}` : '';
    const entryTemplate = templates?.[ENTRY_TEMPLATE];
    const thisWeekTab = snowWarLeaderboardTabStyle('left', weekly);
    const allTimeTab = snowWarLeaderboardTabStyle('right', !weekly);

    const scroll = (startRank: number) => snowWarRequestLeaderboard(send, kind, { startRank, weekOffset });

    const rows: TemplateItem[] = entryTemplate
        ? entries.slice(0, VIEW_SIZE).map(entry => ({
                key: `${entry.rank}-${entry.userId}`,
                from: entryTemplate,
                bindings: {
                    highlight: { visible: entry.userId === ownUserId },
                    rank: { caption: String(entry.rank), setCaptionAfterBuild: true },
                    name: { caption: entry.name, setCaptionAfterBuild: true },
                    score: { caption: String(entry.score), setCaptionAfterBuild: true },
                    imageRegion: { onPointerTap: () => openProfile(send, entry.userId) },
                    avatarImage: {
                        children: !!entry.figure && (
                            <Box layout={{ position: 'absolute', left: 0, top: 0 }}>
                                <AvatarFaceImage
                                    figure={entry.figure}
                                    gender={snowWarGenderOf(entry.gender)}
                                    direction={FACE_DIRECTION}
                                    scale={0.8}
                                />
                            </Box>
                        ),
                    },
                },
            }))
        : [];

    const bindings: TemplateBindings = {
        '': { caption: `${t('snowwar.leaderboards.link')}${weekLabel}` },
        this_week_region: { onPointerTap: () => setPeriod('weekly') },
        this_week_image: { asset: thisWeekTab.asset },
        this_week_text: { color: thisWeekTab.color },
        all_time_region: { onPointerTap: () => setPeriod('total') },
        all_time_image: { asset: allTimeTab.asset },
        all_time_text: { color: allTimeTab.color },
        list: { items: rows },
        scrollUp: { onPointerTap: () => canScrollUp && scroll(Math.max(FIRST_RANK, firstRank - VIEW_SIZE)) },
        'scrollUp/@0': { asset: snowWarAsset(canScrollUp ? 'scroll_up_normal' : 'scroll_up_inactive') },
        scrollDown: { onPointerTap: () => canScrollDown && scroll(firstRank + VIEW_SIZE) },
        'scrollDown/@0': { asset: snowWarAsset(canScrollDown ? 'scroll_down_normal' : 'scroll_down_inactive') },
        previousWeek: { visible: weekly && (weekOffset < maxOffset), onPointerTap: () => setWeekOffset(Math.min(maxOffset, weekOffset + 1)) },
        nextWeek: { visible: weekly && (weekOffset > 0), onPointerTap: () => setWeekOffset(Math.max(0, weekOffset - 1)) },
        reset_text: { visible: weekly, caption: resetText, setCaptionAfterBuild: true },
        reset_text_stroke: { visible: weekly, caption: resetText, setCaptionAfterBuild: true },
        changeView: { underline: audience !== 'all', onPointerTap: () => setAudience('all') },
        changeFriendsView: { underline: audience !== 'friends', onPointerTap: () => setAudience('friends') },
        changeGroupView: { visible: false },
    };

    return (
        <TemplateWindow
            id={TEMPLATE}
            frame={frame}
            bindings={bindings}
        />
    );
};
