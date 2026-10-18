import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const packagesRoot = new URL('../packages/', import.meta.url);
const nodeRequire = createRequire(new URL('../packages/nitro-react/package.json', import.meta.url));
const ARENA_ROOM_ID = 0x7FFF5357;
const OWN_USER_ID = 1;

const sourceFor = (specifier) => {
    for (const candidate of [ `${specifier}.ts`, `${specifier}/index.ts` ]) {
        const url = new URL(candidate, packagesRoot);

        if (existsSync(url)) return url;
    }

    throw new Error(`Module not found: ${specifier}`);
};

const recorder = () => {
    const calls = [];
    const named = name => (...args) => {
        calls.push([ name, ...args ]);

        return true;
    };

    return { calls, named };
};

const clock = { now: 1000000 };

class FakeDate extends Date {
    static now() {
        return clock.now;
    }
}

const fakeSessionStorage = (() => {
    const values = new Map();

    return {
        values,
        getItem: key => (values.has(key) ? values.get(key) : null),
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key),
    };
})();

const world = {
    failCreateRoom: false,
    logged: [],
    intervals: [],
    sent: [],
    navigations: [],
    engineCalls: [],
    room: undefined,
    shownRoom: undefined,
    landingVisible: [],
    sounds: [],
    timers: [],
    fakeObjects: new Map(),
};

const composerClass = name => class {
    constructor(params) {
        this.name = name;
        this.params = params;
    }
};

const packetClasses = new Map();
const packetStub = new Proxy({}, {
    get: (_target, name) => {
        if (typeof name !== 'string') return undefined;

        if (!packetClasses.has(name)) {
            const Packet = composerClass(name);

            Object.defineProperty(Packet, 'name', { value: name });
            packetClasses.set(name, Packet);
        }

        return packetClasses.get(name);
    },
});

