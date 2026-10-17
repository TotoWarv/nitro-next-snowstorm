import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { beforeEach, test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const packagesRoot = new URL('../packages/', import.meta.url);
const nodeRequire = createRequire(new URL('../packages/nitro-react/package.json', import.meta.url));

const world = { sent: [], alerts: [] };

const packetStub = new Proxy({}, {
    get: (_target, name) => {
        if (typeof name !== 'string') return undefined;

        const Packet = class {
            constructor(params) {
                this.name = name;
                this.params = params;
            }
        };

        return Packet;
    },
});

const apiStub = {
    AvatarGenderType: { Male: 'M', Female: 'F', Unisex: 'U' },
    NitroLogger: { error: () => undefined, warn: () => undefined, log: () => undefined },
};

const reactStub = { createElement: (type, props) => ({ type, props }) };

const systemContextStub = {
    systemStore: {
        getState: () => ({
            showAlert: (title, message) => world.alerts.push([ title, message ]),
            getLocalizationValue: key => `<${key}>`,
            setLandingViewVisible: () => undefined,
            endRoomSession: () => undefined,
        }),
    },
};

const roomContextStub = { roomStore: { getState: () => ({ room: undefined, setRoom: () => undefined, setIsPlayingGame: () => undefined }) } };

const sourceFor = (specifier) => {
    for (const candidate of [ `${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts` ]) {
        const url = new URL(candidate, packagesRoot);

        if (existsSync(url)) return url;
    }

    throw new Error(`Module not found: ${specifier}`);
};

const modules = new Map();

const resolveSpecifier = (from, name) => {
    if (name.startsWith('.')) return { path: new URL(name, new URL(from, packagesRoot)).pathname.slice(packagesRoot.pathname.length) };

    switch (name) {
        case '@nitrodevco/nitro-packets': return { value: packetStub };
        case '@nitrodevco/nitro-api': return { value: apiStub };
        case '#base/context/system': return { value: systemContextStub };
        case '#base/context/room': return { value: roomContextStub };
        case '#base/context/communication': return { value: {} };
        case '#base/snowwar': return { value: { getSnowWarMatch: () => undefined, setSnowWarMatch: () => undefined, SNOWWAR_ARENA_ROOM_ID: 1, SnowWarTrajectory: {} } };
        case '#base/components': return { value: { AvatarImage: 'AvatarImage' } };
        case '#base/theme': return { value: { Box: 'Box', ThemeImage: 'ThemeImage' } };
        case '#base/commands': return { path: 'nitro-react/src/commands/snowWarViewCommands' };
        case 'react': return { value: reactStub };
        case 'react/jsx-runtime': return { value: { jsx: reactStub.createElement, jsxs: reactStub.createElement, Fragment: 'Fragment' } };
        case 'zustand': return { value: nodeRequire('zustand') };
    }

    if (name.startsWith('#base/')) return { path: `nitro-react/src/${name.slice(6)}` };

    throw new Error(`Unexpected dependency ${name} in ${from}`);
};

function requireModule(specifier) {
    const url = sourceFor(specifier);
    const key = url.href;

    if (modules.has(key)) return modules.get(key);

    const relative = url.pathname.slice(packagesRoot.pathname.length);
    const source = readFileSync(url, 'utf8');
    const { outputText } = ts.transpileModule(source, {
        fileName: url.pathname,
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    });
    const exports = {};

    modules.set(key, exports);

    runInNewContext(outputText, {
        exports,
        require: (name) => {
            const target = resolveSpecifier(relative, name);

            return ('value' in target) ? target.value : requireModule(target.path);
        },
    });

    return exports;
}

const display = requireModule('nitro-react/src/context/snowwar/store/SnowWarDisplay');
const { snowWarStore, SnowWarPhase } = requireModule('nitro-react/src/context/snowwar');
const viewCommands = requireModule('nitro-react/src/commands/snowWarViewCommands');
const teamRows = requireModule('nitro-react/src/views/snowwar/snowWarTeamRows');
const board = requireModule('nitro-react/src/views/snowwar/snowWarBoardBindings');

const send = (...packets) => {
    for (const packet of packets) world.sent.push(packet);
};

const sentNames = () => world.sent.map(packet => packet.name);

const player = (userId, teamId, skillLevel, extra = {}) => ({ userId, name: `p${userId}`, figure: 'hd-180-1', gender: 'M', teamId, skillLevel, totalScore: skillLevel * 100, scoreToNextLevel: 0, ...extra });

const ROW_TEMPLATE = { name: 'row' };

beforeEach(() => {
    world.sent.length = 0;
    world.alerts.length = 0;
    snowWarStore.getState().resetGame();
    snowWarStore.setState({ mainViewOpen: false, leaderboardOpen: false, error: undefined });
});

await test('skill stars: ten per tier, bronze silver gold', () => {
    assert.deepEqual({ ...display.snowWarStarsOf(1) }, { tier: 'bronze', filled: 1 });
    assert.deepEqual({ ...display.snowWarStarsOf(10) }, { tier: 'bronze', filled: 10 });
    assert.deepEqual({ ...display.snowWarStarsOf(11) }, { tier: 'silver', filled: 1 });
    assert.deepEqual({ ...display.snowWarStarsOf(20) }, { tier: 'silver', filled: 10 });
    assert.deepEqual({ ...display.snowWarStarsOf(21) }, { tier: 'gold', filled: 1 });
    assert.deepEqual({ ...display.snowWarStarsOf(30) }, { tier: 'gold', filled: 10 });
});

await test('skill stars: out of range levels are clamped', () => {
    assert.deepEqual({ ...display.snowWarStarsOf(0) }, { tier: 'bronze', filled: 1 });
    assert.deepEqual({ ...display.snowWarStarsOf(-4) }, { tier: 'bronze', filled: 1 });
    assert.deepEqual({ ...display.snowWarStarsOf(Number.NaN) }, { tier: 'bronze', filled: 1 });
    assert.deepEqual({ ...display.snowWarStarsOf(99) }, { tier: 'gold', filled: 10 });
});

await test('clock: mm:ss for the timer, m:ss for the blocked play button', () => {
    assert.equal(display.formatSnowWarClock(180, true), '03:00');
    assert.equal(display.formatSnowWarClock(65, true), '01:05');
    assert.equal(display.formatSnowWarClock(65, false), '1:05');
    assert.equal(display.formatSnowWarClock(0.2, true), '00:01');
    assert.equal(display.formatSnowWarClock(-3, true), '00:00');
});

await test('seconds until a deadline round up and never go negative', () => {
    assert.equal(display.snowWarSecondsUntil(10_000, 0), 10);
    assert.equal(display.snowWarSecondsUntil(10_000, 9_001), 1);
    assert.equal(display.snowWarSecondsUntil(10_000, 10_000), 0);
    assert.equal(display.snowWarSecondsUntil(10_000, 20_000), 0);
});

await test('the hotel windows are hidden from loading to the end of the game only', () => {
    assert.equal(display.isSnowWarScreenPhase(SnowWarPhase.Inactive), false);
    assert.equal(display.isSnowWarScreenPhase(SnowWarPhase.Lobby), false);
    assert.equal(display.isSnowWarScreenPhase(SnowWarPhase.Loading), true);
    assert.equal(display.isSnowWarScreenPhase(SnowWarPhase.Starting), true);
    assert.equal(display.isSnowWarScreenPhase(SnowWarPhase.Running), true);
    assert.equal(display.isSnowWarScreenPhase(SnowWarPhase.Ending), true);
});

await test('error texts follow the joining, entering and generic reasons', () => {
    assert.equal(display.snowWarErrorKey({ kind: 'joining', reason: 2 }), 'snowwar.error.duplicate_machineid');
    assert.equal(display.snowWarErrorKey({ kind: 'joining', reason: 6 }), 'snowwar.error.has_active_instance');
    assert.equal(display.snowWarErrorKey({ kind: 'joining', reason: 7 }), 'snowwar.error.has_active_instance');
    assert.equal(display.snowWarErrorKey({ kind: 'joining', reason: 8 }), 'snowwar.error.no_free_games_left');
    assert.equal(display.snowWarErrorKey({ kind: 'joining', reason: 3 }), 'snowwar.error.generic');
    assert.equal(display.snowWarErrorKey({ kind: 'starting', reason: 1 }), 'snowwar.error.generic');
    assert.equal(display.snowWarErrorKey({ kind: 'enterArena', reason: 1 }), 'snowwar.error.game_already_started');
    assert.equal(display.snowWarErrorKey({ kind: 'enterArena', reason: 2 }), 'snowwar.error.generic');
});

await test('team colours and genders', () => {
    assert.equal(display.snowWarTeamColor(1), 0x2F9EC9);
    assert.equal(display.snowWarTeamColor(2), 0xC34B48);
    assert.equal(display.snowWarGenderOf('f'), 'F');
    assert.equal(display.snowWarGenderOf('F'), 'F');
    assert.equal(display.snowWarGenderOf('M'), 'M');
    assert.equal(display.snowWarGenderOf(''), 'M');
});

await test('players are sorted by level without touching the store list', () => {
    const players = [ player(1, 1, 3), player(2, 2, 12), player(3, 1, 7) ];
    const sorted = display.sortSnowWarPlayersByLevel(players);

    assert.deepEqual([ ...sorted.map(entry => entry.userId) ], [ 2, 3, 1 ]);
    assert.deepEqual(players.map(entry => entry.userId), [ 1, 2, 3 ]);
});

await test('opening the games window asks for the directory and the account status', () => {
    viewCommands.openSnowWarGames(send);

    assert.equal(snowWarStore.getState().mainViewOpen, true);
    assert.deepEqual(sentNames(), [ 'Game2CheckGameDirectoryStatusComposer', 'Game2GetAccountGameStatusComposer' ]);
});

await test('closing the games window outside a lobby sends nothing', () => {
    viewCommands.openSnowWarGames(send);
    world.sent.length = 0;
    viewCommands.closeSnowWarGames(send);

    assert.equal(snowWarStore.getState().mainViewOpen, false);
    assert.deepEqual(sentNames(), []);
});

await test('closing the games window from a lobby leaves it', () => {
    snowWarStore.getState().setPhase(SnowWarPhase.Lobby);
    snowWarStore.getState().setMainViewOpen(true);
    viewCommands.closeSnowWarGames(send);

    assert.equal(snowWarStore.getState().mainViewOpen, false);
    assert.deepEqual(sentNames(), [ 'Game2LeaveGameComposer' ]);
    assert.equal(snowWarStore.getState().phase, SnowWarPhase.Inactive);
});

await test('the games button toggles the window', () => {
    viewCommands.toggleSnowWarGames(send);
    assert.equal(snowWarStore.getState().mainViewOpen, true);

    viewCommands.toggleSnowWarGames(send);
    assert.equal(snowWarStore.getState().mainViewOpen, false);
});

await test('the leaderboard window opens and closes', () => {
    viewCommands.openSnowWarLeaderboard();
    assert.equal(snowWarStore.getState().leaderboardOpen, true);

    viewCommands.closeSnowWarLeaderboard();
    assert.equal(snowWarStore.getState().leaderboardOpen, false);
});

await test('an error is shown once as an alert with its text', () => {
    snowWarStore.getState().setError({ kind: 'joining', reason: 8 });
    viewCommands.showSnowWarError({ kind: 'joining', reason: 8 });

    assert.deepEqual(world.alerts, [ [ '<generic.alert.title>', '<snowwar.error.no_free_games_left>' ] ]);
    assert.equal(snowWarStore.getState().error, undefined);
});

await test('a lobby row marks its own player in green and shows the level once ready', () => {
    const row = teamRows.snowWarLobbyRow(ROW_TEMPLATE, player(5, 2, 14), { own: true, ready: true, loadingFrame: 0, scoreLabel: 'SCORE:' });

    assert.equal(row.key, '5');
    assert.equal(row.from, ROW_TEMPLATE);
    assert.equal(row.bindings.playerImageBackground.asset, 'habbo-games-com-green_square');
    assert.equal(row.bindings.playerDataBackground.asset, 'habbo-games-com-red_infobox');
    assert.equal(row.bindings.playerScoreBackground.asset, 'habbo-games-com-red_ball');
    assert.equal(row.bindings.playerName.caption, 'p5');
    assert.equal(row.bindings.playerScore.caption, '14');
    assert.equal(row.bindings.playerScore.visible, true);
    assert.equal(row.bindings.playerStats.visible, false);
    assert.equal(row.bindings.playerTotalStats.visible, false);
    assert.equal(row.bindings.scoreTooltip.visible, true);
    assert.equal(row.bindings.scoreTooltip.tooltip, 'SCORE: 1400');
    assert.equal(row.bindings.skillLevel.children.props.level, 14);
    assert.equal(row.bindings.playerScoreContainer.children, false);
});

await test('a lobby row of a player still loading shows the waiting animation', () => {
    const row = teamRows.snowWarLobbyRow(ROW_TEMPLATE, player(6, 1, 2), { own: false, ready: false, loadingFrame: 3, scoreLabel: 'SCORE:' });

    assert.equal(row.bindings.playerImageBackground.asset, 'habbo-games-com-blue_square');
    assert.equal(row.bindings.playerScore.visible, false);
    assert.equal(row.bindings.playerScoreContainer.children.props.frame, 3);
});

await test('a result row shows hits, knock downs, score and the rematch ball', () => {
    const resultPlayer = { userId: 9, userName: 'neige', figure: 'hd-1', gender: 'F', score: 42, stats: { snowballHits: 7, kills: 2 } };
    let added = 0;
    const row = teamRows.snowWarResultRow(ROW_TEMPLATE, 1, resultPlayer, { rematch: true, canAddFriend: true, onAddFriend: () => added++ });

    assert.equal(row.key, '9');
    assert.equal(row.bindings.playerName.caption, 'neige');
    assert.equal(row.bindings.playerHits.caption, '7');
    assert.equal(row.bindings.playerKills.caption, '2');
    assert.equal(row.bindings.playerScore.caption, '42');
    assert.equal(row.bindings.playerScoreBackground.asset, 'habbo-games-com-blue_ball_rematch');
    assert.equal(row.bindings.playerStats.visible, true);
    assert.equal(row.bindings.playerTotalStats.visible, false);
    assert.equal(row.bindings.addFriend.visible, true);

    row.bindings.addFriend.onPointerTap();
    assert.equal(added, 1);
});

await test('a result row without rematch nor friend request', () => {
    const resultPlayer = { userId: 9, userName: 'neige', figure: 'hd-1', gender: 'F', score: 0, stats: { snowballHits: 0, kills: 0 } };
    const row = teamRows.snowWarResultRow(ROW_TEMPLATE, 2, resultPlayer, { rematch: false, canAddFriend: false, onAddFriend: () => undefined });

    assert.equal(row.bindings.playerScoreBackground.asset, 'habbo-games-com-red_ball');
    assert.equal(row.bindings.addFriend.visible, false);
});

const waitingBoard = (overrides = {}) => ({
    templates: {
        'habbo-games-com/snowwar_lobby_player_team_1': { name: 'team1' },
        'habbo-games-com/snowwar_lobby_player_team_2': { name: 'team2' },
    },
    players: [ player(1, 1, 3), player(2, 2, 12), player(3, 1, 9), player(4, 2, 1) ],
    ownUserId: 3,
    readyUserIds: [ 1, 3 ],
    loadingFrame: 2,
    fieldType: 9,
    arenaName: 'Montagne du Dragon',
    loadingText: 'En attente de joueurs',
    scoreLabel: 'SCORE:',
    title: undefined,
    onLeave: () => undefined,
    ...overrides,
});

await test('the waiting board puts each team in its column, highest level first', () => {
    const bindings = board.snowWarWaitingBindings(waitingBoard());
    const team1 = bindings.team1PlayersList.items;
    const team2 = bindings.team2PlayersList.items;

    assert.deepEqual([ ...team1.map(item => item.key) ], [ '3', '1' ]);
    assert.deepEqual([ ...team2.map(item => item.key) ], [ '2', '4' ]);
    assert.equal(team1[0].from.name, 'team1');
    assert.equal(team2[0].from.name, 'team2');
    assert.equal(team1[0].bindings.playerImageBackground.asset, 'habbo-games-com-green_square');
    assert.equal(team2[0].bindings.playerScore.visible, false);
    assert.equal(team1[1].bindings.playerScore.visible, true);
});

await test('the waiting board hides the results and shows the arena preview', () => {
    const bindings = board.snowWarWaitingBindings(waitingBoard());

    for (const name of [ 'team1ScoreContainer', 'team2ScoreContainer', 'mostKillsContainer', 'mostHitsContainer', 'statusContainer', 'buttonsContainer' ]) {
        assert.equal(bindings[name].visible, false, name);
    }

    assert.equal(bindings.headerContainer.visible, false);
    assert.equal(bindings.loadingContainer.visible, true);
    assert.equal(bindings.arenaPreview.asset, 'habbo-games-com-arena_9_preview');
    assert.equal(bindings.arenaName.caption, 'Montagne du Dragon');
    assert.equal(bindings.loadingText.caption, 'En attente de joueurs');
    assert.equal(bindings.mainLoadingIcon.asset, 'habbo-games-com-load_3');
});

await test('the waiting board shows a title for a rematch lobby and everyone as ready', () => {
    const bindings = board.snowWarWaitingBindings(waitingBoard({ title: '5 secondes avant la tempête!', readyUserIds: undefined }));

    assert.equal(bindings.headerContainer.visible, true);
    assert.equal(bindings.endingInformation.caption, '5 secondes avant la tempête!');
    assert.ok([ ...bindings.team1PlayersList.items, ...bindings.team2PlayersList.items ].every(item => item.bindings.playerScore.visible));
});

await test('the waiting board leave link calls back', () => {
    let left = 0;
    const bindings = board.snowWarWaitingBindings(waitingBoard({ onLeave: () => left++ }));

    bindings.leave_link_region.onPointerTap();
    assert.equal(left, 1);
});

await test('the waiting board is empty until the templates are loaded', () => {
    const bindings = board.snowWarWaitingBindings(waitingBoard({ templates: undefined }));

    assert.deepEqual([ ...bindings.team1PlayersList.items ], []);
    assert.deepEqual([ ...bindings.team2PlayersList.items ], []);
});

await test('the loading animation cycles through eight frames', () => {
    assert.equal(board.snowWarLoadingAssetAt(0), 'habbo-games-com-load_1');
    assert.equal(board.snowWarLoadingAssetAt(7), 'habbo-games-com-load_8');
    assert.equal(board.snowWarLoadingAssetAt(8), 'habbo-games-com-load_1');
});
