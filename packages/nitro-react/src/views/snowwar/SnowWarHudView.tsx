import { useEffect, useRef, useState } from 'react';

import { snowWarMakeSnowball } from '#base/commands';
import { useWebSocketContext } from '#base/context/communication';
import { formatSnowWarClock, SNOWWAR_MAX_HEALTH, SNOWWAR_MAX_SNOWBALLS, snowWarAsset, SnowWarPhase, snowWarTemplate, useSnowWarStore } from '#base/context/snowwar';
import { useViewportSize } from '#base/hooks';
import { Box, TemplateBindings, TemplateWindow, TemplateWindows } from '#base/theme';

import { SnowWarChatView } from './SnowWarChatView';
import { SnowWarCountdownView } from './SnowWarCountdownView';
import { SnowWarExitView } from './SnowWarExitView';
import { SnowWarPlayerHead } from './SnowWarPlayerHead';
import { snowWarFrameAt, useSnowWarClock } from './useSnowWarClock';

const TIMER_TEMPLATE = snowWarTemplate('snowwar_timer');
const SNOWBALLS_TEMPLATE = snowWarTemplate('snowwar_snowballs');
const SCORES_TEMPLATE = snowWarTemplate('snowwar_team_scores');
const OWN_STATS_TEMPLATE = snowWarTemplate('snowwar_own_stats');
const EDGE = 10;
const SCORES_WIDTH = 189;
const TIMER_WIDTH = 100;
const TIMER_TOP = 96;
const SNOWBALLS_HEIGHT = 260;
const SNOWBALLS_TEMPLATE_Y = 83;
const OWN_STATS_WIDTH = 171;
const OWN_STATS_HEIGHT = 73;
const OWN_IMAGE_SIZE = 73;
const BALL_X = 14;
const BALL_TOP = 14;
const BALL_STEP = 36;
const NO_BALLS_WIDTH = 29;
const NO_BALLS_HEIGHT = 173;
const NO_BALLS_FRAMES = 4;
const LOADING_FRAMES = 8;
const ANIMATION_TICK_MS = 50;
const BLINK_MS = 500;
const ALERT_SECONDS = 5;
const HIT_FRAMES = 4;
const MAKING_SNOWBALL = 1;

interface HitAnimation {
    kind: 'plus' | 'minus';
    startedAt: number;
}

interface SeenHits {
    given: number;
    taken: number;
    animation: HitAnimation | undefined;
}

const ballBindings = (balls: number): TemplateBindings => Object.fromEntries(Array.from({ length: SNOWWAR_MAX_SNOWBALLS }, (_, index) => [ `ball_${index}`, { visible: balls > index } ]));

