import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const read = path => readFileSync(new URL(`../packages/${path}.ts`, import.meta.url), 'utf8');

const stubClasses = new Map();

const stubClass = (name) => {
    if (!stubClasses.has(name)) {
        const Stub = class {
            initialize() {
                return true;
            }

            dispose() {}

            addEventListener() {}
        };

        Object.defineProperty(Stub, 'name', { value: name });
        stubClasses.set(name, Stub);
    }

    return stubClasses.get(name);
};

const stubModule = overrides => new Proxy(overrides, { get: (target, name) => (Object.hasOwn(target, name) ? target[name] : stubClass(String(name))) });

const load = (path, dependencies = {}, globals = {}) => {
    const { outputText } = ts.transpileModule(read(path), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};

    runInNewContext(outputText, { exports, Object, Array, Math, Map, Set, Number, ...globals, require: name => dependencies[name] ?? stubModule({}) });

    return exports;
};

const { RoomObjectCategoryEnum } = load('nitro-api/src/room/object/RoomObjectCategoryEnum');
const { RoomObjectVariableEnum } = load('nitro-api/src/room/object/RoomObjectVariableEnum');
const { RoomObjectLogicType } = load('nitro-api/src/room/object/RoomObjectLogicType');
const { RoomObjectVisualizationType } = load('nitro-api/src/room/object/RoomObjectVisualizationType');

const MouseEventType = { MOUSE_CLICK: 'click', MOUSE_MOVE: 'mousemove', ROLL_OVER: 'mouseover', ROLL_OUT: 'mouseout', MOUSE_DOWN: 'mousedown' };

class RoomObjectEvent {
    constructor(type, objectId = 0, objectType = '') {
        this.type = type;
        this.objectId = objectId;
        this.objectType = objectType;
    }
}

class RoomObjectMouseEvent extends RoomObjectEvent {
    static CLICK = 'ROE_MOUSE_CLICK';
    static MOUSE_MOVE = 'ROE_MOUSE_MOVE';
    static MOUSE_DOWN = 'ROE_MOUSE_DOWN';

    constructor(type, eventId) {
        super(type, -1, 'room');
        this.eventId = eventId;
    }
}

class RoomObjectTileMouseEvent extends RoomObjectMouseEvent {
    constructor(type, eventId, tileX, tileY, altKey = false, shiftKey = false) {
        super(type, eventId);
        this.tileX = tileX;
        this.tileY = tileY;
        this.altKey = altKey;
        this.shiftKey = shiftKey;
    }

    get tileXAsInt() {
        return Math.trunc(this.tileX + 0.499);
    }

    get tileYAsInt() {
        return Math.trunc(this.tileY + 0.499);
    }
}

class RoomObjectFurniIconAssetEvent extends RoomObjectEvent {
    static LOAD_FURNI_ICON = 'ROFIAE_LOAD_FURNI_ICON';
}

const { RoomEventHandler } = load('nitro-renderer/src/room/RoomEventHandler', {
    '@nitrodevco/nitro-api': stubModule({ MouseEventType, RoomObjectCategoryEnum, RoomObjectFurniIconAssetEvent, RoomObjectMouseEvent, RoomObjectTileMouseEvent }),
    './FurniIconImageManager': { GetFurniIconImageManager: () => ({ requestFurniIconAsset: () => {} }) },
    './utils': { RoomEnterEffect: { isRunning: () => false } },
});

const categories = { room: RoomObjectCategoryEnum.Room, user: RoomObjectCategoryEnum.Unit, chair: RoomObjectCategoryEnum.Floor };

const recordingGameHandler = () => {
    const calls = [];

    return {
        calls,
        onTileClick: (x, y, modifiers) => calls.push([ 'tile', x, y, { ...modifiers } ]),
        onUserClick: (objectId, modifiers) => calls.push([ 'user', objectId, { ...modifiers } ]),
        onMouseMove: (x, y) => calls.push([ 'move', x, y ]),
        onUserHover: objectId => calls.push([ 'hover', objectId ]),
    };
};

