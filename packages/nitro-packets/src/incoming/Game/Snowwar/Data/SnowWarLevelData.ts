import { GetObjectDataFromWrapper, IMessageDataWrapper, IObjectData } from '@nitrodevco/nitro-api';

import { readSnowWarList, readSnowWarString, SnowWarListLimits } from './SnowWarBoundedList';

export interface SnowWarFuseObjectData {
    name: string;
    id: number;
    x: number;
    y: number;
    xDimension: number;
    yDimension: number;
    height: number;
    direction: number;
    altitude: number;
    canStandOn: boolean;
    stuffData: IObjectData;
}

export interface SnowWarLevelData {
    width: number;
    height: number;
    heightMap: string;
    fuseObjects: SnowWarFuseObjectData[];
}

const SnowWarFuseObjectDataParser = (wrapper: IMessageDataWrapper): SnowWarFuseObjectData => {
    const name = readSnowWarString(wrapper);
    const id = wrapper.readInt();
    const x = wrapper.readInt();
    const y = wrapper.readInt();
    const xDimension = wrapper.readInt();
    const yDimension = wrapper.readInt();
    const height = wrapper.readInt();
    const direction = wrapper.readInt();
    const altitude = wrapper.readInt();
    const canStandOn = wrapper.readBoolean();
    const stuffData = GetObjectDataFromWrapper(wrapper);

    return { name, id, x, y, xDimension, yDimension, height, direction, altitude, canStandOn, stuffData };
};

export const SnowWarLevelDataParser = (wrapper: IMessageDataWrapper): SnowWarLevelData => {
    const width = wrapper.readInt();
    const height = wrapper.readInt();
    const heightMap = readSnowWarString(wrapper);
    const fuseObjects = readSnowWarList(wrapper, SnowWarListLimits.fuseObjects, SnowWarFuseObjectDataParser);

    return { width, height, heightMap, fuseObjects };
};
