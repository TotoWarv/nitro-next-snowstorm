import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const packagesRoot = new URL('../packages/', import.meta.url);
const modules = new Map();

const sourceFor = (specifier) => {
    for (const candidate of [ `${specifier}.ts`, `${specifier}/index.ts` ]) {
        const url = new URL(candidate, packagesRoot);

        if (existsSync(url)) return url;
    }

    throw new Error(`Module not found: ${specifier}`);
};

const nitroApi = () => ({
    ...requireModule('nitro-api/src/room/object/data/GetObjectDataForFlags'),
});

const resolveSpecifier = (from, name) => {
    if (name === '@nitrodevco/nitro-api') return null;
    if (name.startsWith('#api/')) return `nitro-api/src/${name.slice(5)}`;
    if (name.startsWith('.')) return new URL(name, new URL(from, packagesRoot)).pathname.slice(packagesRoot.pathname.length);

    throw new Error(`Unexpected dependency ${name} in ${from}`);
};

const requireModule = (specifier) => {
    const url = sourceFor(specifier);
    const key = url.href;

    if (modules.has(key)) return modules.get(key);

    const relative = url.pathname.slice(packagesRoot.pathname.length);
    const source = readFileSync(url, 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};

    modules.set(key, exports);

    runInNewContext(outputText, {
        exports,
        TextDecoder,
        TextEncoder,
        require: (name) => {
            const target = resolveSpecifier(relative, name);

            return (target === null) ? nitroApi() : requireModule(target);
        },
    });

    return exports;
};

const packet = path => requireModule(`nitro-packets/src/${path}`);
const { BinaryReader } = requireModule('nitro-api/src/utils/BinaryReader');
const { BinaryWriter } = requireModule('nitro-api/src/utils/BinaryWriter');
const { EvaWireDataWrapper } = requireModule('nitro-api/src/communication/EvaWireDataWrapper');
const { SnowWarListLimits } = packet('incoming/Game/Snowwar/Data/SnowWarBoundedList');

const fixtureHex = name => readFileSync(new URL(`./fixtures/snowwar/${name}.hex`, import.meta.url), 'utf8').trim().toUpperCase();

const wrapperFor = (hex) => {
    const bytes = Uint8Array.from(Buffer.from(hex, 'hex'));

    return new EvaWireDataWrapper(0, new BinaryReader(bytes.buffer));
};

const plain = value => JSON.parse(JSON.stringify(value));

const parseHex = (Message, hex) => {
    const wrapper = wrapperFor(hex);
    const parsed = new Message().parse(wrapper);

    return { parsed, wrapper };
};

const parseFixture = (Message, name) => {
    const { parsed, wrapper } = parseHex(Message, fixtureHex(name));

    assert.equal(wrapper.bytesAvailable, false, `${name} left unread bytes`);

    return parsed;
};

const encode = (values) => {
    const writer = new BinaryWriter();

    for (const value of values) {
        switch (typeof value) {
            case 'number':
                assert.ok(Number.isInteger(value), `non-integer value ${value}`);
                writer.writeInt(value);
                break;
            case 'boolean':
                writer.writeByte(value ? 1 : 0);
                break;
            case 'string':
                if (value) writer.writeString(value, true);
                else writer.writeShort(0);
                break;
            default:
                assert.fail(`unexpected composed value ${String(value)}`);
        }
    }

    return Buffer.from(new Uint8Array(writer.getBuffer())).toString('hex').toUpperCase();
};

const int = value => (value >>> 0).toString(16).padStart(8, '0').toUpperCase();
const str = (value) => {
    const bytes = Buffer.from(value, 'utf8');

    return bytes.length.toString(16).padStart(4, '0').toUpperCase() + bytes.toString('hex').toUpperCase();
};

const ann = { userId: 4, name: 'Ann', figure: 'hd-180-1.ch-210-66', gender: 'F', teamId: 1, skillLevel: 3, totalScore: 120, scoreToNextLevel: 80 };
const bob = { userId: 9, name: 'Bob', figure: 'hd-190-2', gender: 'M', teamId: 2, skillLevel: 1, totalScore: 0, scoreToNextLevel: 50 };
const lobby = { gameId: 7, levelName: 'Île arctique', gameType: 0, fieldType: 8, numberOfTeams: 2, maximumPlayers: 8, owningPlayerName: 'Ann', levelEntryId: 8, players: [ ann, bob ] };
const annInArena = { referenceId: 20, userName: 'Ann', figure: 'hd-180-1', gender: 'F', teamId: 1 };
const bobInArena = { referenceId: 21, userName: 'Bob', figure: 'hd-190-2', gender: 'M', teamId: 2 };