const setup = ({ gameMode, withHandler = true }) => {
    const game = recordingGameHandler();
    const ui = { canvas: [], objectEvents: [] };
    const room = {
        gameMode,
        gameInputHandler: withHandler ? game : undefined,
        clickThroughUsers: false,
        clickThroughFurni: false,
        getRoomObjectCategoryForType: type => categories[type] ?? RoomObjectCategoryEnum.Minimum,
        getGeometry: () => ({ geometry: true }),
        eventDispatcher: {},
    };
    const handler = new RoomEventHandler(room);
    const floorObject = (tileX, tileY) => ({
        id: -1,
        type: 'room',
        mouseHandler: {
            mouseEvent: (event) => {
                const type = (event.type === MouseEventType.MOUSE_CLICK) ? RoomObjectMouseEvent.CLICK : RoomObjectMouseEvent.MOUSE_MOVE;

                handler.handleRoomObjectEvent(new RoomObjectTileMouseEvent(type, event.eventId, tileX, tileY, event.altKey, event.shiftKey));
            },
        },
    });

    handler.setRoomCanvasMouseHandler((event, object) => {
        ui.canvas.push([ event.type, object.type ]);

        object.mouseHandler?.mouseEvent(event, room.getGeometry());
    });
    handler.setRoomObjectEventHandler(event => ui.objectEvents.push(event));

    return { game, ui, room, handler, floorObject };
};

const canvasEvent = (type, eventId, { altKey = false, shiftKey = false } = {}) => ({ type, eventId, altKey, shiftKey });

const NO_MODIFIERS = { shift: false, alt: false };

await test('in game mode a tile click calls onTileClick and the UI (the walk composer) never sees it', () => {
    const { game, ui, handler, floorObject } = setup({ gameMode: true });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 7), floorObject(3.2, 4.6));

    assert.deepEqual(game.calls, [ [ 'tile', 3, 5, NO_MODIFIERS ] ]);
    assert.deepEqual(ui.canvas, [], 'the UI canvas handler is bypassed');
    assert.deepEqual(ui.objectEvents, [], 'no tile event reaches the UI, so no walk is sent');
});

await test('in game mode a pointer move over the floor calls onMouseMove with the tile', () => {
    const { game, ui, handler, floorObject } = setup({ gameMode: true });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_MOVE, 8), floorObject(6, 1.4));

    assert.deepEqual(game.calls, [ [ 'move', 6, 1 ] ]);
    assert.deepEqual(ui.objectEvents, []);
});

await test('in game mode a click on a user calls onUserClick and the floor behind it does not walk', () => {
    const { game, ui, handler, floorObject } = setup({ gameMode: true });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 9), { id: 12, type: 'user' });
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 9), floorObject(2, 2));

    assert.deepEqual(game.calls, [ [ 'user', 12, NO_MODIFIERS ] ]);
    assert.deepEqual(ui.canvas, []);
    assert.deepEqual(ui.objectEvents, []);

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 10), floorObject(2, 2));

    assert.deepEqual(game.calls.at(-1), [ 'tile', 2, 2, NO_MODIFIERS ], 'the next click on the floor is a tile click again');
});

await test('in game mode Shift and Alt reach the handler on a tile click and on a player click', () => {
    const { game, handler, floorObject } = setup({ gameMode: true });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 20, { shiftKey: true }), floorObject(1, 1));
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 21, { altKey: true }), floorObject(2, 1));
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 22, { altKey: true, shiftKey: true }), floorObject(3, 1));
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 23, { shiftKey: true }), { id: 7, type: 'user' });
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 24, { altKey: true }), { id: 8, type: 'user' });
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 25, { altKey: true, shiftKey: true }), { id: 9, type: 'user' });

    assert.deepEqual(game.calls, [
        [ 'tile', 1, 1, { shift: true, alt: false } ],
        [ 'tile', 2, 1, { shift: false, alt: true } ],
        [ 'tile', 3, 1, { shift: true, alt: true } ],
        [ 'user', 7, { shift: true, alt: false } ],
        [ 'user', 8, { shift: false, alt: true } ],
        [ 'user', 9, { shift: true, alt: true } ],
    ]);
});