class Vector3d {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

const fakeRoomObject = (id, category) => {
    const key = `${category}:${id}`;
    const object = { id, category, locations: [], setLocation: location => object.locations.push(location) };

    world.fakeObjects.set(key, object);

    return object;
};

const fakeRoom = (roomId) => {
    const { calls, named } = recorder();
    const room = new Proxy({ roomId, calls }, {
        get: (target, name) => {
            if (name in target) return target[name];
            if (name === 'canvas' || name === 'then') return undefined;
            if (name === 'createRoomObjectAndInitalize') return (id, type, category) => {
                calls.push([ name, id, type, category ]);

                return fakeRoomObject(id, category);
            };
            if (name === 'getRoomObject') return (id, category) => world.fakeObjects.get(`${category}:${id}`);
            if (name === 'removeRoomObject') return (id, category) => {
                calls.push([ name, id, category ]);
                world.fakeObjects.delete(`${category}:${id}`);
            };

            return named(String(name));
        },
    });

    return room;
};

const roomEngine = {
    createRoom: (roomId) => {
        world.engineCalls.push([ 'createRoom', roomId ]);

        if (world.failCreateRoom) throw new Error('the arena could not be built');

        world.room = fakeRoom(roomId);

        return world.room;
    },
    disposeRoom: roomId => world.engineCalls.push([ 'disposeRoom', roomId ]),
    setRoomGameMode: (roomId, flag) => world.engineCalls.push([ 'setRoomGameMode', roomId, flag ]),
    setRoomGameInputHandler: (roomId, handler) => world.engineCalls.push([ 'setRoomGameInputHandler', roomId, handler ]),
};

const genericClass = () => new Proxy(class {}, {
    construct: () => new Proxy({}, { get: (_target, name) => ((name === 'getMapData') ? () => ({ map: true }) : () => undefined) }),
});

const rendererStub = {
    GetRoomEngine: () => roomEngine,
    RoomPlaneParser: genericClass(),
};

const enumProxy = prefix => new Proxy({}, { get: (_target, name) => `${prefix}.${String(name)}` });

const NitroLogger = {
    error: (...args) => world.logged.push([ 'error', ...args ]),
    warn: (...args) => world.logged.push([ 'warn', ...args ]),
    log: () => undefined,
};

const apiStub = new Proxy({ Vector3d, NitroLogger }, {
    get: (target, name) => {
        if (name in target) return target[name];
        if (typeof name !== 'string') return undefined;

        return enumProxy(name);
    },
});

let currentRoom = { roomId: 123 };
const roomState = {
    get room() {
        return currentRoom;
    },
    setRoom: (room) => {
        world.shownRoom = room;
        currentRoom = room;
    },
    setIsPlayingGame: flag => world.engineCalls.push([ 'setIsPlayingGame', flag ]),
};

const roomContextStub = {
    roomStore: { getState: () => roomState },
    getRoom: () => currentRoom,
};

const systemContextStub = {
    systemStore: {
        getState: () => ({
            setLandingViewVisible: flag => world.landingVisible.push(flag),
            endRoomSession: () => world.navigations.push([ 'endRoomSession' ]),
        }),
    },
};

const userContextStub = { userStore: { getState: () => ({ userId: OWN_USER_ID }) } };

const soundStub = {
    GetSoundManager: () => ({
        playSound: (id, loops) => world.sounds.push([ 'play', id, loops ]),
        stopSound: id => world.sounds.push([ 'stop', id ]),
    }),
    HabboSoundTypesEnum: {
        SOUND_CALL_FOR_HELP: 'HBST_call_for_help',
        GAMES_SW_GET_SNOWBALL: 'HBSTG_snowwar_get_snowball',
        GAMES_SW_HIT1: 'HBSTG_snowwar_hit1',
        GAMES_SW_HIT3: 'HBSTG_snowwar_hit3',
        GAMES_SW_MAKE_SNOWBALL: 'HBSTG_snowwar_make_snowball',
        GAMES_SW_MISS: 'HBSTG_snowwar_miss',
        GAMES_SW_THROW: 'HBSTG_snowwar_throw',
        GAMES_SW_WALK: 'HBSTG_snowwar_walk',
        GAMES_IG_COUNTDOWN: 'HBSTG_ig_countdown',
    },
};

const utilsStub = { buildRoomWallGeometry: () => ({ wallGeometry: true }) };

const modules = new Map();
let commandsModule;

const commandsStub = () => {
    commandsModule ??= {
        ...requireModule('nitro-react/src/commands/snowWarCommands'),
        goToRoom: (send, roomId) => {
            world.navigations.push([ 'goToRoom', roomId ]);
            send(new packetStub.OpenFlatConnectionComposer({ roomId, password: '', unknown1: -1 }));
        },
    };

    return commandsModule;
};

const packetsApi = () => requireModule('nitro-api/src/room/object/data/GetObjectDataForFlags');

const resolveSpecifier = (from, name) => {
    if (name.startsWith('.')) return { path: new URL(name, new URL(from, packagesRoot)).pathname.slice(packagesRoot.pathname.length) };

    if (from.startsWith('nitro-packets/') || from.startsWith('nitro-api/')) {
        if (name === '@nitrodevco/nitro-api') return { value: packetsApi() };
        if (name.startsWith('#api/')) return { path: `nitro-api/src/${name.slice(5)}` };
    }

    switch (name) {
        case '@nitrodevco/nitro-packets': return { value: packetStub };
        case '@nitrodevco/nitro-api': return { value: apiStub };
        case '@nitrodevco/nitro-renderer': return { value: rendererStub };
        case '#base/context/room': return { value: roomContextStub };
        case '#base/context/system': return { value: systemContextStub };
        case '#base/context/user': return { value: userContextStub };
        case '#base/sound': return { value: soundStub };
        case '#base/utils': return { value: utilsStub };
        case '#base/commands': return { value: commandsStub() };
        case '#base/context/communication': return { value: {} };
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
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};

    modules.set(key, exports);

    runInNewContext(outputText, {
        exports,
        Date: FakeDate,
        sessionStorage: fakeSessionStorage,
        setInterval: (callback, delay) => {
            const interval = { callback, delay, cleared: false };

            world.intervals.push(interval);

            return interval;
        },
        clearInterval: (interval) => {
            if (interval) interval.cleared = true;
        },
        TextDecoder,
        TextEncoder,
        setTimeout: (callback, delay) => {
            world.timers.push({ callback, delay });

            return world.timers.length;
        },
        clearTimeout: () => undefined,
        require: (name) => {
            const target = resolveSpecifier(relative, name);

            return ('value' in target) ? target.value : requireModule(target.path);
        },
    });

    return exports;
}

const { BinaryReader } = requireModule('nitro-api/src/utils/BinaryReader');
const { EvaWireDataWrapper } = requireModule('nitro-api/src/communication/EvaWireDataWrapper');
const parser = (path, className) => requireModule(`nitro-packets/src/incoming/${path}`)[className];

const fixtureHex = name => readFileSync(new URL(`./fixtures/snowwar/${name}.hex`, import.meta.url), 'utf8').trim();
const parseFixture = (path, className, fixture) => new (parser(path, className))().parse(new EvaWireDataWrapper(0, new BinaryReader(Uint8Array.from(Buffer.from(fixtureHex(fixture), 'hex')).buffer)));
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/snowwar/${name}`, import.meta.url), 'utf8'));
const scenario = fixture('scenario-1.json');
const recording = fixture('scenario-1.checksums.json');
const plain = value => JSON.parse(JSON.stringify(value));

const ARENA_FURNI = {
    snst_block1: [ 1, 1, 1440 ],
    snst_iceblock: [ 1, 1, 1760 ],
    snst_tree1: [ 1, 1, 3200 ],
    snst_tree1_d: [ 1, 1, 3200 ],
    snst_fence: [ 1, 2, 960 ],
    snst_ballpile: [ 1, 1, 320 ],
    s_snowball_machine: [ 1, 1, 1600 ],
    ads_igorraygun: [ 1, 2, 1600 ],
    xm09_man_a: [ 1, 1, 1280 ],
};

const levelOf = ({ width, height, heightMap, objects }) => ({
    width,
    height,
    heightMap: heightMap.join('\r'),
    fuseObjects: objects.map((object, index) => {
        const [ xDimension, yDimension, objectHeight ] = ARENA_FURNI[object.name];

        return { name: object.name, id: index + 1, x: object.x, y: object.y, xDimension, yDimension, height: objectHeight, direction: object.direction, altitude: object.altitude, canStandOn: false, stuffData: { state: '0' } };
    }),
});

const enterArena = () => ({
    gameType: 0,
    fieldType: scenario.level.fieldType,
    numberOfTeams: 2,
    players: scenario.humans.map(human => ({ referenceId: human.userId, userName: human.name, figure: human.figure, gender: human.gender, teamId: human.team })),
    level: levelOf(scenario.level),
});

const eventsOf = subturns => subturns.map(events => events.map(([ type, ...fields ]) => ({ type, fields })));
const statusOf = turn => ({ turn: turn.turn, checksum: turn.checksum, events: eventsOf(turn.events) });

const { snowWarStore, SnowWarPhase } = requireModule('nitro-react/src/context/snowwar');
const { registerSnowWarHandlers } = requireModule('nitro-react/src/handlers/snowwar');
const { SnowWarEngine, getSnowWarMatch } = requireModule('nitro-react/src/snowwar');
const commands = commandsStub();

const listeners = new Map();
const socket = {
    subscribe: (event, handler) => {
        listeners.set(event.name, handler);

        return () => listeners.delete(event.name);
    },
    send: (...packets) => {
        for (const packet of packets) world.sent.push(packet);
    },
};

registerSnowWarHandlers(socket);

const emit = (name, data) => {
    const handler = listeners.get(name);

    assert.ok(handler, `no handler for ${name}`);
    handler(data);
};

const sentNamed = name => world.sent.filter(packet => packet.name === name);
const state = () => snowWarStore.getState();

const resetWorld = () => {
    world.sent.length = 0;
    world.navigations.length = 0;
    world.engineCalls.length = 0;
    world.landingVisible.length = 0;
    world.sounds.length = 0;
    world.timers.length = 0;
    world.intervals.length = 0;
    world.logged.length = 0;
    world.failCreateRoom = false;
    fakeSessionStorage.values.clear();
    world.fakeObjects.clear();
    world.room = undefined;
    world.shownRoom = undefined;
    currentRoom = { roomId: 123 };
};

const startGame = () => {
    resetWorld();
    emit('Game2GameCancelledMessage', {});
    resetWorld();
    emit('Game2GameCreatedMessage', parseFixture('Game/Directory/Game2GameCreatedMessage', 'Game2GameCreatedMessage', 'Game2GameCreatedMessageComposer'));
    emit('Game2GameStartedMessage', parseFixture('Game/Directory/Game2GameStartedMessage', 'Game2GameStartedMessage', 'Game2GameStartedMessageComposer'));
    emit('Game2EnterArenaMessage', enterArena());
    emit('Game2StageLoadMessage', { gameType: 0 });
    emit('Game2StageStartingMessage', { gameType: 0, roomType: 'snowwar', countDown: 5, objects: plain(recording.initialObjects) });
    emit('Game2StageRunningMessage', { timeToStageEnd: 180 });
};

const drain = () => {
    for (let guard = 0; (guard < 5000) && (getSnowWarMatch()?.engine.pendingSubturns > 0); guard++) {
        clock.now += 50;
        getSnowWarMatch().tick();
    }
};

const playTurns = (from, to) => {
    for (const turn of recording.turns.slice(from, to)) emit('Game2GameStatusMessage', statusOf(turn));

    drain();
};

const referenceEngineAt = (turn) => {
    const engine = new SnowWarEngine(levelOf(scenario.level), { snowballThrown() {}, humanHit() {}, snowballLanded() {}, snowballPicked() {}, snowballMakingStarted() {}, rayGunFired() {} }, OWN_USER_ID);

    engine.applyStageStarting({ gameType: 0, roomType: 'snowwar', countDown: 5, objects: plain(recording.initialObjects) });

    for (const recorded of recording.turns.slice(0, turn + 1)) assert.equal(engine.applyGameStatus(statusOf(recorded)), 'applied');

    return engine;
};

await test('parsed lobby, loading and game messages move the store through every phase', () => {
    resetWorld();
    emit('Game2GameCancelledMessage', {});
    assert.equal(state().phase, SnowWarPhase.Inactive);

    const created = parseFixture('Game/Directory/Game2GameCreatedMessage', 'Game2GameCreatedMessage', 'Game2GameCreatedMessageComposer');

    emit('Game2GameCreatedMessage', created);
    assert.equal(state().phase, SnowWarPhase.Lobby);
    assert.equal(state().lobby.gameId, created.lobby.gameId);

    const joined = parseFixture('Game/Directory/Game2UserJoinedGameMessage', 'Game2UserJoinedGameMessage', 'Game2UserJoinedGameMessageComposer');

    emit('Game2UserJoinedGameMessage', joined);
    assert.ok(state().lobby.players.some(player => player.userId === joined.player.userId));

    emit('Game2StartCounterMessage', parseFixture('Game/Directory/Game2StartCounterMessage', 'Game2StartCounterMessage', 'Game2StartCounterMessageComposer'));
    assert.ok(state().counter);

    emit('Game2StopCounterMessage', parseFixture('Game/Directory/Game2StopCounterMessage', 'Game2StopCounterMessage', 'Game2StopCounterMessageComposer'));
    assert.equal(state().counter, undefined);

    emit('Game2UserLeftGameMessage', { userId: joined.player.userId });
    assert.ok(!state().lobby.players.some(player => player.userId === joined.player.userId));

    emit('Game2GameStartedMessage', parseFixture('Game/Directory/Game2GameStartedMessage', 'Game2GameStartedMessage', 'Game2GameStartedMessageComposer'));
    assert.equal(state().phase, SnowWarPhase.Loading);

    emit('Game2EnterArenaMessage', enterArena());
    assert.equal(sentNamed('QuitComposer').length, 1, 'the room the player stood in is left');
    assert.equal(state().arenaPlayers.length, 4);

    emit('Game2ArenaEnteredMessage', parseFixture('Game/Snowwar/Arena/Game2ArenaEnteredMessage', 'Game2ArenaEnteredMessage', 'Game2ArenaEnteredMessageComposer'));
    emit('Game2StageLoadMessage', { gameType: 0 });
    assert.deepEqual(world.engineCalls.find(call => call[0] === 'createRoom'), [ 'createRoom', ARENA_ROOM_ID ]);
    assert.ok(world.room.calls.some(call => (call[0] === 'setGameMode') && (call[1] === true)));
    assert.ok(world.room.calls.some(call => call[0] === 'setGameInputHandler'));
    assert.equal(world.room.calls.filter(call => call[0] === 'addFurnitureFloorByTypeName').length, scenario.level.objects.length);
    assert.deepEqual(sentNamed('Game2LoadStageReadyComposer').map(packet => plain(packet.params)), [ { percentage: 100 } ]);

    const stillLoading = parseFixture('Game/Snowwar/Arena/Game2StageStillLoadingMessage', 'Game2StageStillLoadingMessage', 'Game2StageStillLoadingMessageComposer');

    emit('Game2StageStillLoadingMessage', stillLoading);
    assert.equal(state().loading.percentage, stillLoading.percentage);

    emit('Game2StageStartingMessage', { gameType: 0, roomType: 'snowwar', countDown: 5, objects: plain(recording.initialObjects) });
    assert.equal(state().phase, SnowWarPhase.Starting);
    assert.equal(state().countdownSeconds, 5);
    assert.equal(world.shownRoom?.roomId, ARENA_ROOM_ID, 'the arena is shown once the stage starts');
    assert.equal(world.room.calls.filter(call => call[0] === 'addRoomObjectUser').length, 4);
    assert.ok(world.sounds.some(sound => sound[1] === 'HBSTG_ig_countdown'));

    emit('Game2StageRunningMessage', { timeToStageEnd: 180 });
    assert.equal(state().phase, SnowWarPhase.Running);

    playTurns(0, 20);
    assert.equal(state().hud.ownHumanId, 5);
    assert.equal(state().hud.humans.length, 4);
    assert.equal(state().secondsLeft, 180 - Math.floor((20 * 3) * 0.05));

    emit('Game2StageEndingMessage', { timeToNextState: 0 });
    assert.equal(state().phase, SnowWarPhase.Ending);
    assert.deepEqual(sentNamed('Game2GetAccountGameStatusComposer').map(packet => plain(packet.params)), [ { gameTypeId: 0 } ]);

    const ending = parseFixture('Game/Snowwar/Arena/Game2GameEndingMessage', 'Game2GameEndingMessage', 'Game2GameEndingMessageComposer');

    emit('Game2GameEndingMessage', ending);
    assert.equal(state().phase, SnowWarPhase.Ending);
    assert.equal(state().results.winnerId, ending.winnerId);

    emit('Game2PlayerRematchesMessage', { userId: 3 });
    assert.deepEqual(plain(state().rematchUserIds), [ 3 ]);
});

await test('the HUD is a plain copy, never the engine\'s live objects', () => {
    startGame();
    playTurns(0, 5);

    const match = getSnowWarMatch();
    const live = match.engine.humans();
    const shown = state().hud.humans;

    for (const human of shown) assert.ok(!live.includes(human));

    playTurns(5, 6);
    assert.notEqual(state().hud.humans, shown);
});

await test('a wrong checksum sends one full status request, however many turns follow, and a full status resyncs', () => {
    startGame();
    playTurns(0, 41);

    for (const turn of recording.turns.slice(41, 45)) emit('Game2GameStatusMessage', { ...statusOf(turn), checksum: turn.checksum ^ 0x5A5A });

    drain();

    const requests = sentNamed('Game2RequestFullStatusUpdateComposer');

    assert.equal(requests.length, 1);
    assert.equal(requests[0].params.reason, 1);
    assert.equal(getSnowWarMatch().engine.inSync, false);

    const reference = referenceEngineAt(44);

    emit('Game2FullGameStatusMessage', { unusedLeadingValue: 0, remainingSeconds: 173, durationSeconds: 180, objects: reference.snapshot(), unusedValueBeforeTeams: 0, numberOfTeams: 2, turn: 44, checksum: recording.turns[44].checksum, events: eventsOf(recording.turns[44].events) });
    assert.equal(getSnowWarMatch().engine.inSync, true);

    playTurns(45, 60);
    assert.equal(getSnowWarMatch().engine.turn, 59);
    assert.equal(sentNamed('Game2RequestFullStatusUpdateComposer').length, 1);
});

await test('a full status older than the local turn is ignored', () => {
    startGame();
    playTurns(0, 50);

    const before = JSON.stringify(getSnowWarMatch().engine.snapshot());
    const stale = referenceEngineAt(30);

    emit('Game2FullGameStatusMessage', { unusedLeadingValue: 0, remainingSeconds: 175, durationSeconds: 180, objects: stale.snapshot(), unusedValueBeforeTeams: 0, numberOfTeams: 2, turn: 30, checksum: recording.turns[30].checksum, events: [ [], [], [] ] });

    assert.equal(getSnowWarMatch().engine.turn, 49);
    assert.equal(JSON.stringify(getSnowWarMatch().engine.snapshot()), before);

    playTurns(50, 52);
    assert.equal(getSnowWarMatch().engine.turn, 51);
});

await test('Game2GameRejoin takes the player back to the room he came from through the navigator command', () => {
    startGame();
    playTurns(0, 3);
    emit('Game2StageEndingMessage', { timeToNextState: 0 });
    emit('Game2GameEndingMessage', parseFixture('Game/Snowwar/Arena/Game2GameEndingMessage', 'Game2GameEndingMessage', 'Game2GameEndingMessageComposer'));
    world.sent.length = 0;

    emit('Game2GameRejoinMessage', { roomId: 123 });

    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), [ [ 'goToRoom', 123 ] ]);
    assert.deepEqual(plain(sentNamed('OpenFlatConnectionComposer')[0].params), { roomId: 123, password: '', unknown1: -1 });
    assert.ok(world.engineCalls.some(call => (call[0] === 'disposeRoom') && (call[1] === ARENA_ROOM_ID)));
    assert.equal(state().afterSki, true);
    assert.equal(getSnowWarMatch(), undefined);
});

await test('Game2GameRejoin with -1 goes nowhere and 0 falls back to the remembered room', () => {
    startGame();
    emit('Game2GameRejoinMessage', { roomId: -1 });
    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), []);

    startGame();
    emit('Game2GameRejoinMessage', { roomId: 0 });
    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), [ [ 'goToRoom', 123 ] ]);
});

await test('leaving the game sends ExitGame and frees the arena room 0x7FFF5357', () => {
    startGame();
    playTurns(0, 3);

    commands.snowWarExit(socket.send);

    assert.deepEqual(plain(sentNamed('Game2ExitGameComposer').map(packet => packet.params)), [ { exitToRoomBeforeGame: true } ]);
    assert.ok(world.engineCalls.some(call => (call[0] === 'disposeRoom') && (call[1] === ARENA_ROOM_ID)));
    assert.equal(getSnowWarMatch(), undefined);
    assert.equal(state().phase, SnowWarPhase.Inactive);

    emit('Game2GameRejoinMessage', { roomId: 123 });
    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), [ [ 'goToRoom', 123 ] ]);
});

await test('inputs follow the client rules and carry the turn being simulated', () => {
    startGame();
    playTurns(0, 2);
    world.sent.length = 0;

    commands.snowWarMoveTo(socket.send, 12, 7);
    assert.equal(sentNamed('Game2SetUserMoveTargetComposer').length, 0, 'no move to a missing tile');

    commands.snowWarMoveTo(socket.send, 4, 4);

    const move = sentNamed('Game2SetUserMoveTargetComposer')[0].params;

    assert.equal(move.x, 4 * 3200);
    assert.equal(move.y, 4 * 3200);
    assert.equal(move.turn, 2);
    assert.ok((move.subturn >= 0) && (move.subturn <= 2));

    commands.snowWarThrowAtHuman(socket.send, 6);
    assert.equal(sentNamed('Game2ThrowSnowballAtHumanComposer').length, 0, 'never at a team mate');

    commands.snowWarThrowAtHuman(socket.send, 7);
    assert.deepEqual([ sentNamed('Game2ThrowSnowballAtHumanComposer')[0].params.targetHumanId, sentNamed('Game2ThrowSnowballAtHumanComposer')[0].params.trajectory ], [ 7, 3 ]);

    commands.snowWarMakeSnowball(socket.send);
    assert.equal(sentNamed('Game2MakeSnowballComposer').length, 0, 'five snowballs already');

    playTurns(2, 10);
    world.sent.length = 0;
    commands.snowWarThrowAtHuman(socket.send, 7);
    commands.snowWarThrowAtPosition(socket.send, 6, 4);
    assert.equal(world.sent.length, 0, 'the throw timer of the throw made in turn 9 still runs');
    commands.snowWarMakeSnowball(socket.send);
    assert.deepEqual(plain(sentNamed('Game2MakeSnowballComposer').map(packet => packet.params.turn)), [ 10 ], 'three snowballs left: one can be made');

    commands.snowWarChat(socket.send, '   ');
    commands.snowWarChat(socket.send, `  ${'a'.repeat(150)} `);
    assert.deepEqual(sentNamed('Game2GameChatComposer').map(packet => packet.params.message.length), [ 100 ]);
});

await test('the room input handler maps clicks and modifiers to the game commands', () => {
    startGame();
    playTurns(0, 2);
    world.sent.length = 0;

    const handler = world.room.calls.find(call => call[0] === 'setGameInputHandler')[1];

    handler.onTileClick(6, 4, { shift: true, alt: false });
    handler.onTileClick(6, 4, { shift: false, alt: true });
    handler.onUserClick(8, { shift: true, alt: true });

    assert.deepEqual(sentNamed('Game2ThrowSnowballAtPositionComposer').map(packet => packet.params.trajectory), [ 0, 2 ]);
    assert.deepEqual(sentNamed('Game2ThrowSnowballAtHumanComposer').map(packet => [ packet.params.targetHumanId, packet.params.trajectory ]), [ [ 8, 1 ] ]);
});

await test('only an opponent who can be hit gets the aim effect 98', () => {
    startGame();
    playTurns(0, 2);

    const handler = world.room.calls.find(call => call[0] === 'setGameInputHandler')[1];
    const effectsOn = id => world.room.calls.filter(call => (call[0] === 'updateRoomObjectUserEffect') && (call[1] === id)).map(call => call[2]);

    handler.onUserHover(5);
    handler.onUserHover(6);
    assert.ok(!effectsOn(5).includes(98));
    assert.ok(!effectsOn(6).includes(98));

    handler.onUserHover(7);
    assert.equal(effectsOn(7).at(-1), 98);

    handler.onUserHover(null);
    assert.equal(effectsOn(7).at(-1), 95);
    assert.equal(effectsOn(5).at(-1), 96);
});

await test('a missing turn asks for a full status once, with reason 0', () => {
    startGame();
    playTurns(0, 10);
    playTurns(12, 16);

    assert.deepEqual(sentNamed('Game2RequestFullStatusUpdateComposer').map(packet => plain(packet.params)), [ { reason: 0 } ]);
});

await test('a full status request waits a second before it is asked again', () => {
    startGame();
    playTurns(0, 41);

    emit('Game2GameStatusMessage', { ...statusOf(recording.turns[41]), checksum: recording.turns[41].checksum ^ 1 });
    drain();
    assert.equal(sentNamed('Game2RequestFullStatusUpdateComposer').length, 1);

    clock.now += 300;
    playTurns(42, 43);
    assert.equal(sentNamed('Game2RequestFullStatusUpdateComposer').length, 1);

    clock.now += 500;
    playTurns(43, 44);
    assert.equal(sentNamed('Game2RequestFullStatusUpdateComposer').length, 2);
});

await test('the HUD counts a departed player\'s points in his team and his avatar leaves the arena', () => {
    startGame();
    playTurns(0, 100);

    const before = getSnowWarMatch().engine.humans().map(human => ({ id: human.id, team: human.team, score: human.score }));

    playTurns(100, 120);

    const present = new Set(getSnowWarMatch().engine.humans().map(human => human.id));
    const departed = before.filter(human => !present.has(human.id));

    assert.equal(departed.length, 1);
    assert.ok(world.room.calls.some(call => (call[0] === 'removeRoomObjectUser') && (call[1] === departed[0].id)));

    const expected = [ 1, 2 ].map(team => getSnowWarMatch().engine.humans().filter(human => human.team === team).reduce((sum, human) => sum + human.score, 0)
        + departed.filter(human => human.team === team).reduce((sum, human) => sum + human.score, 0));

    assert.deepEqual(plain(state().hud.teamScores), expected);
});

await test('Game2PlayerExitedGameArena takes the avatar off at once', () => {
    startGame();
    playTurns(0, 3);

    emit('Game2PlayerExitedGameArenaMessage', { userId: 4, playerGameObjectId: 8 });
    assert.ok(world.room.calls.some(call => (call[0] === 'removeRoomObjectUser') && (call[1] === 8)));

    const addsBefore = world.room.calls.filter(call => (call[0] === 'addRoomObjectUser') && (call[1] === 8)).length;

    playTurns(3, 6);
    assert.equal(world.room.calls.filter(call => (call[0] === 'addRoomObjectUser') && (call[1] === 8)).length, addsBefore, 'the next turn does not bring it back');
    assert.ok(!state().hud.humans.some(human => human.id === 8));
});

await test('throws, hits and the last five seconds are heard', () => {
    resetWorld();
    emit('Game2GameCancelledMessage', {});
    resetWorld();
    emit('Game2GameStartedMessage', parseFixture('Game/Directory/Game2GameStartedMessage', 'Game2GameStartedMessage', 'Game2GameStartedMessageComposer'));
    emit('Game2EnterArenaMessage', enterArena());
    emit('Game2StageLoadMessage', { gameType: 0 });
    emit('Game2StageStartingMessage', { gameType: 0, roomType: 'snowwar', countDown: 5, objects: plain(recording.initialObjects) });
    emit('Game2StageRunningMessage', { timeToStageEnd: 20 });
    playTurns(0, 120);

    const heard = world.sounds.filter(sound => sound[0] === 'play').map(sound => sound[1]);

    assert.ok(heard.includes('HBSTG_snowwar_throw'));
    assert.ok(heard.includes('HBSTG_snowwar_hit1') || heard.includes('HBSTG_snowwar_miss'));
    assert.equal(heard.filter(sound => sound === 'HBST_call_for_help').length, 4, '5, 4, 3 and 2 seconds left');
    assert.equal(state().secondsLeft, 2);
    assert.ok(world.room.calls.some(call => call[0] === 'createRoomObjectAndInitalize' && call[2] === 'RoomObjectLogicType.GAME_SNOWSPLASH'));
});

await test('chat lines carry the author\'s name, figure and team, and only the last 50 are kept', () => {
    startGame();

    for (let index = 0; index < 55; index++) emit('Game2GameChatFromPlayerMessage', { userId: 3, message: `m${index}` });

    assert.equal(state().chat.length, 50);
    assert.deepEqual(plain(state().chat.at(-1)), { userId: 3, name: 'Corto', figure: 'hd-200-3', team: 2, message: 'm54' });
});

await test('the directory, the account, a block and the leaderboards land in the store', () => {
    emit('Game2GameDirectoryStatusMessage', { status: 0, blockLength: 0, gamesPlayed: 7, freeGamesLeft: -1 });
    assert.deepEqual([ state().directoryStatus, state().gamesPlayed, state().freeGamesLeft ], [ 0, 7, -1 ]);

    const before = clock.now;

    emit('Game2UserBlockedMessage', { playerBlockLength: 90 });
    assert.ok(state().blockedUntil >= before + 90000);

    emit('Game2AccountGameStatusMessage', { gameTypeId: 0, freeGamesLeft: -1, gamesPlayedTotal: 8 });
    assert.equal(state().gamesPlayed, 8);

    const board = { year: 2026, week: 42, maxOffset: 1, currentOffset: 0, minutesUntilReset: 30, entries: [ { userId: 1, score: 9, rank: 1, name: 'Alba', figure: 'hd-180-1', gender: 'F' } ], totalListSize: 1, gameTypeId: 0 };

    emit('Game2WeeklyLeaderboardMessage', board);
    emit('Game2TotalLeaderboardMessage', { entries: [], totalListSize: 0, gameTypeId: 0 });
    assert.equal(state().leaderboards.weekly.week, 42);
    assert.equal(state().leaderboards.total.totalListSize, 0);

    world.sent.length = 0;
    commands.snowWarRequestLeaderboard(socket.send, 'weeklyFriends', { weekOffset: 1 });
    commands.snowWarRequestLeaderboard(socket.send, 'total');
    assert.deepEqual(plain(sentNamed('Game2GetWeeklyFriendsLeaderboardComposer')[0].params), { gameTypeId: 0, weekOffset: 1, startRank: -1, direction: 0, viewSize: 8, windowSize: 50 });
    assert.deepEqual(plain(sentNamed('Game2GetTotalLeaderboardComposer')[0].params), { gameTypeId: 0, startRank: -1, direction: 0, viewSize: 8, windowSize: 50 });
});

await test('the lobby commands send their packets and leaving the lobby empties it', () => {
    resetWorld();
    emit('Game2GameCancelledMessage', {});
    world.sent.length = 0;

    commands.snowWarQuickJoin(socket.send);
    emit('Game2GameCreatedMessage', parseFixture('Game/Directory/Game2GameCreatedMessage', 'Game2GameCreatedMessage', 'Game2GameCreatedMessageComposer'));
    emit('Game2InArenaQueueMessage', { position: 2 });
    assert.equal(state().queuePosition, 2);

    commands.snowWarLeaveLobby(socket.send);

    assert.deepEqual(world.sent.map(packet => packet.name), [ 'Game2QuickJoinGameComposer', 'Game2LeaveGameComposer' ]);
    assert.equal(state().phase, SnowWarPhase.Inactive);
    assert.equal(state().lobby, undefined);
});

await test('play again is sent once and marks the request', () => {
    startGame();
    emit('Game2StageEndingMessage', { timeToNextState: 0 });
    emit('Game2GameEndingMessage', parseFixture('Game/Snowwar/Arena/Game2GameEndingMessage', 'Game2GameEndingMessage', 'Game2GameEndingMessageComposer'));
    world.sent.length = 0;

    commands.snowWarPlayAgain(socket.send);
    commands.snowWarPlayAgain(socket.send);

    assert.equal(sentNamed('Game2PlayAgainComposer').length, 1);
    assert.equal(state().rematchRequested, true);

    emit('Game2PlayerRematchesMessage', { userId: OWN_USER_ID });
    emit('Game2GameRejoinMessage', { roomId: 123 });
    assert.equal(state().afterSki, false, 'a rematch waits for players instead of the after-ski');
    assert.equal(state().awaitingRematch, true);
    assert.equal(state().phase, SnowWarPhase.Ending);
});

await test('a play again the server never confirmed before the results closed leads to the after-ski instead of waiting forever', () => {
    startGame();
    emit('Game2StageEndingMessage', { timeToNextState: 0 });
    emit('Game2GameEndingMessage', parseFixture('Game/Snowwar/Arena/Game2GameEndingMessage', 'Game2GameEndingMessage', 'Game2GameEndingMessageComposer'));

    commands.snowWarPlayAgain(socket.send);
    emit('Game2PlayerRematchesMessage', { userId: OWN_USER_ID + 1 });
    emit('Game2GameRejoinMessage', { roomId: 123 });

    assert.equal(state().awaitingRematch, false, 'no lobby will come for a rematch the server did not take');
    assert.equal(state().afterSki, true);
    assert.equal(state().phase, SnowWarPhase.Ending);
});

await test('a cancelled game frees the arena and goes back to the room the player left', () => {
    startGame();
    playTurns(0, 2);
    emit('Game2GameCancelledMessage', {});

    assert.ok(world.engineCalls.some(call => (call[0] === 'disposeRoom') && (call[1] === ARENA_ROOM_ID)));
    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), [ [ 'goToRoom', 123 ] ]);
    assert.equal(state().phase, SnowWarPhase.Inactive);
    assert.equal(getSnowWarMatch(), undefined);
});

await test('the match runs on a 50 ms clock: a snowball moves on every subturn, one subturn per tick', () => {
    startGame();
    playTurns(0, 3);

    const match = getSnowWarMatch();
    const ball = () => world.fakeObjects.get('RoomObjectCategoryEnum.Snowball:9');

    assert.equal(world.intervals.filter(interval => !interval.cleared).map(interval => interval.delay).join(), '50');
    assert.equal(match.engine.turn, 2);

    emit('Game2GameStatusMessage', statusOf(recording.turns[3]));
    assert.equal(match.engine.simulatedSubturns, 9, 'one turn behind: nothing to catch up');

    const seen = [];

    for (let subturn = 0; subturn < 3; subturn++) {
        clock.now += 50;
        world.intervals.at(-1).callback();
        assert.equal(match.engine.simulatedSubturns, 10 + subturn);
        seen.push(JSON.stringify(ball().locations.at(-1)));
    }

    assert.equal(ball().locations.length, 3, 'one position per subturn');
    assert.equal(new Set(seen).size, 3);

    clock.now += 10;
    match.tick();
    assert.equal(match.engine.simulatedSubturns, 12, 'no subturn before 50 ms have gone by');
});

await test('catching up runs at most 10 turns at once and stays one turn behind', () => {
    startGame();

    const match = getSnowWarMatch();

    for (const turn of recording.turns.slice(0, 20)) match.engine.receiveGameStatus(statusOf(turn));

    match.tick();
    assert.equal(match.engine.simulatedSubturns, 30);

    match.tick();
    assert.equal(match.engine.simulatedSubturns, 57);
    assert.equal(match.engine.pendingSubturns, 3);
});

await test('an input is stamped with the subturn the simulation reached just before it is sent', () => {
    startGame();
    playTurns(0, 1);
    emit('Game2GameStatusMessage', statusOf(recording.turns[1]));
    world.sent.length = 0;

    clock.now += 100;
    commands.snowWarMoveTo(socket.send, 4, 4);

    assert.deepEqual([ sentNamed('Game2SetUserMoveTargetComposer')[0].params.turn, sentNamed('Game2SetUserMoveTargetComposer')[0].params.subturn ], [ 1, 1 ]);
});

await test('a lost connection drops the game and, once connected again, goes back to the room the player left', () => {
    startGame();
    playTurns(0, 3);

    commands.abandonSnowWarOnDisconnect();

    assert.equal(getSnowWarMatch(), undefined);
    assert.ok(world.engineCalls.some(call => (call[0] === 'disposeRoom') && (call[1] === ARENA_ROOM_ID)));
    assert.equal(state().phase, SnowWarPhase.Inactive);
    assert.ok(world.intervals.every(interval => interval.cleared), 'the clock is stopped');

    registerSnowWarHandlers(socket);

    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), [ [ 'goToRoom', 123 ] ]);

    registerSnowWarHandlers(socket);
    assert.equal(world.navigations.filter(call => call[0] === 'goToRoom').length, 1, 'only once');
});

await test('a lost connection outside a game remembers nothing', () => {
    resetWorld();
    emit('Game2GameCancelledMessage', {});
    commands.abandonSnowWarOnDisconnect();
    registerSnowWarHandlers(socket);

    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), []);
});

await test('Game2GameRejoin with no results on screen closes the game', () => {
    startGame();
    playTurns(0, 3);
    emit('Game2GameRejoinMessage', { roomId: 123 });

    assert.equal(state().phase, SnowWarPhase.Inactive);
    assert.equal(getSnowWarMatch(), undefined);
    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), [ [ 'goToRoom', 123 ] ]);
});

await test('an arena that cannot be built is logged and the player leaves the game instead of blocking it', () => {
    resetWorld();
    emit('Game2GameCancelledMessage', {});
    resetWorld();
    world.failCreateRoom = true;
    emit('Game2GameStartedMessage', parseFixture('Game/Directory/Game2GameStartedMessage', 'Game2GameStartedMessage', 'Game2GameStartedMessageComposer'));
    emit('Game2EnterArenaMessage', enterArena());
    emit('Game2StageLoadMessage', { gameType: 0 });

    assert.ok(world.logged.some(entry => entry[0] === 'error'));
    assert.deepEqual(plain(sentNamed('Game2ExitGameComposer').map(packet => packet.params)), [ { exitToRoomBeforeGame: true } ]);
    assert.equal(sentNamed('Game2LoadStageReadyComposer').length, 0);
    assert.equal(getSnowWarMatch(), undefined);
    assert.equal(state().phase, SnowWarPhase.Inactive);
    assert.equal(state().error.kind, 'arena');

    emit('Game2GameRejoinMessage', { roomId: 123 });
    assert.deepEqual(world.navigations.filter(call => call[0] === 'goToRoom'), [ [ 'goToRoom', 123 ] ]);
});
