import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarList, SnowWarListLimits, SnowWarMalformedPacketError } from './SnowWarBoundedList';

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

const SnowWarGameEventParser = (wrapper: IMessageDataWrapper): SnowWarGameEventData => {
    const type = wrapper.readInt();
    const fieldCount = FIELD_COUNTS[type];

    if (fieldCount === undefined) throw new SnowWarMalformedPacketError(`unknown game event type ${type}`);

    return { type, fields: Array.from({ length: fieldCount }, () => wrapper.readInt()) };
};

export const SnowWarGameEventDataParser = (wrapper: IMessageDataWrapper): SnowWarGameEventData[] => readSnowWarList(wrapper, SnowWarListLimits.eventsPerSubturn, SnowWarGameEventParser);
