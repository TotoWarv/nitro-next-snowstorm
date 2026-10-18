import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const load = () => {
    const source = readFileSync(new URL('../packages/nitro-renderer/src/room/object/visualization/furniture/backgroundImageOffset.ts', import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    const dependencies = { '@nitrodevco/nitro-api': { RoomGeometryScaleType: { ZoomedIn: 64, ZoomedOut: 32, AvatarSizeNormal: 48, Icon: 1, None: -1 } } };

    runInNewContext(outputText, {
        exports,
        require: (dependency) => {
            assert.ok(Object.hasOwn(dependencies, dependency), `Unexpected dependency: ${dependency}`);

            return dependencies[dependency];
        },
    });

    return exports;
};

const { backgroundImageOffset } = load();

const FIGHT_NIGHT = '/cms/flash-files/c_images/snowstorm_client/official/snst_bg_3_noscale.png';
const ARCTIC_ISLAND = '/cms/flash-files/c_images/snowstorm_client/official/snst_bg_1_a_big.png';

await test('a noscale backdrop seen zoomed out takes half of its offsets, like the doubled arena backdrops it sits beside', () => {
    assert.equal(backgroundImageOffset(-1096, FIGHT_NIGHT, 32), -548);
    assert.equal(backgroundImageOffset(1444, FIGHT_NIGHT, 32), 722);
});

await test('a doubled arena backdrop keeps its offsets when zoomed out', () => {
    assert.equal(backgroundImageOffset(-1160, ARCTIC_ISLAND, 32), -1160);
    assert.equal(backgroundImageOffset(1554, ARCTIC_ISLAND, 32), 1554);
});

await test('a noscale backdrop keeps its offsets at full size and a background without image is untouched', () => {
    assert.equal(backgroundImageOffset(1444, FIGHT_NIGHT, 64), 1444);
    assert.equal(backgroundImageOffset(30, undefined, 32), 30);
});