const objects = [
    { type: 5, id: 20, variables: [ 9600, 6400, 0, 9600, 6400, 4, 2, 5, 0, 0, 0, 0, 0, 1, 0, 0, 0 ], strings: [ 'Ann', '', 'hd-180-1', 'F' ] },
    { type: 2, id: 3, variables: [ 1, 0, 3, 6, 0, 0, 0 ], strings: [] },
    { type: 1, id: 30, variables: [ 9600, 6400, 3200, 3, -2, 1, 20, 6, 10 ], strings: [] },
];

const events = [
    [
        { type: 2, fields: [ 20, 3200, 6400 ] },
        { type: 4, fields: [ 21, 9600, 3200, 1 ] },
    ],
    [],
    [
        { type: 11, fields: [ 5 ] },
        { type: 8, fields: [ 30, 20, 9600, 6400, 1 ] },
    ],
];

const entries = [
    { userId: 4, score: 50, rank: 1, name: 'Ann', figure: 'hd-180-1', gender: 'F' },
    { userId: 9, score: 20, rank: 2, name: 'Bob', figure: 'hd-190-2', gender: 'M' },
];

const week = { year: 2026, week: 42, maxOffset: 2, currentOffset: 0, minutesUntilReset: 600 };

const stats = (score, kills, deaths, snowballHits, snowballHitsTaken, snowballsThrown, snowballsCreated, snowballsFromMachine, friendlyHits, friendlyKills) => ({
    score, kills, deaths, snowballHits, snowballHitsTaken, snowballsThrown, snowballsCreated, snowballsFromMachine, friendlyHits, friendlyKills,
});

const incomingCase = (path, fixture, expected) => ({ path, fixture, expected });

