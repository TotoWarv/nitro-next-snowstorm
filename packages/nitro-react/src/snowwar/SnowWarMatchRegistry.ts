import type { SnowWarMatch } from './SnowWarMatch';

let currentMatch: SnowWarMatch | undefined = undefined;

export const getSnowWarMatch = (): SnowWarMatch | undefined => currentMatch;

export const setSnowWarMatch = (match: SnowWarMatch | undefined): void => {
    if (currentMatch && (currentMatch !== match)) currentMatch.dispose();

    currentMatch = match;
};
