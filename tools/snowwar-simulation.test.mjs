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

const SIMULATION_ROOT = 'nitro-react/src/snowwar/';
const NITRO_API = Symbol('nitro-api');

const resolveSpecifier = (from, name) => {
    if (name.startsWith('.')) return new URL(name, new URL(from, packagesRoot)).pathname.slice(packagesRoot.pathname.length);

    if (from.startsWith(SIMULATION_ROOT)) throw new Error(`The simulation must not depend on ${name} (imported by ${from})`);

    if (name === '@nitrodevco/nitro-api') return NITRO_API;

    if (name.startsWith('#api/')) return `nitro-api/src/${name.slice(5)}`;

    throw new Error(`Unexpected dependency ${name} in ${from}`);
};

const nitroApi = () => requireModule('nitro-api/src/room/object/data/GetObjectDataForFlags');

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

            return (target === NITRO_API) ? nitroApi() : requireModule(target);
        },
    });

    return exports;
};

const snowwar = path => requireModule(`${SIMULATION_ROOT}${path}`);
const { SnowWarEngine } = snowwar('SnowWarEngine');
const { SnowWarChecksumBuilder } = snowwar('SnowWarChecksum');
const SnowWarMath = snowwar('SnowWarMath');

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/snowwar/${name}`, import.meta.url), 'utf8'));
const scenario = fixture('scenario-1.json');
const recording = fixture('scenario-1.checksums.json');
const serverFullStatuses = fixture('scenario-1.full-status.json');

const ARENA_FURNI = {
    snst_block1: [ 1, 1, 1440 ],
    snst_iceblock: [ 1, 1, 1760 ],
    snst_tree1: [ 1, 1, 3200 ],
    snst_tree1_d: [ 1, 1, 3200 ],
    snst_fence: [ 1, 2, 960 ],
    snst_ballpile: [ 1, 1, 320 ],
    s_snowball_machine: [ 1, 1, 1600 ],
    snowball_machine: [ 1, 1, 1600 ],
    ads_igorraygun: [ 1, 2, 1600 ],
    xm09_man_a: [ 1, 1, 1280 ],
    xm09_man_b: [ 1, 1, 1200 ],
    xm09_man_c: [ 1, 1, 800 ],
};

const fuseObject = (name, id, x, y, direction, altitude, canStandOn, [ xDimension, yDimension, height ]) => ({
    name, id, x, y, xDimension, yDimension, height, direction, altitude, canStandOn, stuffData: null,
});

const levelOf = ({ width, height, heightMap, objects, backdrop }) => {
    const fuseObjects = objects.map((object, index) => fuseObject(object.name, index + 1, object.x, object.y, object.direction, object.altitude, false, ARENA_FURNI[object.name]));

    if (backdrop?.imageUrl) fuseObjects.push(fuseObject('ads_background', fuseObjects.length + 1, backdrop.x, backdrop.y, 1, 0, true, [ 1, 1, 0 ]));

    return { width, height, heightMap: heightMap.join('\r'), fuseObjects };
};

const eventsOf = subturns => subturns.map(events => events.map(([ type, ...fields ]) => ({ type, fields })));
const statusOf = turn => ({ turn: turn.turn, checksum: turn.checksum, events: eventsOf(turn.events) });
const plain = value => JSON.parse(JSON.stringify(value));

const recordingListener = () => {
    const heard = [];
    const record = kind => (...args) => heard.push([ kind, ...args ]);

    return {
        heard,
        snowballThrown: record('snowballThrown'),
        humanHit: record('humanHit'),
        snowballLanded: record('snowballLanded'),
        snowballPicked: record('snowballPicked'),
        snowballMakingStarted: record('snowballMakingStarted'),
        rayGunFired: record('rayGunFired'),
    };
};

const startedEngine = (listener = recordingListener(), ownUserId = 0) => {
    const engine = new SnowWarEngine(levelOf(scenario.level), listener, ownUserId);

    engine.applyStageStarting({ gameType: 0, roomType: 'snowwar', countDown: 5, objects: plain(recording.initialObjects) });

    return engine;
};

const replay = (engine, untilTurn) => {
    for (const turn of recording.turns.slice(0, untilTurn)) assert.equal(engine.applyGameStatus(statusOf(turn)), 'applied', `turn ${turn.turn} diverged`);
};

await test('math helpers give the control values of the behaviour book', () => {
    const angles = [ [ 0, -1, 360 ], [ 1, -1, 45 ], [ 1, 0, 90 ], [ 1, 1, 135 ], [ 0, 1, 180 ], [ -1, 1, 225 ], [ -1, 0, 270 ], [ -1, -1, 315 ], [ 0, 0, 180 ], [ 160, 0, 90 ], [ 100, -50, 63 ] ];

    for (const [ x, y, expected ] of angles) assert.equal(SnowWarMath.angle(x, y), expected, `angle(${x}, ${y})`);

    const roots = [ [ 0, 0 ], [ 1, 1 ], [ 2, 1 ], [ 100, 10 ], [ 255, 15 ], [ 256, 16 ], [ 1000, 31 ], [ 4096, 64 ], [ 10000, 99 ], [ 25600, 160 ], [ 65536, 256 ], [ 160000, 398 ], [ 1000000, 996 ], [ 2147483647, 46080 ], [ -4, -1 ] ];

    for (const [ value, expected ] of roots) assert.equal(SnowWarMath.fastSqrt(value), expected, `fastSqrt(${value})`);

    const directions = [ [ 0, 0 ], [ 21, 0 ], [ 22, 1 ], [ 66, 1 ], [ 67, 2 ], [ 90, 2 ], [ 180, 4 ], [ 270, 6 ], [ 336, 7 ], [ 337, 0 ], [ 360, 0 ], [ -90, 6 ] ];

    for (const [ value, expected ] of directions) assert.equal(SnowWarMath.dir360ToDir8(value), expected, `dir360ToDir8(${value})`);

    assert.equal(SnowWarMath.baseVectorX(30), 127);
    assert.equal(SnowWarMath.baseVectorY(1), -255);
    assert.equal(SnowWarMath.baseVectorX(90), 256);
    assert.equal(SnowWarMath.normalizeDirection(-360), 360);
    assert.equal(SnowWarMath.worldToTile(-4799), 0);
    assert.equal(SnowWarMath.worldToTile(-4800), -1);
});

await test('checksum matches the control vectors of the checksum spec', () => {
    const checksumOf = (turn, objects) => {
        const builder = new SnowWarChecksumBuilder();

        builder.add(turn);
        builder.add(objects.length);

        for (const object of objects) {
            builder.add(object.type);
            builder.add(object.id);

            for (const variable of object.variables) builder.add(variable);
        }

        return builder.finish();
    };

    assert.equal(checksumOf(0, []), -133030364);
    assert.equal(checksumOf(1, []), -92070181);
    assert.equal(checksumOf(7, [
        { type: 3, id: 1, variables: [ 9600, 3200, 12, 12, 2 ] },
        { type: 1, id: 7, variables: [ 12421, 16000, 3000, 90, 0, 7, 3, 5, 2000 ] },
    ]), 629429088);
});

await test('stage starting objects round-trip unchanged through the engine', () => {
    const engine = startedEngine();

    assert.deepEqual(plain(engine.snapshot()), recording.initialObjects);
});

await test('replaying scenario-1 gives the server checksum on every one of the 120 turns', () => {
    const engine = startedEngine();

    assert.equal(recording.turns.length, 120);

    for (const turn of recording.turns) {
        assert.equal(engine.applyGameStatus(statusOf(turn)), 'applied', `turn ${turn.turn} diverged`);
        assert.equal(engine.turn, turn.turn);
    }
});

await test('the replay notifies throws, hits, landings, pickups, snowball making and ray gun bursts', () => {
    const listener = recordingListener();
    const engine = startedEngine(listener);

    replay(engine, recording.turns.length);

    const kinds = new Set(listener.heard.map(([ kind ]) => kind));

    for (const kind of [ 'snowballThrown', 'humanHit', 'snowballLanded', 'snowballPicked', 'snowballMakingStarted', 'rayGunFired' ]) assert.ok(kinds.has(kind), `${kind} was never heard`);
});

await test('humans and snowballs expose the simulated state, and ownHumanId follows the own user id', () => {
    const engine = startedEngine(recordingListener(), 3);

    replay(engine, 30);

    const snapshot = plain(engine.snapshot());
    const humans = engine.humans();
    const snowballs = engine.snowballs();

    assert.deepEqual(plain(humans.map(human => human.id)), snapshot.filter(object => object.type === 5).map(object => object.id));
    assert.deepEqual(plain(snowballs.map(snowball => snowball.id)), snapshot.filter(object => object.type === 1).map(object => object.id));

    const corto = humans.find(human => human.userId === 3);
    const cortoData = snapshot.find(object => object.id === corto.id);

    assert.deepEqual(plain([ corto.x, corto.y, corto.hp, corto.balls, corto.team, corto.name ]), [ cortoData.variables[0], cortoData.variables[1], cortoData.variables[5], cortoData.variables[6], cortoData.variables[15], cortoData.strings[0] ]);
    assert.equal(engine.ownHumanId, corto.id);
    assert.equal(startedEngine().ownHumanId, -1);
});

const fullStatusOf = (objects, turn) => ({
    unusedLeadingValue: 0,
    remainingSeconds: 170,
    durationSeconds: 180,
    objects,
    unusedValueBeforeTeams: 0,
    numberOfTeams: 2,
    ...statusOf(recording.turns[turn]),
});

await test('a wrong checksum leaves its turn unapplied, the engine keeps simulating out of sync, and a full status brings it back in sync', () => {
    const reference = startedEngine();
    const listener = recordingListener();
    const engine = startedEngine(listener);
    const divergingTurn = 41;
    const resyncTurn = divergingTurn + 3;

    replay(reference, resyncTurn + 1);
    replay(engine, divergingTurn);

    const before = plain(engine.snapshot());
    const heardBefore = listener.heard.length;
    const corrupted = statusOf(recording.turns[divergingTurn]);

    assert.equal(engine.inSync, true);
    assert.equal(engine.applyGameStatus({ ...corrupted, checksum: corrupted.checksum ^ 1 }), 'checksumMismatch');
    assert.equal(engine.inSync, false);
    assert.equal(engine.turn, divergingTurn - 1);
    assert.deepEqual(plain(engine.snapshot()), before);
    assert.equal(listener.heard.length, heardBefore);

    for (let turn = divergingTurn + 1; turn <= resyncTurn; turn++) {
        const status = statusOf(recording.turns[turn]);

        assert.equal(engine.applyGameStatus({ ...status, checksum: status.checksum ^ 7 }), 'applied', `turn ${turn} was not simulated out of sync`);
        assert.equal(engine.turn, turn);
        assert.equal(engine.inSync, false);
    }

    assert.ok(listener.heard.length > heardBefore);
    assert.deepEqual(plain(engine.snapshot()), plain(reference.snapshot()));

    engine.applyFullStatus(fullStatusOf(plain(reference.snapshot()), resyncTurn));

    assert.equal(engine.inSync, true);
    assert.equal(engine.turn, resyncTurn);
    assert.deepEqual(plain(engine.snapshot()), plain(reference.snapshot()));

    for (const turn of recording.turns.slice(resyncTurn + 1)) assert.equal(engine.applyGameStatus(statusOf(turn)), 'applied', `turn ${turn.turn} diverged after the full status`);

    assert.equal(engine.inSync, true);
    assert.equal(engine.turn, 119);
});

await test('a full status captured by the server mid-motion with balls in flight resumes on the server checksums', () => {
    assert.ok(serverFullStatuses.length > 0);

    for (const capture of serverFullStatuses) {
        assert.equal(capture.checksum, recording.turns[capture.turn].checksum);
        assert.deepEqual(capture.events, recording.turns[capture.turn].events);
        assert.ok(capture.objects.some(object => object.type === 1), `turn ${capture.turn} has no ball in flight`);

        const engine = startedEngine();

        replay(engine, 2);
        engine.applyFullStatus({ ...fullStatusOf(plain(capture.objects), capture.turn), events: eventsOf(capture.events) });

        assert.equal(engine.inSync, true);
        assert.equal(engine.turn, capture.turn);

        for (const turn of recording.turns.slice(capture.turn + 1)) assert.equal(engine.applyGameStatus(statusOf(turn)), 'applied', `turn ${turn.turn} diverged after the server full status of turn ${capture.turn}`);

        assert.equal(engine.inSync, true);
        assert.equal(engine.turn, 119);
    }
});

await test('the engine rebuilt from a server full status matches the engine that played every turn', () => {
    for (const capture of serverFullStatuses) {
        const reference = startedEngine();
        const resumed = startedEngine();

        replay(reference, capture.turn + 1);
        resumed.applyFullStatus({ ...fullStatusOf(plain(capture.objects), capture.turn), events: eventsOf(capture.events) });

        assert.deepEqual(plain(resumed.snapshot()), plain(reference.snapshot()), `snapshot after the full status of turn ${capture.turn}`);
        assert.deepEqual(plain(capture.objects), plain(reference.snapshot()), `server objects of turn ${capture.turn}`);
    }
});

await test('a duplicate, stale or skipped turn is out of sequence: state untouched and still in sync', () => {
    const engine = startedEngine();

    replay(engine, 10);

    const before = plain(engine.snapshot());

    assert.equal(engine.applyGameStatus(statusOf(recording.turns[9])), 'outOfSequence');
    assert.equal(engine.applyGameStatus(statusOf(recording.turns[5])), 'outOfSequence');
    assert.equal(engine.applyGameStatus(statusOf(recording.turns[12])), 'outOfSequence');
    assert.equal(engine.inSync, true);
    assert.equal(engine.turn, 9);
    assert.deepEqual(plain(engine.snapshot()), before);
    assert.equal(engine.applyGameStatus(statusOf(recording.turns[10])), 'applied');
});

await test('the engine builds its arena from a level parsed by nitro-packets out of the server bytes', () => {
    const { BinaryReader } = requireModule('nitro-api/src/utils/BinaryReader');
    const { EvaWireDataWrapper } = requireModule('nitro-api/src/communication/EvaWireDataWrapper');
    const { Game2EnterArenaMessage } = requireModule('nitro-packets/src/incoming/Game/Snowwar/Arena/Game2EnterArenaMessage');
    const hex = readFileSync(new URL('./fixtures/snowwar/Game2EnterArenaMessageComposer.hex', import.meta.url), 'utf8').trim();
    const bytes = Uint8Array.from(Buffer.from(hex, 'hex'));
    const { level } = new Game2EnterArenaMessage().parse(new EvaWireDataWrapper(0, new BinaryReader(bytes.buffer)));
    const engine = new SnowWarEngine(level, recordingListener());
    const tileOf = (x, y) => {
        const tile = engine.tile(x, y);

        return tile && plain({ x: tile.x, y: tile.y, height: tile.height, isWalkable: tile.isWalkable });
    };

    assert.deepEqual([ level.width, level.height, level.heightMap ], [ 3, 2, '000\r0x0' ]);
    assert.deepEqual(tileOf(0, 0), { x: 0, y: 0, height: 0, isWalkable: true });
    assert.deepEqual(tileOf(1, 0), { x: 1, y: 0, height: 3200, isWalkable: false });
    assert.deepEqual(tileOf(2, 0), { x: 2, y: 0, height: 0, isWalkable: true });
    assert.deepEqual(tileOf(0, 1), { x: 0, y: 1, height: 0, isWalkable: true });
    assert.equal(engine.tile(1, 1), null);
    assert.deepEqual(tileOf(2, 1), { x: 2, y: 1, height: 0, isWalkable: true });
    assert.equal(engine.tile(3, 0), null);
    assert.deepEqual(plain(engine.snapshot()), []);
});

await test('footprints, stacked blocks and rotated fences of the level reach the right tiles', () => {
    const engine = startedEngine();
    const tileOf = (x, y) => {
        const tile = engine.tile(x, y);

        return plain([ tile.height, tile.isWalkable ]);
    };

    assert.deepEqual(tileOf(14, 12), [ 3520, false ]);
    assert.deepEqual(tileOf(18, 9), [ 960, false ]);
    assert.deepEqual(tileOf(19, 9), [ 960, false ]);
    assert.deepEqual(tileOf(18, 10), [ 0, true ]);
    assert.deepEqual(tileOf(20, 6), [ 1600, false ]);
    assert.deepEqual(tileOf(10, 10), [ 0, false ]);
    assert.deepEqual(tileOf(2, 15), [ 0, true ]);
    assert.equal(engine.tile(12, 7), null);
});

await test('stepping one subturn at a time gives the same 120 checksums, the same state and the same notifications as whole turns', () => {
    const wholeListener = recordingListener();
    const steppedListener = recordingListener();
    const whole = startedEngine(wholeListener);
    const stepped = startedEngine(steppedListener);

    replay(whole, 120);

    for (const turn of recording.turns) assert.equal(stepped.receiveGameStatus(statusOf(turn)), 'applied');

    assert.equal(stepped.pendingSubturns, 360);

    let steps = 0;

    while (stepped.stepSubturn()) {
        steps++;
        assert.equal(stepped.simulatedSubturns, steps);
        assert.equal(stepped.inSync, true, `subturn ${steps} diverged`);
    }

    assert.equal(steps, 360);
    assert.equal(stepped.turn, 119);
    assert.equal(stepped.pendingSubturns, 0);
    assert.deepEqual(plain(stepped.snapshot()), plain(whole.snapshot()));
    assert.deepEqual(steppedListener.heard, wholeListener.heard);
});

await test('a stepped turn is checked at its end: a wrong checksum takes the engine out of sync, a skipped turn is out of sequence', () => {
    const engine = startedEngine();

    for (const turn of recording.turns.slice(0, 3)) engine.receiveGameStatus(statusOf(turn));

    assert.equal(engine.receiveGameStatus(statusOf(recording.turns[5])), 'outOfSequence');

    const corrupted = statusOf(recording.turns[3]);

    engine.receiveGameStatus({ ...corrupted, checksum: corrupted.checksum ^ 1 });

    for (let step = 0; step < 11; step++) engine.stepSubturn();

    assert.equal(engine.inSync, true, 'turn 3 is not finished yet');
    assert.equal(engine.subturn, 2);
    engine.stepSubturn();
    assert.equal(engine.inSync, false);
    assert.equal(engine.turn, 3);
});