const incomingCases = [
    incomingCase('Game/Directory/Game2AccountGameStatusMessage', 'Game2AccountGameStatusMessageComposer', { gameTypeId: 0, freeGamesLeft: -1, gamesPlayedTotal: 12 }),
    incomingCase('Game/Directory/Game2GameCancelledMessage', 'Game2GameCancelledMessageComposer', {}),
    incomingCase('Game/Directory/Game2GameCreatedMessage', 'Game2GameCreatedMessageComposer', { lobby }),
    incomingCase('Game/Directory/Game2GameDirectoryStatusMessage', 'Game2GameDirectoryStatusMessageComposer', { status: 0, blockLength: 180, gamesPlayed: 4, freeGamesLeft: -1 }),
    incomingCase('Game/Directory/Game2GameLongDataMessage', 'Game2GameLongDataMessageComposer', { lobby }),
    incomingCase('Game/Directory/Game2GameNotFoundMessage', 'Game2GameNotFoundMessageComposer', {}),
    incomingCase('Game/Directory/Game2GameStartedMessage', 'Game2GameStartedMessageComposer', { lobby }),
    incomingCase('Game/Directory/Game2InArenaQueueMessage', 'Game2InArenaQueueMessageComposer', { position: 3 }),
    incomingCase('Game/Directory/Game2JoiningGameFailedMessage', 'Game2JoiningGameFailedMessageComposer', { reason: 6 }),
    incomingCase('Game/Directory/Game2StartCounterMessage', 'Game2StartCounterMessageComposer', { countDownLength: 15 }),
    incomingCase('Game/Directory/Game2StartingGameFailedMessage', 'Game2StartingGameFailedMessageComposer', { reason: 1 }),
    incomingCase('Game/Directory/Game2StopCounterMessage', 'Game2StopCounterMessageComposer', { position: 0 }),
    incomingCase('Game/Directory/Game2UserBlockedMessage', 'Game2UserBlockedMessageComposer', { playerBlockLength: 180 }),
    incomingCase('Game/Directory/Game2UserJoinedGameMessage', 'Game2UserJoinedGameMessageComposer', { player: bob, wasTeamSwitched: true }),
    incomingCase('Game/Directory/Game2UserLeftGameMessage', 'Game2UserLeftGameMessageComposer', { userId: 9 }),
    incomingCase('Game/Snowwar/Arena/Game2ArenaEnteredMessage', 'Game2ArenaEnteredMessageComposer', { player: annInArena }),
    incomingCase('Game/Snowwar/Arena/Game2EnterArenaFailedMessage', 'Game2EnterArenaFailedMessageComposer', { reason: 1 }),
    incomingCase('Game/Snowwar/Arena/Game2GameChatFromPlayerMessage', 'Game2GameChatFromPlayerMessageComposer', { userId: 4, message: 'salut à tous' }),
    incomingCase('Game/Snowwar/Arena/Game2GameEndingMessage', 'Game2GameEndingMessageComposer', {
        timeToNextState: 30,
        isDeathMatch: false,
        resultType: 1,
        winnerId: 1,
        teams: [
            { teamId: 1, score: 6, players: [ { userName: 'Ann', userId: 4, figure: 'hd-180-1', gender: 'F', score: 6, stats: stats(6, 1, 0, 1, 0, 2, 1, 0, 0, 0) } ] },
            { teamId: 2, score: 0, players: [ { userName: 'Bob', userId: 9, figure: 'hd-190-2', gender: 'M', score: 0, stats: stats(0, 0, 1, 0, 1, 3, 2, 1, 0, 0) } ] },
        ],
        playerWithMostKills: 4,
        playerWithMostHits: 4,
    }),
    incomingCase('Game/Snowwar/Arena/Game2GameRejoinMessage', 'Game2GameRejoinMessageComposer', { roomId: 1234 }),
    incomingCase('Game/Snowwar/Arena/Game2PlayerExitedGameArenaMessage', 'Game2PlayerExitedGameArenaMessageComposer', { userId: 9, playerGameObjectId: 21 }),
    incomingCase('Game/Snowwar/Arena/Game2PlayerRematchesMessage', 'Game2PlayerRematchesMessageComposer', { userId: 4 }),
    incomingCase('Game/Snowwar/Arena/Game2StageEndingMessage', 'Game2StageEndingMessageComposer', { timeToNextState: 5 }),
    incomingCase('Game/Snowwar/Arena/Game2StageLoadMessage', 'Game2StageLoadMessageComposer', { gameType: 0 }),
    incomingCase('Game/Snowwar/Arena/Game2StageRunningMessage', 'Game2StageRunningMessageComposer', { timeToStageEnd: 180 }),
    incomingCase('Game/Snowwar/Arena/Game2StageStartingMessage', 'Game2StageStartingMessageComposer', { gameType: 0, roomType: 'snowwar', countDown: 5, objects }),
    incomingCase('Game/Snowwar/Arena/Game2StageStillLoadingMessage', 'Game2StageStillLoadingMessageComposer', { percentage: 50, finishedUserIds: [ 4, 9 ] }),
    incomingCase('Game/Snowwar/Ingame/Game2GameStatusMessage', 'Game2GameStatusMessageComposer', { turn: 9, checksum: -77, events }),
    incomingCase('Game/Snowwar/Ingame/Game2FullGameStatusMessage', 'Game2FullGameStatusMessageComposer', {
        unusedLeadingValue: 0, remainingSeconds: 170, durationSeconds: 180, objects, unusedValueBeforeTeams: 0, numberOfTeams: 2, turn: 9, checksum: -77, events,
    }),
    incomingCase('Game/Score/Game2TotalLeaderboardMessage', 'Game2TotalLeaderboardMessageComposer', { entries, totalListSize: 9, gameTypeId: 0 }),
    incomingCase('Game/Score/Game2FriendsLeaderboardMessage', 'Game2FriendsLeaderboardMessageComposer', { entries, totalListSize: 9, gameTypeId: 0 }),
    incomingCase('Game/Score/Game2TotalGroupLeaderboardMessage', 'Game2TotalGroupLeaderboardMessageComposer', { entries, totalListSize: 9, gameTypeId: 0, favouriteGroupId: 3 }),
    incomingCase('Game/Score/Game2WeeklyLeaderboardMessage', 'Game2WeeklyLeaderboardMessageComposer', { ...week, entries, totalListSize: 9, gameTypeId: 0 }),
    incomingCase('Game/Score/Game2WeeklyFriendsLeaderboardMessage', 'Game2WeeklyFriendsLeaderboardMessageComposer', { ...week, entries, totalListSize: 9, gameTypeId: 0 }),
    incomingCase('Game/Score/Game2WeeklyGroupLeaderboardMessage', 'Game2WeeklyGroupLeaderboardMessageComposer', { ...week, entries, totalListSize: 9, gameTypeId: 0, favouriteGroupId: 3 }),
    incomingCase('Catalog/SnowWarGameTokensMessage', 'SnowWarGameTokensMessageComposer', {
        offers: [ { offerId: 2, localizationId: 'GET_SNOWWAR_TOKENS', priceInCredits: 10, priceInActivityPoints: 0, activityPointType: 0 } ],
    }),
];