await test('in game mode entering a player reports it and leaving it reports null', () => {
    const { game, ui, handler } = setup({ gameMode: true });
    const first = { id: 4, type: 'user' };
    const second = { id: 6, type: 'user' };

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 30), first);
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_MOVE, 31), first);
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 32), second);
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OUT, 32), first);
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OUT, 33), second);
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OUT, 34), first);

    assert.deepEqual(game.calls, [ [ 'hover', 4 ], [ 'hover', 6 ], [ 'hover', null ] ]);
    assert.deepEqual(ui.canvas, []);
});

await test('outside game mode hovering a player never reaches the game handler', () => {
    const { game, ui, handler } = setup({ gameMode: false });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 40), { id: 4, type: 'user' });
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OUT, 41), { id: 4, type: 'user' });

    assert.deepEqual(ui.canvas, [ [ MouseEventType.ROLL_OVER, 'user' ], [ MouseEventType.ROLL_OUT, 'user' ] ]);
    assert.deepEqual(game.calls, []);
});

await test('in game mode furniture does not take the click, and nothing walks without a handler', () => {
    const { game, ui, handler, floorObject } = setup({ gameMode: true });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 11), { id: 5, type: 'chair', mouseHandler: { mouseEvent: () => assert.fail('furni logic must not run') } });

    assert.deepEqual(game.calls, []);

    const bare = setup({ gameMode: true, withHandler: false });

    bare.handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 12), bare.floorObject(1, 1));

    assert.deepEqual(bare.ui.canvas, []);
    assert.deepEqual(bare.ui.objectEvents, []);
    assert.deepEqual(ui.objectEvents, []);
    assert.equal(typeof floorObject, 'function');
});

await test('in game mode the object events that are not mouse events still reach the UI', () => {
    const { game, ui, handler } = setup({ gameMode: true });
    const event = new RoomObjectEvent('ROSCE_STATE_CHANGE', 4, 'chair');

    handler.handleRoomObjectEvent(event);

    assert.deepEqual(ui.objectEvents, [ event ]);
    assert.deepEqual(game.calls, []);
});

await test('outside game mode a tile click goes to the UI as before and the game handler is never called', () => {
    const { game, ui, handler, floorObject } = setup({ gameMode: false });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 13), floorObject(3, 4));
    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.MOUSE_CLICK, 14), { id: 12, type: 'user' });

    assert.deepEqual(ui.canvas, [ [ MouseEventType.MOUSE_CLICK, 'room' ], [ MouseEventType.MOUSE_CLICK, 'user' ] ]);
    assert.equal(ui.objectEvents.length, 1);
    assert.ok(ui.objectEvents[0] instanceof RoomObjectTileMouseEvent);
    assert.equal(ui.objectEvents[0].tileXAsInt, 3);
    assert.deepEqual(game.calls, []);
});

const roomDependencies = {
    '@nitrodevco/nitro-api': stubModule({ RoomObjectCategoryEnum, RoomObjectVariableEnum }),
    './RoomEventHandler': { RoomEventHandler },
};

const loadRoom = (clock) => {
    const { Room } = load('nitro-renderer/src/room/Room', roomDependencies, { performance: { now: () => clock.next() } });

    return Room;
};

const steppingClock = (step) => {
    let now = 0;

    return { next: () => (now += step) };
};

const roomWithQueuedFurniture = (Room, count) => {
    const room = new Room(1);
    const built = [];

    for (let id = 1; id <= count; id++) room._floorStack.set(id, { objectId: id });

    room.addFurnitureFloorFromData = data => built.push(data.objectId);
    room.getRoomObjectRoom = () => undefined;

    return { room, built };
};

const modelRecorder = () => {
    const values = new Map();

    return { values, model: { setValue: (key, value) => values.set(key, value), getValue: key => values.get(key) } };
};

await test('outside game mode the furniture queue keeps its frame budget', () => {
    const Room = loadRoom(steppingClock(100));
    const { room, built } = roomWithQueuedFurniture(Room, 10);

    assert.equal(room.gameMode, false);
    assert.equal(room.createPendingFurniture(0, 30), true);
    assert.deepEqual(built, [ 1, 2, 3, 4 ]);
});

await test('in game mode the furniture queue has no creation budget', () => {
    const Room = loadRoom(steppingClock(100));
    const { room, built } = roomWithQueuedFurniture(Room, 10);

    room.setGameMode(true);

    assert.equal(room.createPendingFurniture(0, 30), false);
    assert.deepEqual(built, [ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 ]);
});

