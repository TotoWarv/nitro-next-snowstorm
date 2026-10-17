import type { Game2FullGameStatusMessageType, Game2GameStatusMessageType, Game2StageStartingMessageType, SnowWarGameEventData, SnowWarGameObjectData, SnowWarLevelData } from '@nitrodevco/nitro-packets';

import type { ISnowWarDecorState } from './ISnowWarDecorState';
import type { ISnowWarEngineListener } from './ISnowWarEngineListener';
import type { ISnowWarHuman } from './ISnowWarHuman';
import type { ISnowWarSnowball } from './ISnowWarSnowball';
import type { ISnowWarTile } from './ISnowWarTile';
import type { SnowWarHappening } from './SnowWarHappening';
import { SnowWarHuman } from './SnowWarHuman';
import { SnowWarSnowball } from './SnowWarSnowball';
import { runSnowWarTurn } from './SnowWarTurnRunner';
import { SnowWarWorld } from './SnowWarWorld';

export type SnowWarLevel = SnowWarLevelData;

export type SnowWarTurnOutcome = 'applied' | 'outOfSequence' | 'checksumMismatch';

type SnowWarEventSchedule = readonly (readonly SnowWarGameEventData[])[];

interface SnowWarDivergedTurn {
    readonly world: SnowWarWorld;
    readonly events: SnowWarEventSchedule;
}

const NO_EVENTS: SnowWarEventSchedule = [];
const NO_HUMAN = -1;

export class SnowWarEngine {
    private world: SnowWarWorld;
    private nextTurn = 0;
    private pendingEvents = NO_EVENTS;
    private divergedTurn: SnowWarDivergedTurn | null = null;
    private synchronized = true;

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

    public get inSync(): boolean {
        return this.synchronized;
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

    public tile(x: number, y: number): ISnowWarTile | null {
        return this.world.grid.get(x, y);
    }

    public decorStates(): ISnowWarDecorState[] {
        return this.world.decorStates();
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

    public applyGameStatus(message: Game2GameStatusMessageType): SnowWarTurnOutcome {
        const expectedTurn = this.divergedTurn ? this.nextTurn + 1 : this.nextTurn;

        if (message.turn !== expectedTurn) return 'outOfSequence';

        if (this.divergedTurn) {
            this.adopt(this.divergedTurn.world, this.divergedTurn.events);
            this.divergedTurn = null;
        }

        const candidate = this.world.copy();
        const checksum = runSnowWarTurn(candidate, message.turn, this.pendingEvents);

        if (this.synchronized && (checksum !== message.checksum)) {
            this.synchronized = false;
            this.divergedTurn = { world: candidate, events: message.events };

            return 'checksumMismatch';
        }

        this.adopt(candidate, message.events);

        return 'applied';
    }

    private adopt(world: SnowWarWorld, events: SnowWarEventSchedule): void {
        this.world = world;
        this.nextTurn++;
        this.pendingEvents = events;
        this.announce(world.happenings.splice(0));
    }

    private restart(objects: readonly SnowWarGameObjectData[], nextTurn: number, pendingEvents: SnowWarEventSchedule): void {
        this.world = SnowWarWorld.fromData(this.level, objects);
        this.nextTurn = nextTurn;
        this.pendingEvents = pendingEvents;
        this.divergedTurn = null;
        this.synchronized = true;
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