const classNameOf = path => path.split('/').pop();

for (const { path, fixture, expected } of incomingCases) {
    await test(`${classNameOf(path)} reads every field of ${fixture}`, () => {
        const Message = packet(`incoming/${path}`)[classNameOf(path)];

        assert.deepEqual(plain(parseFixture(Message, fixture)), expected);
    });
}

await test('Game2EnterArenaMessage reads the players and the level with its legacy and map stuff data', () => {
    const { Game2EnterArenaMessage } = packet('incoming/Game/Snowwar/Arena/Game2EnterArenaMessage');
    const parsed = parseFixture(Game2EnterArenaMessage, 'Game2EnterArenaMessageComposer');
    const { level } = parsed;
    const [ tree, backdrop ] = level.fuseObjects;
    const withoutStuff = ({ stuffData: _stuffData, ...rest }) => rest;

    assert.deepEqual(plain({ ...parsed, level: undefined }), { gameType: 0, fieldType: 8, numberOfTeams: 2, players: [ annInArena, bobInArena ] });
    assert.deepEqual([ level.width, level.height, level.heightMap ], [ 3, 2, '000\r0x0' ]);
    assert.equal(level.fuseObjects.length, 2);
    assert.deepEqual(withoutStuff(tree), { name: 'snst_tree1', id: 1, x: 1, y: 0, xDimension: 1, yDimension: 1, height: 3200, direction: 2, altitude: 1440, canStandOn: false });
    assert.deepEqual(withoutStuff(backdrop), { name: 'ads_background', id: 2, x: 0, y: 0, xDimension: 1, yDimension: 1, height: 0, direction: 1, altitude: 0, canStandOn: true });
    assert.equal(tree.stuffData.constructor.name, 'LegacyDataType');
    assert.equal(tree.stuffData.getLegacyString(), '0');
    assert.equal(backdrop.stuffData.constructor.name, 'MapDataType');
    assert.equal(backdrop.stuffData.getValue('imageUrl'), '/cms/flash-files/c_images/snowwar/bg.png');
});

const outgoingCase = (path, fixture, params) => ({ path, fixture, params });

const outgoingCases = [
    outgoingCase('Game/Directory/Game2CheckGameDirectoryStatusComposer', 'Game2CheckGameDirectoryStatusMessageEvent', {}),
    outgoingCase('Game/Directory/Game2GetAccountGameStatusComposer', 'Game2GetAccountGameStatusMessageEvent', { gameTypeId: 0 }),
    outgoingCase('Game/Directory/Game2LeaveGameComposer', 'Game2LeaveGameMessageEvent', {}),
    outgoingCase('Game/Directory/Game2QuickJoinGameComposer', 'Game2QuickJoinGameMessageEvent', {}),
    outgoingCase('Game/Arena/Game2ExitGameComposer', 'Game2ExitGameMessageEvent', { exitToRoomBeforeGame: true }),
    outgoingCase('Game/Arena/Game2GameChatComposer', 'Game2GameChatMessageEvent', { message: 'salut à tous' }),
    outgoingCase('Game/Arena/Game2LoadStageReadyComposer', 'Game2LoadStageReadyMessageEvent', { percentage: 100 }),
    outgoingCase('Game/Arena/Game2PlayAgainComposer', 'Game2PlayAgainMessageEvent', {}),
    outgoingCase('Game/Ingame/Game2MakeSnowballComposer', 'Game2MakeSnowballMessageEvent', { turn: 7, subturn: 2 }),
    outgoingCase('Game/Ingame/Game2RequestFullStatusUpdateComposer', 'Game2RequestFullStatusUpdateMessageEvent', { reason: 1 }),
    outgoingCase('Game/Ingame/Game2SetUserMoveTargetComposer', 'Game2SetUserMoveTargetMessageEvent', { x: 3200, y: 6400, turn: 7, subturn: 2 }),
    outgoingCase('Game/Ingame/Game2ThrowSnowballAtHumanComposer', 'Game2ThrowSnowballAtHumanMessageEvent', { targetHumanId: 21, trajectory: 3, turn: 7, subturn: 2 }),
    outgoingCase('Game/Ingame/Game2ThrowSnowballAtPositionComposer', 'Game2ThrowSnowballAtPositionMessageEvent', { x: 9600, y: 3200, trajectory: 1, turn: 7, subturn: 2 }),
    outgoingCase('Game/Score/Game2GetTotalLeaderboardComposer', 'Game2GetTotalLeaderboardMessageEvent', { gameTypeId: 0, startRank: -1, direction: 0, viewSize: 8, windowSize: 50 }),
    outgoingCase('Game/Score/Game2GetFriendsLeaderboardComposer', 'Game2GetFriendsLeaderboardMessageEvent', { gameTypeId: 0, startRank: 1, direction: 1, viewSize: 8, windowSize: 50 }),
    outgoingCase('Game/Score/Game2GetTotalGroupLeaderboardComposer', 'Game2GetTotalGroupLeaderboardMessageEvent', { gameTypeId: 0, startRank: 5, direction: 1, viewSize: 8, windowSize: 50 }),
    outgoingCase('Game/Score/Game2GetWeeklyLeaderboardComposer', 'Game2GetWeeklyLeaderboardMessageEvent', { gameTypeId: 0, weekOffset: 1, startRank: -1, direction: 0, viewSize: 8, windowSize: 50 }),
    outgoingCase('Game/Score/Game2GetWeeklyFriendsLeaderboardComposer', 'Game2GetWeeklyFriendsLeaderboardMessageEvent', { gameTypeId: 0, weekOffset: 0, startRank: 1, direction: 0, viewSize: 8, windowSize: 50 }),
    outgoingCase('Game/Score/Game2GetWeeklyGroupLeaderboardComposer', 'Game2GetWeeklyGroupLeaderboardMessageEvent', { gameTypeId: 0, weekOffset: 1, startRank: 5, direction: 1, viewSize: 8, windowSize: 50 }),
];

