import { useStore } from 'zustand';

import { SnowWarStore, snowWarStore } from './store';

export const useSnowWarStore = <T>(selector: (state: SnowWarStore) => T) => useStore(snowWarStore, selector);
