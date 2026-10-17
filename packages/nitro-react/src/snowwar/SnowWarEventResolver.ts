import type { SnowWarGameEventData } from '@nitrodevco/nitro-packets';

import { SnowWarConstants, SnowWarEventType, SnowWarTrajectory } from './SnowWarConstants';
import type { SnowWarHuman } from './SnowWarHuman';
import { SnowWarMachine } from './SnowWarMachine';
import type { SnowWarResolvedEvent } from './SnowWarResolvedEvent';
import { isSnowballSource } from './SnowWarSnowballSource';
import type { SnowWarWorld } from './SnowWarWorld';

const FIELD_COUNTS: Readonly<Record<number, number>> = {
    [SnowWarEventType.HumanLeftGame]: 1,
    [SnowWarEventType.NewMoveTarget]: 3,
    [SnowWarEventType.HumanThrowsSnowballAtHuman]: 3,
    [SnowWarEventType.HumanThrowsSnowballAtPosition]: 4,
    [SnowWarEventType.HumanStartsToMakeASnowball]: 1,
    [SnowWarEventType.CreateSnowball]: 5,
    [SnowWarEventType.MachineCreatesSnowball]: 1,
    [SnowWarEventType.HumanGetsSnowballsFromMachine]: 2,
    [SnowWarEventType.RayGunBurst]: 3,
};

interface SnowWarTimedEvent {
    readonly subturn: number;
    readonly type: SnowWarEventType;
    readonly fields: readonly number[];
}

const isTrajectory = (value: number): value is SnowWarTrajectory => SnowWarTrajectory[value] !== undefined;

const hasShape = ({ subturn, type, fields }: SnowWarTimedEvent): boolean => (subturn >= 0) && (subturn < SnowWarConstants.SUBTURNS_PER_TURN) && (fields.length === FIELD_COUNTS[type]);

const timedEventsOf = (subturns: readonly (readonly SnowWarGameEventData[])[]): SnowWarTimedEvent[] => subturns.flatMap((events, subturn) => events.map(({ type, fields }) => ({ subturn, type, fields })));

const resolveHumanEvent = (world: SnowWarWorld, { subturn, type, fields: f }: SnowWarTimedEvent, human: SnowWarHuman): SnowWarResolvedEvent | null => {
    switch (type) {
        case SnowWarEventType.NewMoveTarget:
            return { type: SnowWarEventType.NewMoveTarget, subturn, human, x: f[1], y: f[2] };
        case SnowWarEventType.HumanStartsToMakeASnowball:
            return { type: SnowWarEventType.HumanStartsToMakeASnowball, subturn, human };
        case SnowWarEventType.HumanThrowsSnowballAtPosition:
            return isTrajectory(f[3]) ? { type: SnowWarEventType.HumanThrowsSnowballAtPosition, subturn, human, x: f[1], y: f[2] } : null;
        case SnowWarEventType.CreateSnowball:
            return isTrajectory(f[4]) ? { type: SnowWarEventType.CreateSnowball, subturn, human, snowballId: f[0], x: f[2], y: f[3], trajectory: f[4] } : null;
        case SnowWarEventType.HumanThrowsSnowballAtHuman: {
            const target = world.findActiveHuman(f[1]);

            return target ? { type: SnowWarEventType.HumanThrowsSnowballAtHuman, subturn, human, target } : null;
        }
        case SnowWarEventType.HumanGetsSnowballsFromMachine: {
            const source = world.findActive(f[1]);

            return (source && isSnowballSource(source)) ? { type: SnowWarEventType.HumanGetsSnowballsFromMachine, subturn, human, source, sourceId: source.id } : null;
        }
        case SnowWarEventType.RayGunBurst: {
            const rayGun = world.findRayGun(f[1]);

            return rayGun ? { type: SnowWarEventType.RayGunBurst, subturn, human, rayGun, firstSnowballId: f[2] } : null;
        }
        default:
            return null;
    }
};

const resolveEvent = (world: SnowWarWorld, event: SnowWarTimedEvent, leaving: ReadonlySet<number>): SnowWarResolvedEvent | null => {
    const { subturn, type, fields: f } = event;

    if (type === SnowWarEventType.MachineCreatesSnowball) {
        const machine = world.findActive(f[0]);

        return (machine instanceof SnowWarMachine) ? { type: SnowWarEventType.MachineCreatesSnowball, subturn, machine } : null;
    }

    const human = world.findActiveHuman((type === SnowWarEventType.CreateSnowball) ? f[1] : f[0]);

    if (!human) return null;

    if (type === SnowWarEventType.HumanLeftGame) return { type: SnowWarEventType.HumanLeftGame, subturn, human };

    if (leaving.has(human.id)) return null;

    return resolveHumanEvent(world, event, human);
};

export const resolveSnowWarEvents = (world: SnowWarWorld, subturns: readonly (readonly SnowWarGameEventData[])[]): SnowWarResolvedEvent[] => {
    const events = timedEventsOf(subturns).filter(hasShape);
    const leaving = new Set(events
        .filter(({ type, fields }) => (type === SnowWarEventType.HumanLeftGame) && world.findActiveHuman(fields[0]))
        .map(({ fields }) => fields[0]));

    return events.map(event => resolveEvent(world, event, leaving)).filter(event => event !== null);
};
