import type { IRoom, IRoomGameInputHandler, IRoomGameInputModifiers } from '@nitrodevco/nitro-api';
import type { Game2FullGameStatusMessageType, Game2GameStatusMessageType, Game2StageStartingMessageType, SnowWarLevelData } from '@nitrodevco/nitro-packets';
import { Game2MakeSnowballComposer, Game2RequestFullStatusUpdateComposer, Game2SetUserMoveTargetComposer, Game2ThrowSnowballAtHumanComposer, Game2ThrowSnowballAtPositionComposer } from '@nitrodevco/nitro-packets';

import type { WebSocketConnection } from '#base/context/communication';
import type { SnowWarHudView, SnowWarHumanView } from '#base/context/snowwar';
import { HabboSoundTypesEnum } from '#base/sound';

import type { ISnowWarEngineListener } from './ISnowWarEngineListener';
import type { ISnowWarHuman } from './ISnowWarHuman';
import { SnowWarArenaRoom } from './SnowWarArenaRoom';
import { SnowWarActivityState, SnowWarConstants, SnowWarTrajectory } from './SnowWarConstants';
import { SnowWarEngine } from './SnowWarEngine';

type Send = WebSocketConnection['send'];

export enum SnowWarFullStatusReason {
    TooLate = 0,
    Diverged = 1,
}

export interface SnowWarMatchFrame {
    hud: SnowWarHudView;
    secondsLeft: number;
}

export interface ISnowWarMatchObserver {
    frameChanged(frame: SnowWarMatchFrame): void;
    hoverChanged(humanId: number | undefined): void;
}

const FULL_STATUS_RETRY_MS = 1000;
const SUBTURN_MS = 50;
const MAX_CATCH_UP_TURNS = 10;
const MAX_CATCH_UP_SUBTURNS = MAX_CATCH_UP_TURNS * SnowWarConstants.SUBTURNS_PER_TURN;
const ALERT_SECONDS = 5;
const NO_HUMAN = -1;
const LANDED_ON_GROUND = 0;
const TEAMS = [ 1, 2 ];

const humanTrajectory = ({ shift, alt }: IRoomGameInputModifiers): SnowWarTrajectory => {
    if (shift && alt) return SnowWarTrajectory.ShortLob;
    if (alt) return SnowWarTrajectory.LongLob;
    if (shift) return SnowWarTrajectory.Quick;

    return SnowWarTrajectory.Default;
};

const canAct = (human: ISnowWarHuman) => (human.activityState === SnowWarActivityState.Normal) || (human.activityState === SnowWarActivityState.Invincible);

const canThrow = (human: ISnowWarHuman) => canAct(human) && (human.balls >= 1) && (human.throwTimer < 1);

const canMakeSnowball = (human: ISnowWarHuman) => canAct(human) && (human.balls < SnowWarConstants.MAX_SNOWBALLS);

const viewOf = (human: ISnowWarHuman): SnowWarHumanView => ({
    id: human.id,
    userId: human.userId,
    team: human.team,
    name: human.name,
    figure: human.figure,
    hp: human.hp,
    balls: human.balls,
    score: human.score,
    activityState: human.activityState,
    isWalking: human.isWalking,
});

export class SnowWarMatch implements ISnowWarEngineListener, IRoomGameInputHandler {
    public readonly engine: SnowWarEngine;
    private arena: SnowWarArenaRoom | undefined = undefined;
    private running = false;
    private lastReceivedTurn = -1;
    private lastTickAt = 0;
    private accumulatedMs = 0;
    private clock: ReturnType<typeof setInterval> | undefined = undefined;
    private fullStatusRequestedAt: number | undefined = undefined;
    private durationSeconds = 0;
    private secondsLeft = 0;
    private hoveredHumanId: number | undefined = undefined;
    private hitsGiven = 0;
    private hitsTaken = 0;
    private readonly exitedHumanIds = new Set<number>();
    private readonly scores = new Map<number, { team: number; score: number }>();

    constructor(
        private readonly level: SnowWarLevelData,
        ownUserId: number,
        private readonly send: Send,
        private readonly observer: ISnowWarMatchObserver,
    ) {
        this.engine = new SnowWarEngine(level, this, ownUserId);
    }

    public get room(): IRoom | undefined {
        return this.arena?.room;
    }

    public get isRunning(): boolean {
        return this.running;
    }

    public buildArena(): void {
        this.arena ??= SnowWarArenaRoom.build(this.level, this);
    }

    public startStage(message: Game2StageStartingMessageType): void {
        this.engine.applyStageStarting(message);
        this.lastReceivedTurn = -1;
        this.refresh();
        this.arena?.playSound(HabboSoundTypesEnum.GAMES_IG_COUNTDOWN);
    }