export const SnowWarHudView = () => {
    const phase = useSnowWarStore(x => x.phase);
    const hud = useSnowWarStore(x => x.hud);
    const secondsLeft = useSnowWarStore(x => x.secondsLeft);
    const { width, height } = useViewportSize();
    const { send } = useWebSocketContext();
    const now = useSnowWarClock(ANIMATION_TICK_MS);
    const [ holding, setHolding ] = useState(false);
    const [ seenHits, setSeenHits ] = useState<SeenHits>({ given: hud.hitsGiven, taken: hud.hitsTaken, animation: undefined });
    const wasMaking = useRef(false);
    const arenaPlayers = useSnowWarStore(x => x.arenaPlayers);
    const own = hud.own;
    const ownGender = arenaPlayers.find(player => player.referenceId === own?.userId)?.gender ?? 'M';
    const balls = own?.balls ?? 0;
    const making = own?.activityState === MAKING_SNOWBALL;

    if ((seenHits.given !== hud.hitsGiven) || (seenHits.taken !== hud.hitsTaken)) {
        const kind = (hud.hitsTaken > seenHits.taken) ? 'minus' : ((hud.hitsGiven > seenHits.given) ? 'plus' : undefined);

        setSeenHits({ given: hud.hitsGiven, taken: hud.hitsTaken, animation: kind ? { kind, startedAt: now } : seenHits.animation });
    }

    useEffect(() => {
        if (wasMaking.current && !making && holding && (phase === SnowWarPhase.Running)) snowWarMakeSnowball(send);

        wasMaking.current = making;
    }, [ making, holding, phase, send ]);

    const startMaking = () => {
        setHolding(true);
        snowWarMakeSnowball(send);
    };

    const hit = seenHits.animation;
    const hitFrame = hit ? Math.floor((now - hit.startedAt) / ANIMATION_TICK_MS) : HIT_FRAMES;
    const hitShown = !!hit && (hitFrame >= 0) && (hitFrame < HIT_FRAMES);
    const alert = (phase === SnowWarPhase.Running) && (secondsLeft > 0) && (secondsLeft <= ALERT_SECONDS);
    const timerShown = !alert || ((now % (2 * BLINK_MS)) < BLINK_MS);
    const clock = formatSnowWarClock(secondsLeft, true);
    const blinkOn = (now % (2 * BLINK_MS)) < BLINK_MS;
    const scoresLeft = width - SCORES_WIDTH - EDGE;
    const snowballsTop = Math.max(EDGE, Math.round((height - SNOWBALLS_HEIGHT) / 2)) - SNOWBALLS_TEMPLATE_Y;
    const ownStatsTop = height - OWN_STATS_HEIGHT - EDGE;

    const arrangeSnowballs = ({ find }: TemplateWindows) => {
        find('ballProgress')?.setY(BALL_TOP + ((SNOWWAR_MAX_SNOWBALLS - 1 - Math.min(balls, SNOWWAR_MAX_SNOWBALLS - 1)) * BALL_STEP));
        find('emptyFlashImage')?.setRectangle(BALL_X, BALL_TOP, NO_BALLS_WIDTH, NO_BALLS_HEIGHT);
    };

    return (
        <Box
            pointerTransparent
            layout={{ position: 'absolute', left: 0, top: 0, width, height }}
        >
            <SnowWarExitView
                left={EDGE}
                top={EDGE}
            />
            <Box layout={{ position: 'absolute', left: scoresLeft, top: EDGE }}>
                <TemplateWindow
                    id={SCORES_TEMPLATE}
                    bindings={{
                        score_blue: { caption: String(hud.teamScores[0] ?? 0), setCaptionAfterBuild: true },
                        score_blue_stroke: { caption: String(hud.teamScores[0] ?? 0), setCaptionAfterBuild: true },
                        score_red: { caption: String(hud.teamScores[1] ?? 0), setCaptionAfterBuild: true },
                        score_red_stroke: { caption: String(hud.teamScores[1] ?? 0), setCaptionAfterBuild: true },
                    }}
                />
            </Box>
            <Box layout={{ position: 'absolute', left: scoresLeft + Math.round((SCORES_WIDTH - TIMER_WIDTH) / 2), top: EDGE + TIMER_TOP }}>
                <TemplateWindow
                    id={TIMER_TEMPLATE}
                    bindings={{
                        time_left: { visible: timerShown, caption: clock, setCaptionAfterBuild: true },
                        time_left_stroke: { visible: timerShown, caption: clock, setCaptionAfterBuild: true },
                    }}
                />
            </Box>
            <Box layout={{ position: 'absolute', left: EDGE, top: snowballsTop }}>
                <TemplateWindow
                    id={SNOWBALLS_TEMPLATE}
                    arrange={arrangeSnowballs}
                    bindings={{
                        ...ballBindings(balls),
                        ballProgress: { visible: making && (balls < SNOWWAR_MAX_SNOWBALLS), asset: snowWarAsset(`load_${snowWarFrameAt(now, ANIMATION_TICK_MS * 2, LOADING_FRAMES) + 1}`) },
                        emptyFlashImage: { visible: (balls === 0) && !making && blinkOn, asset: snowWarAsset(`ui_no_balls_${snowWarFrameAt(now, BLINK_MS / 2, NO_BALLS_FRAMES) + 1}`) },
                        make_snowball: {
                            onPointerDown: startMaking,
                            onPointerUp: () => setHolding(false),
                            onPointerOut: () => setHolding(false),
                        },
                        makeSnowballImage: { asset: snowWarAsset(holding ? 'ui_make_balls_down' : 'ui_make_balls_up') },
                    }}
                />
            </Box>
            <Box layout={{ position: 'absolute', left: EDGE, top: ownStatsTop }}>
                <TemplateWindow
                    id={OWN_STATS_TEMPLATE}
                    bindings={{
                        energy_bar: { asset: snowWarAsset(`ui_me_health_${Math.min(SNOWWAR_MAX_HEALTH, Math.max(0, own?.hp ?? 0))}`) },
                        backgroundFlashImage: { visible: hitShown, asset: snowWarAsset(`ui_me_${hit?.kind ?? 'plus'}_${Math.min(HIT_FRAMES, Math.max(0, hitFrame) + 1)}`) },
                        user_image: {
                            children: own && (
                                <SnowWarPlayerHead
                                    figure={own.figure}
                                    gender={ownGender}
                                    width={OWN_IMAGE_SIZE}
                                    height={OWN_IMAGE_SIZE}
                                />
                            ),
                        },
                        personal_score: { caption: String(own?.score ?? 0), setCaptionAfterBuild: true },
                        personal_score_stroke: { caption: String(own?.score ?? 0), setCaptionAfterBuild: true },
                    }}
                />
            </Box>
            <SnowWarChatView
                left={EDGE + OWN_STATS_WIDTH + EDGE}
                bottom={EDGE}
            />
            <SnowWarCountdownView />
        </Box>
    );
};
