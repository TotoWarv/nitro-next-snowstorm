import type { SnowWarGameEventData } from '@nitrodevco/nitro-packets';

import { SnowWarConstants } from './SnowWarConstants';
import { applySnowWarEvent } from './SnowWarEventApplier';
import { resolveSnowWarEvents } from './SnowWarEventResolver';
import type { SnowWarWorld } from './SnowWarWorld';

export const runSnowWarTurn = (world: SnowWarWorld, turn: number, subturns: readonly (readonly SnowWarGameEventData[])[]): number => {
    const resolved = resolveSnowWarEvents(world, subturns);

    for (let subturn = 0; subturn < SnowWarConstants.SUBTURNS_PER_TURN; subturn++) {
        for (const event of resolved) {
            if (event.subturn === subturn) applySnowWarEvent(world, event);
        }

        world.updateObjects();
        world.removeInactive();
    }

    return world.computeChecksum(turn);
};
