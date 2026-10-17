import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

import { readSnowWarString } from './SnowWarBoundedList';

export interface SnowWarPlayerData {
    referenceId: number;
    userName: string;
    figure: string;
    gender: string;
    teamId: number;
}

export const SnowWarPlayerDataParser = (wrapper: IMessageDataWrapper): SnowWarPlayerData => {
    const referenceId = wrapper.readInt();
    const userName = readSnowWarString(wrapper);
    const figure = readSnowWarString(wrapper);
    const gender = readSnowWarString(wrapper);
    const teamId = wrapper.readInt();

    return { referenceId, userName, figure, gender, teamId };
};