await test('game mode hides the room planes and gives them back when it ends', () => {
    const Room = loadRoom(steppingClock(1));
    const room = new Room(1);
    const { values, model } = modelRecorder();

    room.getRoomObjectRoom = () => ({ model });

    room.setGameMode(true);
    assert.equal(room.gameMode, true);
    assert.equal(values.get(RoomObjectVariableEnum.RoomPlanesHidden), 1);

    room.setGameMode(false);
    assert.equal(room.gameMode, false);
    assert.equal(values.get(RoomObjectVariableEnum.RoomPlanesHidden), 0);
});

await test('the room keeps the game input handler it is given', () => {
    const Room = loadRoom(steppingClock(1));
    const room = new Room(1);
    const handler = recordingGameHandler();

    assert.equal(room.gameInputHandler, undefined);

    room.setGameInputHandler(handler);
    assert.equal(room.gameInputHandler, handler);

    room.setGameInputHandler(undefined);
    assert.equal(room.gameInputHandler, undefined);
});

await test('the room engine switches game mode and the input handler on the room it names', () => {
    const { RoomEngine } = load('nitro-renderer/src/room/RoomEngine', { '@nitrodevco/nitro-api': stubModule({ RoomObjectCategoryEnum, RoomObjectVariableEnum }) });
    const engine = new RoomEngine();
    const calls = [];
    const handler = recordingGameHandler();

    engine._rooms.set(0x7FFF5357, { setGameMode: flag => calls.push([ 'mode', flag ]), setGameInputHandler: value => calls.push([ 'handler', value ]) });

    engine.setRoomGameMode(0x7FFF5357, true);
    engine.setRoomGameInputHandler(0x7FFF5357, handler);
    engine.setRoomGameMode(0x7FFF5357, false);
    engine.setRoomGameMode(42, true);
    engine.setRoomGameInputHandler(42, handler);

    assert.deepEqual(calls, [ [ 'mode', true ], [ 'handler', handler ], [ 'mode', false ] ]);
});

await test('room planes are drawn see-through, still hit-testable, while the room object says they are hidden', () => {
    const { RoomVisualization } = load('nitro-renderer/src/room/object/visualization/room/RoomVisualization', {
        '@nitrodevco/nitro-api': stubModule({ RoomObjectVariableEnum }),
    });
    const { model } = modelRecorder();
    const sprites = [ { alpha: 255, alphaTolerance: 128 }, { alpha: 255, alphaTolerance: 128 } ];
    const visualization = { _planesHidden: false, sprites };
    const updatePlanesHidden = RoomVisualization.prototype.updatePlanesHidden;

    assert.equal(updatePlanesHidden.call(visualization, model), false, 'nothing changes while the flag is unset');
    assert.deepEqual(sprites.map(sprite => sprite.alpha), [ 255, 255 ]);

    model.setValue(RoomObjectVariableEnum.RoomPlanesHidden, 1);
    assert.equal(updatePlanesHidden.call(visualization, model), true);
    assert.deepEqual(sprites.map(sprite => sprite.alpha), [ 0, 0 ]);
    assert.deepEqual(sprites.map(sprite => sprite.alphaTolerance), [ 128, 128 ]);

    model.setValue(RoomObjectVariableEnum.RoomPlanesHidden, 0);
    assert.equal(updatePlanesHidden.call(visualization, model), true);
    assert.deepEqual(sprites.map(sprite => sprite.alpha), [ 255, 255 ]);
});

