import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarCount, SnowWarListLimits } from './SnowWarBoundedList';

export enum SnowWarGameEventTypeEnum {
    HumanLeftGame = 1,
    NewMoveTarget = 2,
    HumanThrowsSnowballAtHuman = 3,
    HumanThrowsSnowballAtPosition = 4,
    HumanStartsToMakeASnowball = 7,
    CreateSnowball = 8,
    MachineCreatesSnowball = 11,
    HumanGetsSnowballsFromMachine = 12,
    RayGunBurst = 100,
}

export interface SnowWarGameEventData {
    type: number;
    fields: number[];
}

export type SnowWarGameEventsRead = {
    events: SnowWarGameEventData[];
    complete: boolean;
};

const FIELD_COUNTS: Record<number, number> = {
    [SnowWarGameEventTypeEnum.HumanLeftGame]: 1,
    [SnowWarGameEventTypeEnum.NewMoveTarget]: 3,
    [SnowWarGameEventTypeEnum.HumanThrowsSnowballAtHuman]: 3,
    [SnowWarGameEventTypeEnum.HumanThrowsSnowballAtPosition]: 4,
    [SnowWarGameEventTypeEnum.HumanStartsToMakeASnowball]: 1,
    [SnowWarGameEventTypeEnum.CreateSnowball]: 5,
    [SnowWarGameEventTypeEnum.MachineCreatesSnowball]: 1,
    [SnowWarGameEventTypeEnum.HumanGetsSnowballsFromMachine]: 2,
    [SnowWarGameEventTypeEnum.RayGunBurst]: 3,
};

export const SnowWarGameEventDataParser = (wrapper: IMessageDataWrapper): SnowWarGameEventsRead => {
    const count = readSnowWarCount(wrapper, SnowWarListLimits.eventsPerSubturn);
    const events: SnowWarGameEventData[] = [];

    while ((events.length < count) && wrapper.bytesAvailable) {
        const type = wrapper.readInt();
        const fieldCount = FIELD_COUNTS[type];

        if (fieldCount === undefined) return { events, complete: false };

        events.push({ type, fields: Array.from({ length: fieldCount }, () => wrapper.readInt()) });
    }

    return { events, complete: true };
};
