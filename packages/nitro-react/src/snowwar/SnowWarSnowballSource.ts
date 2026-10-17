export interface ISnowWarSnowballSource {
    tryTakeSnowball(): boolean;
}

export const isSnowballSource = (value: object): value is ISnowWarSnowballSource => typeof (value as Partial<ISnowWarSnowballSource>).tryTakeSnowball === 'function';