    public run(durationSeconds: number): void {
        this.running = true;
        this.durationSeconds = durationSeconds;
        this.secondsLeft = durationSeconds;
        this.lastTickAt = Date.now();
        this.accumulatedMs = 0;
        this.stopClock();
        this.clock = setInterval(() => this.tick(), SUBTURN_MS);
        this.refresh();
    }

    public stop(): void {
        this.running = false;
        this.stopClock();
        this.arena?.silence();
    }

    public tick(): void {
        if (!this.running) return;

        const now = Date.now();
        let steps = 0;

        this.accumulatedMs += now - this.lastTickAt;
        this.lastTickAt = now;

        if (this.accumulatedMs >= SUBTURN_MS) {
            const left = this.accumulatedMs - SUBTURN_MS;

            steps = 1;
            this.accumulatedMs = (left >= SUBTURN_MS) ? 0 : left;
        }

        const behind = this.engine.pendingSubturns - steps - SnowWarConstants.SUBTURNS_PER_TURN;

        steps += Math.min(MAX_CATCH_UP_SUBTURNS, Math.max(0, behind));

        let stepped = 0;

        while ((stepped < steps) && this.engine.stepSubturn()) stepped++;

        if (!stepped) return;

        if (!this.engine.inSync) this.requestFullStatus(SnowWarFullStatusReason.Diverged);

        this.refresh();
    }

    public applyStatus(message: Game2GameStatusMessageType): void {
        if (!this.running || (message.turn <= this.lastReceivedTurn)) return;

        const skipped = message.turn > (this.lastReceivedTurn + 1);

        this.lastReceivedTurn = message.turn;

        const outcome = this.engine.receiveGameStatus(message);

        if (skipped || (outcome === 'outOfSequence')) this.requestFullStatus(SnowWarFullStatusReason.TooLate);

        this.tick();
    }

    public applyFullStatus(message: Game2FullGameStatusMessageType): void {
        if (!this.running || (message.turn < this.lastReceivedTurn)) return;

        this.engine.applyFullStatus(message);
        this.lastReceivedTurn = message.turn;
        this.fullStatusRequestedAt = undefined;
        this.durationSeconds = message.durationSeconds;
        this.refresh();
    }

    public removeHuman(humanId: number): void {
        this.exitedHumanIds.add(humanId);
        this.arena?.removeHuman(humanId);

        if (this.hoveredHumanId === humanId) this.onUserHover(null);

        this.refresh();
    }

    public moveTo(send: Send, tileX: number, tileY: number): boolean {
        if (!this.running || !this.ownHuman() || !this.engine.tile(tileX, tileY)) return false;

        send(new Game2SetUserMoveTargetComposer({ x: tileX * SnowWarConstants.TILE_SIZE, y: tileY * SnowWarConstants.TILE_SIZE, ...this.stamp() }));

        return true;
    }

    public throwAtPosition(send: Send, tileX: number, tileY: number, trajectory: SnowWarTrajectory): boolean {
        const own = this.ownHuman();

        if (!this.running || !own || !canThrow(own)) return false;

        send(new Game2ThrowSnowballAtPositionComposer({ x: tileX * SnowWarConstants.TILE_SIZE, y: tileY * SnowWarConstants.TILE_SIZE, trajectory, ...this.stamp() }));

        return true;
    }

    public throwAtHuman(send: Send, humanId: number, trajectory: SnowWarTrajectory = SnowWarTrajectory.Default): boolean {
        const own = this.ownHuman();

        if (!this.running || !own || !canThrow(own) || !this.opponentOf(own, humanId)) return false;

        send(new Game2ThrowSnowballAtHumanComposer({ targetHumanId: humanId, trajectory, ...this.stamp() }));

        return true;
    }

    public makeSnowball(send: Send): boolean {
        const own = this.ownHuman();

        if (!this.running || !own || !canMakeSnowball(own)) return false;

        send(new Game2MakeSnowballComposer(this.stamp()));

        return true;
    }

    public onTileClick(x: number, y: number, modifiers: IRoomGameInputModifiers): void {
        const own = this.ownHuman();
        const aimed = own && (this.hoveredHumanId !== undefined) ? this.opponentOf(own, this.hoveredHumanId) : undefined;

        if (aimed) {
            this.throwAtHuman(this.send, aimed.id, humanTrajectory(modifiers));

            return;
        }

        if (!modifiers.shift && !modifiers.alt) {
            this.moveTo(this.send, x, y);

            return;
        }

        this.throwAtPosition(this.send, x, y, humanTrajectory(modifiers));
    }

    public onUserClick(objectId: number, modifiers: IRoomGameInputModifiers): void {
        if (objectId === this.engine.ownHumanId) {
            this.makeSnowball(this.send);

            return;
        }

        this.throwAtHuman(this.send, objectId, humanTrajectory(modifiers));
    }

    public onMouseMove(): void {}

