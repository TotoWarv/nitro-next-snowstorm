import type { Game2FullGameStatusMessageType, Game2GameStatusMessageType, Game2StageStartingMessageType, SnowWarGameEventData, SnowWarGameObjectData, SnowWarLevelData } from '@nitrodevco/nitro-packets';

import type { ISnowWarEngineListener } from './ISnowWarEngineListener';
import type { ISnowWarHuman } from './ISnowWarHuman';
import type { ISnowWarSnowball } from './ISnowWarSnowball';
import type { SnowWarHappening } from './SnowWarHappening';
import { SnowWarHuman } from './SnowWarHuman';
import { SnowWarSnowball } from './SnowWarSnowball';
import { runSnowWarTurn } from './SnowWarTurnRunner';
import { SnowWarWorld } from './SnowWarWorld';

export type SnowWarLevel = SnowWarLevelData;

const NO_EVENTS: readonly (readonly SnowWarGameEventData[])[] = [];
const NO_HUMAN = -1;

export class SnowWarEngine {
    private world: SnowWarWorld;
    private nextTurn = 0;
    private pendingEvents = NO_EVENTS;

    constructor(
        private readonly level: SnowWarLevel,
        private readonly listener: ISnowWarEngineListener,
        private readonly ownUserId = 0,
    ) {
        this.world = SnowWarWorld.fromData(level, []);
    }

    public get turn(): number {
        return this.nextTurn - 1;
    }

    public get ownHumanId(): number {
        return this.world.activeOfType(SnowWarHuman).find(human => human.userId === this.ownUserId)?.id ?? NO_HUMAN;
    }

    public humans(): ISnowWarHuman[] {
        return this.world.activeOfType(SnowWarHuman);
    }

    public snowballs(): ISnowWarSnowball[] {
        return this.world.activeOfType(SnowWarSnowball);
    }

    public snapshot(): SnowWarGameObjectData[] {
        return this.world.snapshot();
    }

    public applyStageStarting(message: Game2StageStartingMessageType): void {
        this.restart(message.objects, 0, NO_EVENTS);
    }

    public applyFullStatus(message: Game2FullGameStatusMessageType): void {
        this.restart(message.objects, message.turn + 1, message.events);
    }

    public applyGameStatus(message: Game2GameStatusMessageType): boolean {
        if (message.turn !== this.nextTurn) return false;

        const candidate = this.world.copy();

        if (runSnowWarTurn(candidate, message.turn, this.pendingEvents) !== message.checksum) return false;

        this.world = candidate;
        this.nextTurn = message.turn + 1;
        this.pendingEvents = message.events;
        this.announce(candidate.happenings.splice(0));

        return true;
    }

    private restart(objects: readonly SnowWarGameObjectData[], nextTurn: number, pendingEvents: readonly (readonly SnowWarGameEventData[])[]): void {
        this.world = SnowWarWorld.fromData(this.level, objects);
        this.nextTurn = nextTurn;
        this.pendingEvents = pendingEvents;
    }

    private announce(happenings: readonly SnowWarHappening[]): void {
        for (const happening of happenings) {
            switch (happening.kind) {
                case 'snowballThrown':
                    this.listener.snowballThrown(happening.humanId);
                    break;
                case 'humanHit':
                    this.listener.humanHit(happening.humanId, happening.throwerId, happening.knockedDown);
                    break;
                case 'snowballLanded':
                    this.listener.snowballLanded(happening.snowballId, happening.x, happening.y, happening.z, happening.stoppedById);
                    break;
                case 'snowballPicked':
                    this.listener.snowballPicked(happening.humanId, happening.sourceId);
                    break;
                case 'snowballMakingStarted':
                    this.listener.snowballMakingStarted(happening.humanId);
                    break;
                case 'rayGunFired':
                    this.listener.rayGunFired(happening.humanId, happening.fuseId);
                    break;
            }
        }
    }
}
