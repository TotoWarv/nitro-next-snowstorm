import { AvatarGenderType } from '@nitrodevco/nitro-api';
import type { IGameLobbyPlayerData } from '@nitrodevco/nitro-packets';

import { SnowWarPhase } from './SnowWarPhase';
import type { SnowWarErrorView } from './SnowWarViews';

export const SNOWWAR_LIBRARY = 'habbo-games-com';
export const SNOWWAR_TEAM_BLUE = 1;
export const SNOWWAR_TEAM_RED = 2;
export const SNOWWAR_TEAM_BLUE_COLOR = 0x2F9EC9;
export const SNOWWAR_TEAM_RED_COLOR = 0xC34B48;
export const SNOWWAR_TIE_COLOR = 0x7D8A9A;
export const SNOWWAR_STAR_COUNT = 10;
export const SNOWWAR_MAX_LEVEL = 30;
export const SNOWWAR_MAX_SNOWBALLS = 5;
export const SNOWWAR_MAX_HEALTH = 5;
export const SNOWWAR_RESULT_TIE = 2;

const LEVELS_PER_TIER = 10;
const STAR_TIERS = [ 'bronze', 'silver', 'gold' ] as const;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;
const SCREEN_PHASES = [ SnowWarPhase.Loading, SnowWarPhase.Starting, SnowWarPhase.Running, SnowWarPhase.Ending ];

export type SnowWarStarTier = typeof STAR_TIERS[number];

export interface SnowWarStars {
    tier: SnowWarStarTier;
    filled: number;
}

export const snowWarAsset = (name: string): string => `${SNOWWAR_LIBRARY}-${name}`;

export const snowWarTemplate = (name: string): string => `${SNOWWAR_LIBRARY}/${name}`;

export const snowWarStarsOf = (level: number): SnowWarStars => {
    const clamped = Math.min(SNOWWAR_MAX_LEVEL, Math.max(1, Math.trunc(level) || 1));

    return { tier: STAR_TIERS[Math.floor((clamped - 1) / LEVELS_PER_TIER)], filled: ((clamped - 1) % LEVELS_PER_TIER) + 1 };
};

const pad = (value: number): string => String(value).padStart(2, '0');

export const formatSnowWarClock = (totalSeconds: number, padMinutes: boolean): string => {
    const seconds = Math.max(0, Math.ceil(totalSeconds));
    const minutes = Math.floor(seconds / SECONDS_PER_MINUTE);

    return `${padMinutes ? pad(minutes) : minutes}:${pad(seconds % SECONDS_PER_MINUTE)}`;
};

export const snowWarSecondsUntil = (endsAt: number, now: number): number => Math.max(0, Math.ceil((endsAt - now) / MS_PER_SECOND));

export const isSnowWarScreenPhase = (phase: SnowWarPhase): boolean => SCREEN_PHASES.includes(phase);

export const isSnowWarHidingHotel = ({ phase, results }: { phase: SnowWarPhase; results: unknown }): boolean => isSnowWarScreenPhase(phase) || (results !== undefined);

export const sortSnowWarPlayersByLevel = (players: readonly IGameLobbyPlayerData[]): IGameLobbyPlayerData[] => [ ...players ].sort((first, second) => second.skillLevel - first.skillLevel);

export const snowWarTeamColor = (team: number): number => ((team === SNOWWAR_TEAM_RED) ? SNOWWAR_TEAM_RED_COLOR : SNOWWAR_TEAM_BLUE_COLOR);

export const snowWarArenaPreviewAsset = (fieldType: number): string => snowWarAsset(`arena_${fieldType}_preview`);

export const snowWarArenaNameKey = (fieldType: number): string => `snowwar.field.name.${fieldType}`;

const JOINING_ERROR_KEYS: Readonly<Record<number, string>> = {
    2: 'snowwar.error.duplicate_machineid',
    6: 'snowwar.error.has_active_instance',
    7: 'snowwar.error.has_active_instance',
    8: 'snowwar.error.no_free_games_left',
};

const GAME_ALREADY_STARTED = 1;

export const snowWarErrorKey = ({ kind, reason }: SnowWarErrorView): string => {
    if (kind === 'joining') return JOINING_ERROR_KEYS[reason] ?? 'snowwar.error.generic';
    if ((kind === 'enterArena') && (reason === GAME_ALREADY_STARTED)) return 'snowwar.error.game_already_started';

    return 'snowwar.error.generic';
};

export const snowWarGenderOf = (gender: string): AvatarGenderType => ((gender.toUpperCase() === String(AvatarGenderType.Female)) ? AvatarGenderType.Female : AvatarGenderType.Male);