    public onUserHover(objectId: number | null): void {
        const hovered = objectId ?? undefined;
        const own = this.ownHuman();
        const aimed = (own && (hovered !== undefined)) ? this.opponentOf(own, hovered)?.id : undefined;

        this.hoveredHumanId = hovered;
        this.arena?.aimAt(aimed, this.visibleHumans());
        this.observer.hoverChanged(hovered);
    }

    public snowballThrown(): void {
        this.arena?.playSound(HabboSoundTypesEnum.GAMES_SW_THROW);
    }

    public humanHit(humanId: number, throwerId: number, knockedDown: boolean): void {
        const ownHumanId = this.engine.ownHumanId;

        if (throwerId === ownHumanId) this.hitsGiven++;
        if (humanId === ownHumanId) this.hitsTaken++;

        this.arena?.playSound(knockedDown ? HabboSoundTypesEnum.GAMES_SW_HIT3 : HabboSoundTypesEnum.GAMES_SW_HIT1);
    }

    public snowballLanded(_snowballId: number, x: number, y: number, z: number, stoppedById: number): void {
        this.arena?.splash(x, y, z);

        if (stoppedById === LANDED_ON_GROUND) this.arena?.playSound(HabboSoundTypesEnum.GAMES_SW_MISS);
    }

    public snowballPicked(): void {
        this.arena?.playSound(HabboSoundTypesEnum.GAMES_SW_GET_SNOWBALL);
    }

    public snowballMakingStarted(humanId: number): void {
        if (humanId === this.engine.ownHumanId) this.arena?.playSound(HabboSoundTypesEnum.GAMES_SW_MAKE_SNOWBALL);
    }

    public rayGunFired(_humanId: number, fuseId: number): void {
        this.arena?.flashRayGun(fuseId);
        this.arena?.playSound(HabboSoundTypesEnum.GAMES_SW_THROW);
    }

    public dispose(): void {
        this.running = false;
        this.stopClock();
        this.arena?.dispose();
        this.arena = undefined;
    }

    private ownHuman(): ISnowWarHuman | undefined {
        const ownHumanId = this.engine.ownHumanId;

        return (ownHumanId === NO_HUMAN) ? undefined : this.visibleHumans().find(human => human.id === ownHumanId);
    }

    private opponentOf(own: ISnowWarHuman, humanId: number): ISnowWarHuman | undefined {
        return this.visibleHumans().find(human => (human.id === humanId) && (human.team !== own.team));
    }

    private visibleHumans(): ISnowWarHuman[] {
        return this.engine.humans().filter(human => !this.exitedHumanIds.has(human.id));
    }

    private stopClock(): void {
        if (this.clock === undefined) return;

        clearInterval(this.clock);
        this.clock = undefined;
    }

    private stamp(): { turn: number; subturn: number } {
        this.tick();

        return { turn: this.engine.simulatingTurn, subturn: this.engine.subturn };
    }

    private requestFullStatus(reason: SnowWarFullStatusReason): void {
        const now = Date.now();

        if ((this.fullStatusRequestedAt !== undefined) && ((now - this.fullStatusRequestedAt) < FULL_STATUS_RETRY_MS)) return;

        this.fullStatusRequestedAt = now;
        this.send(new Game2RequestFullStatusUpdateComposer({ reason }));
    }

    private refresh(): void {
        const humans = this.visibleHumans();

        for (const human of humans) this.scores.set(human.id, { team: human.team, score: human.score });

        this.arena?.sync(humans, this.engine.snowballs(), this.engine.decorStates());
        this.updateSecondsLeft();

        const views = humans.map(viewOf);
        const ownHumanId = this.engine.ownHumanId;

        this.observer.frameChanged({
            hud: {
                ownHumanId,
                own: views.find(view => view.id === ownHumanId),
                humans: views,
                teamScores: TEAMS.map(team => this.teamScore(team)),
                hitsGiven: this.hitsGiven,
                hitsTaken: this.hitsTaken,
            },
            secondsLeft: this.secondsLeft,
        });
    }

    private teamScore(team: number): number {
        let total = 0;

        for (const entry of this.scores.values()) {
            if (entry.team === team) total += entry.score;
        }

        return total;
    }

    private updateSecondsLeft(): void {
        if (!this.running) return;

        const simulatedSubturns = this.engine.simulatedSubturns;
        const secondsLeft = Math.max(0, Math.floor(((this.durationSeconds * 1000) - (simulatedSubturns * SUBTURN_MS)) / 1000));

        if (secondsLeft === this.secondsLeft) return;

        this.secondsLeft = secondsLeft;

        if ((secondsLeft >= 1) && (secondsLeft <= ALERT_SECONDS)) this.arena?.playSound(HabboSoundTypesEnum.SOUND_CALL_FOR_HELP);
    }
}