for (const { path, fixture, params } of outgoingCases) {
    await test(`${classNameOf(path)} writes exactly the bytes of ${fixture}`, () => {
        const Composer = packet(`outgoing/${path}`)[classNameOf(path)];

        assert.equal(encode(new Composer(params).compose()), fixtureHex(fixture));
    });
}

const { Game2GameStatusMessage } = packet('incoming/Game/Snowwar/Ingame/Game2GameStatusMessage');
const { Game2StageStartingMessage } = packet('incoming/Game/Snowwar/Arena/Game2StageStartingMessage');
const { Game2StageStillLoadingMessage } = packet('incoming/Game/Snowwar/Arena/Game2StageStillLoadingMessage');
const { Game2GameCreatedMessage } = packet('incoming/Game/Directory/Game2GameCreatedMessage');
const { Game2TotalLeaderboardMessage } = packet('incoming/Game/Score/Game2TotalLeaderboardMessage');
const { Game2EnterArenaMessage } = packet('incoming/Game/Snowwar/Arena/Game2EnterArenaMessage');

const { Game2FullGameStatusMessage } = packet('incoming/Game/Snowwar/Ingame/Game2FullGameStatusMessage');
const { Game2GameChatFromPlayerMessage } = packet('incoming/Game/Snowwar/Arena/Game2GameChatFromPlayerMessage');

const tree = [ 2, 3, 1, 0, 3, 6, 0, 0, 0 ].map(int).join('');
const malformed = /SnowWar/;

const rejects = (Message, hex) => {
    let produced;

    assert.throws(() => {
        produced = new Message().parse(wrapperFor(hex));
    });

    assert.equal(produced, undefined);
};

await test('a negative subturn count rejects the status', () => {
    assert.throws(() => new Game2GameStatusMessage().parse(wrapperFor(int(9) + int(-77) + int(-1))), malformed);
});

await test('a negative event count rejects the status', () => {
    assert.throws(() => new Game2GameStatusMessage().parse(wrapperFor(int(9) + int(-77) + int(2) + int(-4) + int(1) + int(11) + int(5))), malformed);
});

await test('a subturn or event count above its limit rejects the status', () => {
    assert.throws(() => new Game2GameStatusMessage().parse(wrapperFor(int(9) + int(-77) + int(0x7FFFFFFF))), malformed);
    assert.throws(() => new Game2GameStatusMessage().parse(wrapperFor(int(9) + int(-77) + int(3) + int(0x7FFFFFFF))), malformed);
});

