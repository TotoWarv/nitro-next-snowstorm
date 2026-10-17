import { IMessageDataWrapper } from '@nitrodevco/nitro-api';

export interface SnowWarPlayerData {
    referenceId: number;
    userName: string;
    figure: string;
    gender: string;
    teamId: number;
}

export const SnowWarPlayerDataParser = (wrapper: IMessageDataWrapper): SnowWarPlayerData => {
    const referenceId = wrapper.readInt();
    const userName = wrapper.readString();
    const figure = wrapper.readString();
    const gender = wrapper.readString();
    const teamId = wrapper.readInt();

    return { referenceId, userName, figure, gender, teamId };
};