await test('the factories build the snowwar visualizations and a plain logic for game_snowball and game_snowsplash', () => {
    const objects = stubModule({});
    const { RoomObjectVisualizationFactory } = load('nitro-renderer/src/room/factories/RoomObjectVisualizationFactory', {
        '@nitrodevco/nitro-api': stubModule({ RoomObjectVisualizationType }),
        '../object': objects,
    });
    const factory = new RoomObjectVisualizationFactory();

    assert.equal(RoomObjectVisualizationType.GAME_SNOWBALL, 'game_snowball');
    assert.equal(RoomObjectVisualizationType.GAME_SNOWSPLASH, 'game_snowsplash');
    assert.equal(factory.getVisualizationType('game_snowball'), objects.SnowballVisualization);
    assert.equal(factory.getVisualizationType('game_snowsplash'), objects.SnowSplashVisualization);
    assert.equal(factory.getVisualizationType('something_else'), objects.FurnitureVisualization);
    assert.ok(factory.getVisualizationData('game_snowball', 'game_snowball', undefined) instanceof objects.SnowWarGameVisualizationData);
    assert.ok(factory.getVisualizationData('game_snowsplash', 'game_snowsplash', undefined) instanceof objects.SnowWarGameVisualizationData);

    const { RoomObjectLogicFactory } = load('nitro-renderer/src/room/factories/RoomObjectLogicFactory', {
        '@nitrodevco/nitro-api': stubModule({ RoomObjectLogicType }),
        '../object': objects,
    });
    const logicFactory = new RoomObjectLogicFactory();

    assert.equal(logicFactory.getLogicType('game_snowball'), objects.ObjectLogicBase);
    assert.equal(logicFactory.getLogicType('game_snowsplash'), objects.ObjectLogicBase);
    assert.equal(logicFactory.getLogicType('something_else'), objects.FurnitureLogic);
});

await test('the content loader files the game objects under their own categories and never downloads them', () => {
    const { RoomContentLoader } = load('nitro-renderer/src/room/RoomContentLoader', {
        '@nitrodevco/nitro-api': stubModule({
            RoomObjectCategoryEnum,
            RoomObjectLogicType,
            RoomObjectUserTypeName: { User: 'user', Pet: 'pet', Bot: 'bot', RentableBot: 'rentable_bot' },
            RoomObjectUserType: { User: 1 },
            RoomObjectUserTypeUtils: { getAvatarRealTypeByName: name => (name === 'user' ? 1 : 0) },
        }),
    });
    const loader = { _activeObjects: {}, _wallItems: {}, _pets: {} };
    const { getCategoryForType, isLoaderType } = RoomContentLoader.prototype;

    assert.equal(getCategoryForType.call(loader, 'game_snowball'), RoomObjectCategoryEnum.Snowball);
    assert.equal(getCategoryForType.call(loader, 'game_snowsplash'), RoomObjectCategoryEnum.SnowSplash);
    assert.equal(getCategoryForType.call(loader, 'room'), RoomObjectCategoryEnum.Room);
    assert.equal(isLoaderType.call(loader, 'game_snowball'), false);
    assert.equal(isLoaderType.call(loader, 'game_snowsplash'), false);
    assert.equal(isLoaderType.call(loader, 'chair'), true);
});

await test('the hovered player is forgotten when he is removed or the game mode ends, and the handler hears null', () => {
    const { game, handler } = setup({ gameMode: true });

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 50), { id: 4, type: 'user' });
    handler.clearGameHover(9);
    assert.deepEqual(game.calls, [ [ 'hover', 4 ] ], 'another player leaving changes nothing');

    handler.clearGameHover(4);
    assert.deepEqual(game.calls, [ [ 'hover', 4 ], [ 'hover', null ] ]);

    handler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 51), { id: 4, type: 'user' });
    assert.deepEqual(game.calls.at(-1), [ 'hover', 4 ], 'the same player can be hovered again');

    handler.clearGameHover();
    handler.clearGameHover();
    assert.deepEqual(game.calls.slice(-2), [ [ 'hover', 4 ], [ 'hover', null ] ], 'nothing hovered, nothing heard');
});

const fakeSprite = () => ({ alpha: 255, visible: true, offsetX: 0, offsetY: 0, relativeDepth: 0, texture: undefined, alphaTolerance: 0 });

class FakeSpriteVisualization {
    constructor() {
        this.sprites = [];
        this.updateSpriteCounter = 0;
        this.object = undefined;
    }

    createSprites(count) {
        this.sprites = Array.from({ length: count }, fakeSprite);
    }

    getSprite(index) {
        return this.sprites[index];
    }
}

const fakeTexture = { width: 8, height: 4 };
const gameAssets = { SnowWarGameAssets: { SPLASH_FRAME_COUNT: 3, SPLASH_DURATION_MS: 50, getBall: () => fakeTexture, getShadow: () => fakeTexture, getSplashFrame: () => fakeTexture } };
class FakeVector3d {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}

