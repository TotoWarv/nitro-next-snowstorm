import type { SnowWarGameEventData } from '@nitrodevco/nitro-packets';

import { SnowWarConstants } from './SnowWarConstants';
import { applySnowWarEvent } from './SnowWarEventApplier';
import { resolveSnowWarEvents } from './SnowWarEventResolver';
import type { SnowWarResolvedEvent } from './SnowWarResolvedEvent';
import type { SnowWarWorld } from './SnowWarWorld';

export const runSnowWarSubturn = (world: SnowWarWorld, resolved: readonly SnowWarResolvedEvent[], subturn: number): void => {
    for (const event of resolved) {
        if (event.subturn === subturn) applySnowWarEvent(world, event);
    }

    world.updateObjects();
    world.removeInactive();
};

export const runSnowWarTurn = (world: SnowWarWorld, turn: number, subturns: readonly (readonly SnowWarGameEventData[])[]): number => {
    const resolved = resolveSnowWarEvents(world, subturns);

    for (let subturn = 0; subturn < SnowWarConstants.SUBTURNS_PER_TURN; subturn++) runSnowWarSubturn(world, resolved, subturn);

    return world.computeChecksum(turn);
};
