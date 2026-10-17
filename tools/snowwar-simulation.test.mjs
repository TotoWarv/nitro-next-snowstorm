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

const resolveSpecifier = (from, name) => {
    if (name.startsWith('.')) return new URL(name, new URL(from, packagesRoot)).pathname.slice(packagesRoot.pathname.length);

    throw new Error(`The simulation must not depend on ${name} (imported by ${from})`);
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
        require: name => requireModule(resolveSpecifier(relative, name)),
    });

    return exports;
};

const snowwar = path => requireModule(`nitro-react/src/snowwar/${path}`);
const { SnowWarEngine } = snowwar('SnowWarEngine');
const { SnowWarChecksumBuilder } = snowwar('SnowWarChecksum');
const SnowWarMath = snowwar('SnowWarMath');

const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/snowwar/${name}`, import.meta.url), 'utf8'));
const scenario = fixture('scenario-1.json');
const recording = fixture('scenario-1.checksums.json');

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
    for (const turn of recording.turns.slice(0, untilTurn)) assert.equal(engine.applyGameStatus(statusOf(turn)), true, `turn ${turn.turn} diverged`);
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
        assert.equal(engine.applyGameStatus(statusOf(turn)), true, `turn ${turn.turn} diverged`);
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

await test('a wrong checksum is refused, keeps the previous turn and notifies nothing; a full status then restores equality', () => {
    const reference = startedEngine();
    const listener = recordingListener();
    const engine = startedEngine(listener);
    const divergingTurn = 41;

    replay(reference, divergingTurn + 1);
    replay(engine, divergingTurn);

    const before = plain(engine.snapshot());
    const heardBefore = listener.heard.length;
    const corrupted = statusOf(recording.turns[divergingTurn]);

    assert.equal(engine.applyGameStatus({ ...corrupted, checksum: corrupted.checksum ^ 1 }), false);
    assert.equal(engine.turn, divergingTurn - 1);
    assert.deepEqual(plain(engine.snapshot()), before);
    assert.equal(listener.heard.length, heardBefore);

    assert.equal(engine.applyGameStatus(statusOf(recording.turns[divergingTurn + 1])), false);
    assert.deepEqual(plain(engine.snapshot()), before);

    engine.applyFullStatus({
        unusedLeadingValue: 0,
        remainingSeconds: 170,
        durationSeconds: 180,
        objects: plain(reference.snapshot()),
        unusedValueBeforeTeams: 0,
        numberOfTeams: 2,
        ...statusOf(recording.turns[divergingTurn]),
    });

    assert.equal(engine.turn, divergingTurn);
    assert.deepEqual(plain(engine.snapshot()), plain(reference.snapshot()));

    for (const turn of recording.turns.slice(divergingTurn + 1)) assert.equal(engine.applyGameStatus(statusOf(turn)), true, `turn ${turn.turn} diverged after the full status`);
});

await test('a stale or skipped turn is refused without touching the state', () => {
    const engine = startedEngine();

    replay(engine, 10);

    const before = plain(engine.snapshot());

    assert.equal(engine.applyGameStatus(statusOf(recording.turns[5])), false);
    assert.equal(engine.applyGameStatus(statusOf(recording.turns[12])), false);
    assert.deepEqual(plain(engine.snapshot()), before);
    assert.equal(engine.applyGameStatus(statusOf(recording.turns[10])), true);
});
