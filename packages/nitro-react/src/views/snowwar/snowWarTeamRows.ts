import type { IGameLobbyPlayerData, SnowWarTeamPlayerData } from '@nitrodevco/nitro-packets';
import { createElement } from 'react';

import { SNOWWAR_TEAM_RED, snowWarAsset } from '#base/context/snowwar';
import type { Template, TemplateBindings, TemplateItem } from '#base/theme';

import { SnowWarLoadingIcon } from './SnowWarLoadingIcon';
import { SnowWarPlayerHead } from './SnowWarPlayerHead';
import { SnowWarStars } from './SnowWarStars';

const IMAGE_WIDTH = 64;
const IMAGE_HEIGHT = 62;

export const snowWarTeamAssets = (team: number) => {
    const color = (team === SNOWWAR_TEAM_RED) ? 'red' : 'blue';

    return {
        square: snowWarAsset(`${color}_square`),
        infobox: snowWarAsset(`${color}_infobox`),
        ball: snowWarAsset(`${color}_ball`),
        rematchBall: snowWarAsset(`${color}_ball_rematch`),
        addFriend: snowWarAsset(`add_friend_icon_${color}`),
    };
};

const nameBindings = (name: string): TemplateBindings => ({
    playerName: { caption: name, setCaptionAfterBuild: true },
    playerName_stroke: { caption: name, setCaptionAfterBuild: true },
});

const headBinding = (figure: string, gender: string): TemplateBindings => ({
    playerImage: { children: createElement(SnowWarPlayerHead, { figure, gender, width: IMAGE_WIDTH, height: IMAGE_HEIGHT }) },
});

export interface SnowWarLobbyRowOptions {
    own: boolean;
    ready: boolean;
    loadingFrame: number;
    scoreLabel: string;
}

export const snowWarLobbyRow = (template: Template, player: IGameLobbyPlayerData, { own, ready, loadingFrame, scoreLabel }: SnowWarLobbyRowOptions): TemplateItem => {
    const assets = snowWarTeamAssets(player.teamId);
    const level = String(player.skillLevel);
    const total = String(player.totalScore);

    return {
        key: String(player.userId),
        from: template,
        bindings: {
            playerImageBackground: { asset: own ? snowWarAsset('green_square') : assets.square },
            ...headBinding(player.figure, player.gender),
            playerDataBackground: { asset: assets.infobox },
            ...nameBindings(player.name),
            playerStats: { visible: false },
            playerTotalStats: { visible: false },
            scoreTooltip: { visible: true, tooltip: `${scoreLabel} ${total}` },
            skillLevel: { children: createElement(SnowWarStars, { level: player.skillLevel }) },
            playerScoreBackground: { asset: assets.ball },
            playerScore: { visible: ready, caption: level, setCaptionAfterBuild: true },
            playerScore_stroke: { visible: ready, caption: level, setCaptionAfterBuild: true },
            playerScoreContainer: {
                children: !ready && createElement(SnowWarLoadingIcon, { frame: loadingFrame }),
            },
        },
    };
};

export interface SnowWarResultRowOptions {
    rematch: boolean;
    canAddFriend: boolean;
    onAddFriend: () => void;
}

export const snowWarResultRow = (template: Template, team: number, player: SnowWarTeamPlayerData, { rematch, canAddFriend, onAddFriend }: SnowWarResultRowOptions): TemplateItem => {
    const assets = snowWarTeamAssets(team);
    const hits = String(player.stats.snowballHits);
    const kills = String(player.stats.kills);
    const score = String(player.score);

    return {
        key: String(player.userId),
        from: template,
        bindings: {
            playerImageBackground: { asset: assets.square },
            ...headBinding(player.figure, player.gender),
            addFriend: { visible: canAddFriend, onPointerTap: onAddFriend },
            playerDataBackground: { asset: assets.infobox },
            ...nameBindings(player.userName),
            playerStats: { visible: true },
            playerTotalStats: { visible: false },
            scoreTooltip: { visible: false },
            playerHits: { caption: hits, setCaptionAfterBuild: true },
            playerHits_stroke: { caption: hits, setCaptionAfterBuild: true },
            playerKills: { caption: kills, setCaptionAfterBuild: true },
            playerKills_stroke: { caption: kills, setCaptionAfterBuild: true },
            playerScoreBackground: { asset: rematch ? assets.rematchBall : assets.ball },
            playerScoreGlow: { visible: false },
            loadingIcon: { visible: false },
            playerScore: { caption: score, setCaptionAfterBuild: true },
            playerScore_stroke: { caption: score, setCaptionAfterBuild: true },
        },
    };
};
