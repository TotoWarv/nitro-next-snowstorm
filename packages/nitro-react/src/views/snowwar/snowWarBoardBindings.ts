import type { IGameLobbyPlayerData } from '@nitrodevco/nitro-packets';

import { SNOWWAR_TEAM_BLUE, SNOWWAR_TEAM_RED, snowWarArenaPreviewAsset, snowWarAsset, snowWarTemplate, sortSnowWarPlayersByLevel } from '#base/context/snowwar';
import type { Template, TemplateBindings } from '#base/theme';

import { snowWarLobbyRow } from './snowWarTeamRows';

const LOADING_FRAMES = 8;
const RESULT_ELEMENTS = [ 'team1ScoreContainer', 'team2ScoreContainer', 'mostKillsContainer', 'mostHitsContainer', 'statusContainer', 'buttonsContainer' ];

export const SNOWWAR_LOBBY_ROW_TEMPLATES = [ snowWarTemplate('snowwar_lobby_player_team_1'), snowWarTemplate('snowwar_lobby_player_team_2') ] as const;
export const SNOWWAR_RESULT_ROW_TEMPLATES = [ snowWarTemplate('snowwar_results_player_team_1'), snowWarTemplate('snowwar_results_player_team_2') ] as const;

export interface SnowWarWaitingBoard {
    templates: Readonly<Record<string, Template>> | undefined;
    players: readonly IGameLobbyPlayerData[];
    ownUserId: number;
    readyUserIds: readonly number[] | undefined;
    loadingFrame: number;
    fieldType: number;
    arenaName: string;
    loadingText: string;
    scoreLabel: string;
    title: string | undefined;
    onLeave: () => void;
}

export const snowWarLoadingAssetAt = (frame: number): string => snowWarAsset(`load_${(Math.abs(Math.trunc(frame)) % LOADING_FRAMES) + 1}`);

const teamRows = (board: SnowWarWaitingBoard, team: number) => {
    const template = board.templates?.[SNOWWAR_LOBBY_ROW_TEMPLATES[team - 1]];

    if (!template) return [];

    return sortSnowWarPlayersByLevel(board.players.filter(player => player.teamId === team)).map(player => snowWarLobbyRow(template, player, {
        own: player.userId === board.ownUserId,
        ready: !board.readyUserIds || board.readyUserIds.includes(player.userId),
        loadingFrame: board.loadingFrame,
        scoreLabel: board.scoreLabel,
    }));
};

export const snowWarWaitingBindings = (board: SnowWarWaitingBoard): TemplateBindings => ({
    ...Object.fromEntries(RESULT_ELEMENTS.map(name => [ name, { visible: false } ])),
    headerContainer: { visible: board.title !== undefined },
    endingInformation: { caption: board.title ?? '' },
    endingInformation_stroke: { caption: board.title ?? '' },
    team1PlayersList: { items: teamRows(board, SNOWWAR_TEAM_BLUE) },
    team2PlayersList: { items: teamRows(board, SNOWWAR_TEAM_RED) },
    loadingContainer: { visible: true },
    loadingText: { caption: board.loadingText, setCaptionAfterBuild: true },
    loadingText_stroke: { caption: board.loadingText, setCaptionAfterBuild: true },
    arenaPreview: { asset: snowWarArenaPreviewAsset(board.fieldType), pivot: 'center' },
    arenaName: { caption: board.arenaName, setCaptionAfterBuild: true },
    mainLoadingIcon: { asset: snowWarLoadingAssetAt(board.loadingFrame), pivot: 'center' },
    leave_link_region: { onPointerTap: board.onLeave },
});
