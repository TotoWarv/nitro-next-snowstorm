import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarList, readSnowWarString, SnowWarListLimits, SnowWarMalformedPacketError } from './SnowWarBoundedList';

export enum SnowWarGameObjectTypeEnum {
    Snowball = 1,
    Tree = 2,
    Pile = 3,
    Machine = 4,
    Human = 5,
}

export interface SnowWarGameObjectData {
    type: number;
    id: number;
    variables: number[];
    strings: string[];
}

const VARIABLE_COUNTS: Record<number, number> = {
    [SnowWarGameObjectTypeEnum.Snowball]: 9,
    [SnowWarGameObjectTypeEnum.Tree]: 7,
    [SnowWarGameObjectTypeEnum.Pile]: 5,
    [SnowWarGameObjectTypeEnum.Machine]: 6,
    [SnowWarGameObjectTypeEnum.Human]: 17,
};

const STRING_COUNTS: Record<number, number> = {
    [SnowWarGameObjectTypeEnum.Human]: 4,
};

const readTimes = <T>(count: number, read: () => T): T[] => Array.from({ length: count }, read);

const SnowWarGameObjectParser = (wrapper: IMessageDataWrapper): SnowWarGameObjectData => {
    const type = wrapper.readInt();
    const variableCount = VARIABLE_COUNTS[type];

    if (variableCount === undefined) throw new SnowWarMalformedPacketError(`unknown game object type ${type}`);

    const id = wrapper.readInt();
    const variables = readTimes(variableCount, () => wrapper.readInt());
    const strings = readTimes(STRING_COUNTS[type] ?? 0, () => readSnowWarString(wrapper));

    return { type, id, variables, strings };
};

export const SnowWarGameObjectDataParser = (wrapper: IMessageDataWrapper): SnowWarGameObjectData[] => readSnowWarList(wrapper, SnowWarListLimits.gameObjects, SnowWarGameObjectParser);
