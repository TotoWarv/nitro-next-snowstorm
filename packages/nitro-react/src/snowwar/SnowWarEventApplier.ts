import { SnowWarEventType } from './SnowWarConstants';
import type { SnowWarResolvedEvent } from './SnowWarResolvedEvent';
import { SnowWarSnowball } from './SnowWarSnowball';
import type { SnowWarWorld } from './SnowWarWorld';

export const applySnowWarEvent = (world: SnowWarWorld, event: SnowWarResolvedEvent): void => {
    switch (event.type) {
        case SnowWarEventType.HumanLeftGame:
            event.human.leave(world);
            break;
        case SnowWarEventType.NewMoveTarget:
            event.human.setMoveTarget(event.x, event.y);
            break;
        case SnowWarEventType.HumanThrowsSnowballAtHuman:
            if (event.human.throwAt(event.target.x, event.target.y)) world.happen({ kind: 'snowballThrown', humanId: event.human.id });
            break;
        case SnowWarEventType.HumanThrowsSnowballAtPosition:
            if (event.human.throwAt(event.x, event.y)) world.happen({ kind: 'snowballThrown', humanId: event.human.id });
            break;
        case SnowWarEventType.HumanStartsToMakeASnowball:
            if (event.human.startMakingSnowball()) world.happen({ kind: 'snowballMakingStarted', humanId: event.human.id });
            break;
        case SnowWarEventType.CreateSnowball:
            if (!world.contains(event.snowballId)) world.add(SnowWarSnowball.create(event.snowballId, event.human.id, event.human.x, event.human.y, event.x, event.y, event.trajectory));
            break;
        case SnowWarEventType.MachineCreatesSnowball:
            event.machine.addSnowball();
            break;
        case SnowWarEventType.HumanGetsSnowballsFromMachine:
            if (event.human.receiveSnowball(event.source)) world.happen({ kind: 'snowballPicked', humanId: event.human.id, sourceId: event.sourceId });
            break;
        case SnowWarEventType.RayGunBurst:
            event.human.fireRayGun(world, event.rayGun, event.firstSnowballId);
            world.happen({ kind: 'rayGunFired', humanId: event.human.id, fuseId: event.rayGun.fuseId });
            break;
    }
};
