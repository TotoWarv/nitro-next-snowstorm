import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

import ts from 'typescript';

const load = () => {
    const source = readFileSync(new URL('../packages/nitro-renderer/src/avatar/resolveAvatarSpriteAsset.ts', import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const exports = {};
    const dependencies = { '@nitrodevco/nitro-api': { AvatarScaleType: { Large: 'h', LargeToSmall: 'h_50', Small: 'sh' } } };

    runInNewContext(outputText, {
        exports,
        require: (dependency) => {
            assert.ok(Object.hasOwn(dependencies, dependency), `Unexpected dependency: ${dependency}`);

            return dependencies[dependency];
        },
    });

    return exports;
};

const { resolveAvatarSpriteAsset } = load();

const library = (...names) => {
    const asked = [];
    const reduced = [];

    return {
        asked,
        reduced,
        source: (scale, largeScaledSmall) => ({
            scale,
            largeScaledSmall,
            getAsset: (name) => {
                asked.push(name);

                return names.includes(name) ? { name } : undefined;
            },
            reduce: (asset) => {
                reduced.push(asset.name);

                return { name: asset.name, reducedFrom: asset.name };
            },
        }),
    };
};

await test('a zoomed-out avatar draws a large-only effect sprite (crosshair 98) from its large asset reduced', () => {
    const effects = library('h_std_fx98_1_1_0_0');

    const asset = resolveAvatarSpriteAsset(effects.source('sh', true), 'std_fx98_1_1', 0, 0);

    assert.deepEqual({ ...asset }, { name: 'h_std_fx98_1_1_0_0', reducedFrom: 'h_std_fx98_1_1_0_0' });
    assert.deepEqual(effects.asked, [ 'sh_std_fx98_1_1_0_0', 'h_std_fx98_1_1_0_0' ]);
});

await test('team markers 95 and 96 follow their animation frame and direction in the zoomed-out arena', () => {
    const effects = library('h_std_fx95_1_1_0_3', 'h_std_fx96_1_1_4_2');

    assert.equal(resolveAvatarSpriteAsset(effects.source('sh', true), 'std_fx95_1_1', 0, 3)?.reducedFrom, 'h_std_fx95_1_1_0_3');
    assert.equal(resolveAvatarSpriteAsset(effects.source('sh', true), 'std_fx96_1_1', 4, 2)?.reducedFrom, 'h_std_fx96_1_1_4_2');
});

await test('a small asset of its own is drawn as it is, never reduced', () => {
    const effects = library('sh_std_fx12_1_0_0', 'h_std_fx12_1_0_0');

    assert.deepEqual({ ...resolveAvatarSpriteAsset(effects.source('sh', true), 'std_fx12_1', 0, 0) }, { name: 'sh_std_fx12_1_0_0' });
    assert.deepEqual(effects.reduced, []);
});

await test('a large avatar draws its large asset, and a plain small avatar does not borrow the large one', () => {
    const effects = library('h_std_fx98_1_1_0_0');

    assert.deepEqual({ ...resolveAvatarSpriteAsset(effects.source('h', false), 'std_fx98_1_1', 0, 0) }, { name: 'h_std_fx98_1_1_0_0' });
    assert.equal(resolveAvatarSpriteAsset(effects.source('sh', false), 'std_fx98_1_1', 0, 0), undefined);
    assert.deepEqual(effects.reduced, []);
});

await test('a sprite missing at both sizes draws nothing', () => {
    assert.equal(resolveAvatarSpriteAsset(library().source('sh', true), 'std_fx98_1_1', 0, 0), undefined);
});
