import type { Game2FullGameStatusMessageType, Game2GameStatusMessageType, Game2StageStartingMessageType, SnowWarGameEventData, SnowWarGameObjectData, SnowWarLevelData } from '@nitrodevco/nitro-packets';

import type { ISnowWarDecorState } from './ISnowWarDecorState';
import type { ISnowWarEngineListener } from './ISnowWarEngineListener';
import type { ISnowWarHuman } from './ISnowWarHuman';
import type { ISnowWarSnowball } from './ISnowWarSnowball';
import type { ISnowWarTile } from './ISnowWarTile';
import { SnowWarConstants } from './SnowWarConstants';
import { resolveSnowWarEvents } from './SnowWarEventResolver';
import type { SnowWarHappening } from './SnowWarHappening';
import { SnowWarHuman } from './SnowWarHuman';
import type { SnowWarResolvedEvent } from './SnowWarResolvedEvent';
import { SnowWarSnowball } from './SnowWarSnowball';
import { runSnowWarSubturn, runSnowWarTurn } from './SnowWarTurnRunner';
import { SnowWarWorld } from './SnowWarWorld';

export type SnowWarLevel = SnowWarLevelData;

export type SnowWarTurnOutcome = 'applied' | 'outOfSequence' | 'checksumMismatch';

type SnowWarEventSchedule = readonly (readonly SnowWarGameEventData[])[];

interface SnowWarDivergedTurn {
    readonly world: SnowWarWorld;
    readonly events: SnowWarEventSchedule;
}

interface SnowWarSteppedTurn {
    readonly status: Game2GameStatusMessageType;
    readonly resolved: readonly SnowWarResolvedEvent[];
    subturn: number;
}

const NO_EVENTS: SnowWarEventSchedule = [];
const NO_HUMAN = -1;

export class SnowWarEngine {
    private world: SnowWarWorld;
    private nextTurn = 0;
    private pendingEvents = NO_EVENTS;
    private divergedTurn: SnowWarDivergedTurn | null = null;
    private synchronized = true;
    private steppedTurn: SnowWarSteppedTurn | null = null;
    private readonly receivedTurns: Game2GameStatusMessageType[] = [];

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

    public get subturn(): number {
        return this.steppedTurn?.subturn ?? 0;
    }

    public get simulatedSubturns(): number {
        return (this.nextTurn * SnowWarConstants.SUBTURNS_PER_TURN) + this.subturn;
    }

    public get pendingSubturns(): number {
        return (this.receivedTurns.length * SnowWarConstants.SUBTURNS_PER_TURN) + (this.steppedTurn ? (SnowWarConstants.SUBTURNS_PER_TURN - this.steppedTurn.subturn) : 0);
    }

    public get simulatingTurn(): number {
        return this.nextTurn;
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

    public receiveGameStatus(message: Game2GameStatusMessageType): SnowWarTurnOutcome {
        const expectedTurn = this.nextTurn + (this.steppedTurn ? 1 : 0) + this.receivedTurns.length;

        if (message.turn !== expectedTurn) return 'outOfSequence';

        this.receivedTurns.push(message);

        return 'applied';
    }

    public stepSubturn(): boolean {
        if (!this.steppedTurn) {
            const status = this.receivedTurns.shift();

            if (!status) return false;

            this.steppedTurn = { status, resolved: resolveSnowWarEvents(this.world, this.pendingEvents), subturn: 0 };
        }

        const stepped = this.steppedTurn;

        runSnowWarSubturn(this.world, stepped.resolved, stepped.subturn);
        stepped.subturn++;
        this.announce(this.world.happenings.splice(0));

        if (stepped.subturn < SnowWarConstants.SUBTURNS_PER_TURN) return true;

        if (this.synchronized && (this.world.computeChecksum(stepped.status.turn) !== stepped.status.checksum)) this.synchronized = false;

        this.steppedTurn = null;
        this.nextTurn++;
        this.pendingEvents = stepped.status.events;

        return true;
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
        this.steppedTurn = null;
        this.receivedTurns.length = 0;
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