await test('an object count above its limit never yields a turn or checksum read from shifted bytes', () => {
    const shifted = int(0) + int(170) + int(180) + int(0x7FFFFFFF) + tree + int(0) + int(2) + int(9) + int(-77) + int(0);

    rejects(Game2FullGameStatusMessage, shifted);
});

await test('fewer subturns than announced reject the status', () => {
    assert.throws(() => new Game2GameStatusMessage().parse(wrapperFor(int(9) + int(-77) + int(3) + int(1) + int(7) + int(20))), malformed);
});

await test('an unknown event type rejects the status', () => {
    rejects(Game2GameStatusMessage, int(9) + int(-77) + int(3) + int(2) + int(7) + int(20) + int(55) + int(1) + int(2) + int(0) + int(0));
});

await test('an object count above its limit rejects the stage start', () => {
    rejects(Game2StageStartingMessage, int(0) + str('snowwar') + int(5) + int(0x7FFFFFFF) + tree);
});

await test('a negative object count rejects the stage start', () => {
    rejects(Game2StageStartingMessage, int(0) + str('snowwar') + int(5) + int(-3));
});

await test('fewer objects than announced reject the stage start', () => {
    assert.throws(() => new Game2StageStartingMessage().parse(wrapperFor(int(0) + str('snowwar') + int(5) + int(4) + tree)), malformed);
});

await test('an object cut in the middle of its variables rejects the stage start', () => {
    rejects(Game2StageStartingMessage, int(0) + str('snowwar') + int(5) + int(1) + tree.slice(0, 8 * 5));
});

await test('a human cut in the middle of a string rejects the stage start', () => {
    const human = [ 5, 20, ...objects[0].variables ].map(int).join('') + str('Ann') + str('') + str('hd-180-1');

    rejects(Game2StageStartingMessage, int(0) + str('snowwar') + int(5) + int(1) + human + '0001');
    rejects(Game2StageStartingMessage, int(0) + str('snowwar') + int(5) + int(1) + human + '000546');
});

await test('an unknown object type rejects the stage start', () => {
    rejects(Game2StageStartingMessage, int(0) + str('snowwar') + int(5) + int(3) + tree + int(42) + int(1) + int(2));
});

await test('an event cut in the middle of its fields rejects the status', () => {
    rejects(Game2GameStatusMessage, int(9) + int(-77) + int(1) + int(1) + int(8) + int(30) + int(20));
});

await test('a count above the list limit is rejected, a count at the limit is read', () => {
    const count = SnowWarListLimits.players + 1;
    const ids = Array.from({ length: count }, (_, index) => int(index)).join('');

    rejects(Game2StageStillLoadingMessage, int(50) + int(count) + ids);

    const atLimit = parseHex(Game2StageStillLoadingMessage, int(50) + int(SnowWarListLimits.players) + ids.slice(0, 8 * SnowWarListLimits.players));

    assert.equal(atLimit.parsed.finishedUserIds.length, SnowWarListLimits.players);
    assert.equal(atLimit.wrapper.bytesAvailable, false);
});

await test('negative or huge counts in lobby, leaderboard and level lists reject the packet', () => {
    rejects(Game2GameCreatedMessage, int(7) + str('a') + int(0) + int(8) + int(2) + int(8) + str('Ann') + int(8) + int(-1));
    rejects(Game2TotalLeaderboardMessage, int(0x7FFFFFFF) + int(9) + int(0));
    rejects(Game2EnterArenaMessage, int(0) + int(8) + int(2) + int(-5) + int(3) + int(2) + str('000\r000') + int(0));
    rejects(Game2EnterArenaMessage, int(0) + int(8) + int(2) + int(0) + int(3) + int(2) + str('000\r000') + int(-9));
});

await test('fewer leaderboard entries than announced reject the leaderboard', () => {
    rejects(Game2TotalLeaderboardMessage, int(2) + int(4) + int(50) + int(1) + str('Ann') + str('hd') + str('F'));
});

await test('a chat line cut in the middle of its text is rejected', () => {
    rejects(Game2GameChatFromPlayerMessage, int(4) + '000D' + Buffer.from('salut').toString('hex'));
});

await test('empty lists are read as empty', () => {
    const { parsed, wrapper } = parseHex(Game2GameStatusMessage, int(9) + int(-77) + int(3) + int(0) + int(0) + int(0));

    assert.deepEqual(plain(parsed), { turn: 9, checksum: -77, events: [ [], [], [] ] });
    assert.equal(wrapper.bytesAvailable, false);
});