const visualizationDependencies = {
    '@nitrodevco/nitro-api': stubModule({ AlphaTolerance: { MATCH_NOTHING: 256 }, Vector3d: FakeVector3d }),
    '../RoomObjectSpriteVisualization': { RoomObjectSpriteVisualization: FakeSpriteVisualization },
    './SnowWarGameAssets': gameAssets,
};

await test('the snowball shadow fades with height: opacity max(0, 100 - offset / 10) on the 0-255 scale', () => {
    const { SnowballVisualization } = load('nitro-renderer/src/room/object/visualization/game/SnowballVisualization', visualizationDependencies);
    const shadowAt = (offset) => {
        const visualization = new SnowballVisualization();
        const geometry = { updateId: 1, scale: 32, getScreenPosition: location => ({ x: 0, y: (location.z === 0) ? offset : 0, z: 0 }) };

        visualization.initialize({});
        visualization.object = { updateCounter: 1, getLocation: () => ({ x: 1, y: 1, z: 2 }) };
        visualization.update(geometry, 0, false, false);

        return visualization.getSprite(1).alpha;
    };

    assert.equal(shadowAt(0), 100);
    assert.equal(shadowAt(32), 96.8);
    assert.equal(shadowAt(500), 50);
    assert.equal(shadowAt(1200), 0);
});

await test('a splash shows 3 frames in about 50 ms and stops redrawing after the last one', () => {
    const { SnowSplashVisualization } = load('nitro-renderer/src/room/object/visualization/game/SnowSplashVisualization', visualizationDependencies);
    const visualization = new SnowSplashVisualization();
    const geometry = { updateId: 1, scale: 32 };
    const visibleAt = [];

    visualization.initialize({});
    visualization.object = {};

    for (const time of [ 1000, 1010, 1020, 1035, 1049, 1051, 1100, 1200, 1300 ]) {
        visualization.update(geometry, time, false, false);
        visibleAt.push(visualization.getSprite(0).visible);
    }

    assert.deepEqual(visibleAt, [ true, true, true, true, true, false, false, false, false ]);

    const counter = visualization.updateSpriteCounter;

    visualization.update(geometry, 1400, false, false);
    visualization.update(geometry, 1500, false, false);
    assert.equal(visualization.updateSpriteCounter, counter, 'a finished splash is not redrawn');
});

await test('the room forgets the hovered player when game mode ends or when his avatar is removed', () => {
    const Room = loadRoom(steppingClock(1));
    const room = new Room(1);
    const game = recordingGameHandler();
    const { model } = modelRecorder();

    room.getRoomObjectRoom = () => ({ model });
    room.getRoomObjectCategoryForType = type => categories[type] ?? RoomObjectCategoryEnum.Minimum;
    room.setGameMode(true);
    room.setGameInputHandler(game);

    room.getRoomObjectManager = () => ({ getObject: () => undefined });
    room.eventHandler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 60), { id: 4, type: 'user' });
    room.removeRoomObject(4, RoomObjectCategoryEnum.Unit);
    assert.deepEqual(game.calls, [ [ 'hover', 4 ] ], 'no avatar 4 in the room: nothing removed');

    const tornDown = [];

    room.getRoomObjectManager = () => ({ getObject: id => ({ instanceId: id, tearDown: () => tornDown.push(id) }), removeObject: () => {} });
    room.dispatchEvent = () => {};
    room.removeRoomObject(4, RoomObjectCategoryEnum.Unit);
    assert.deepEqual(game.calls, [ [ 'hover', 4 ], [ 'hover', null ] ]);
    assert.deepEqual(tornDown, [ 4 ]);

    room.eventHandler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 61), { id: 5, type: 'user' });
    room.setGameMode(false);
    assert.deepEqual(game.calls.slice(-2), [ [ 'hover', 5 ], [ 'hover', null ] ]);

    room.setGameMode(true);
    room.eventHandler.handleRoomCanvasMouseEvent(canvasEvent(MouseEventType.ROLL_OVER, 62), { id: 6, type: 'user' });
    room.clearGameHover();
    assert.deepEqual(game.calls.slice(-2), [ [ 'hover', 6 ], [ 'hover', null ] ], 'the pointer leaving the canvas forgets him too');
});
