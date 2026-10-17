import { IAssetData, IObjectVisualizationData } from '@nitrodevco/nitro-api';

export class SnowWarGameVisualizationData implements IObjectVisualizationData {
    public initialize(_asset: IAssetData | undefined): boolean {
        return true;
    }

    public dispose(): void {
        return;
    }
}
