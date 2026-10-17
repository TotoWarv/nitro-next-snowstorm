import {
    IEventDispatcher,
    IRoom,
    IRoomEventHandler,
    IRoomObject,
    IRoomObjectEvent,
    IRoomSpriteMouseEvent,
    MouseEventType,
    RoomObjectCategoryEnum,
    type RoomObjectEvent, RoomObjectFurniIconAssetEvent, RoomObjectMouseEvent, RoomObjectTileMouseEvent, RoomSpriteMouseEvent } from '@nitrodevco/nitro-api';

import { GetFurniIconImageManager } from './FurniIconImageManager';
import { RoomEnterEffect } from './utils';

/**
 * The engine's end of Flash `RoomObjectEventHandler`: room object events and canvas mouse events
 * pass through here on their way to the UI, which holds the rest of that class
 * (`RoomEventHandler.ts`, `useRoomEventHandler`). What is decided here is what Flash decided
 * before looking at the event at all - the head of `processRoomCanvasMouseEvent` - and the one
 * request the engine answers without the UI, a furni asking for another furni's icon.
 */
export class RoomEventHandler implements IRoomEventHandler {
    private static MAX_EVENTS_BEFORE_HANDLER = 500;

    private _roomObjectEventHandler: ((event: RoomObjectEvent) => void) | undefined = undefined;
    /**
     * What the room's objects raised before the UI first took the room's events. Flash's handler is
     * the engine's own and is there from the start; ours is the UI's, set a render after the room
     * exists, and a room entered with its furni already loaded builds them - and a lit toner or a
     * group furni raises its one event - before that. Undefined once a handler has been set.
     */
    private _eventsBeforeHandler: RoomObjectEvent[] | undefined = [];
    private _roomCanvasMouseHandler: ((event: RoomSpriteMouseEvent, object: IRoomObject) => void) | undefined = undefined;
    private _gameUserClickEventId: number = -1;
    private _gameHoveredUserId: number | null = null;

    constructor(private _room: IRoom) { }

    public handleRoomObjectEvent(event: RoomObjectEvent): void {
        if (!event) return;

        // `RoomObjectEventHandler.handleObjectFurniIconAssetEvent`: Flash's room engine answered this itself.
        if (event instanceof RoomObjectFurniIconAssetEvent && event.type === RoomObjectFurniIconAssetEvent.LOAD_FURNI_ICON) {
            const object = this._room.getRoomObject(event.objectId, this._room.getRoomObjectCategoryForType(event.objectType));

            if (object) GetFurniIconImageManager().requestFurniIconAsset(object, event.wallItem, event.typeId, event.extra);

            return;
        }

        if (this._room.gameMode && (event instanceof RoomObjectMouseEvent)) {
            this.handleGameTileMouseEvent(event);

            return;
        }

        if (!this._roomObjectEventHandler) {
            // A room nobody takes events from (a previewer) keeps only the first few.
            if (this._eventsBeforeHandler && (this._eventsBeforeHandler.length < RoomEventHandler.MAX_EVENTS_BEFORE_HANDLER)) this._eventsBeforeHandler.push(event);

            return;
        }

        this._roomObjectEventHandler(event);
    }

    public handleRoomCanvasMouseEvent(event: RoomSpriteMouseEvent, object: IRoomObject): void {
        if (!event || !object) return;

        if (this._room.gameMode) {
            this.handleGameCanvasMouseEvent(event, object);

            return;
        }

        if (RoomEnterEffect.isRunning() || !this._roomCanvasMouseHandler) return;

        if (this.isClickThrough(object)) return;

        this._roomCanvasMouseHandler(event, object);
    }

    /**
     * `RoomEngine.setClickSettings`: every mouse event of a click-through category is dropped, not
     * only clicks, and before the object can claim the event id - so the canvas's next hit, the
     * furni or tile behind, is the one that handles it.
     */
    private isClickThrough(object: IRoomObject): boolean {
        if (!this._room.clickThroughUsers && !this._room.clickThroughFurni) return false;

        switch (this._room.getRoomObjectCategoryForType(object.type)) {
            case RoomObjectCategoryEnum.Unit:
                return this._room.clickThroughUsers;
            case RoomObjectCategoryEnum.Floor:
            case RoomObjectCategoryEnum.Wall:
                return this._room.clickThroughFurni;
        }

        return false;
    }

    private handleGameCanvasMouseEvent(event: RoomSpriteMouseEvent, object: IRoomObject): void {
        const isClick = (event.type === MouseEventType.MOUSE_CLICK);

        switch (this._room.getRoomObjectCategoryForType(object.type)) {
            case RoomObjectCategoryEnum.Unit:
                if (isClick) {
                    this._gameUserClickEventId = event.eventId;
                    this._room.gameInputHandler?.onUserClick(object.id, { shift: event.shiftKey, alt: event.altKey });

                    return;
                }

                this.handleGameUserHover(event, object.id);
                return;
            case RoomObjectCategoryEnum.Room:
                if (isClick && (event.eventId === this._gameUserClickEventId)) return;

                object.mouseHandler?.mouseEvent(event, this._room.getGeometry());
                return;
        }
    }

    private handleGameUserHover(event: RoomSpriteMouseEvent, objectId: number): void {
        if (event.type === MouseEventType.ROLL_OVER) {
            if (this._gameHoveredUserId === objectId) return;

            this._gameHoveredUserId = objectId;
            this._room.gameInputHandler?.onUserHover(objectId);

            return;
        }

        if ((event.type !== MouseEventType.ROLL_OUT) || (this._gameHoveredUserId !== objectId)) return;

        this._gameHoveredUserId = null;
        this._room.gameInputHandler?.onUserHover(null);
    }

    private handleGameTileMouseEvent(event: RoomObjectMouseEvent): void {
        const handler = this._room.gameInputHandler;

        if (!handler || !(event instanceof RoomObjectTileMouseEvent)) return;

        switch (event.type) {
            case RoomObjectMouseEvent.CLICK:
                handler.onTileClick(event.tileXAsInt, event.tileYAsInt, { shift: event.shiftKey, alt: event.altKey });
                return;
            case RoomObjectMouseEvent.MOUSE_MOVE:
                handler.onMouseMove(event.tileXAsInt, event.tileYAsInt);
                return;
        }
    }

    public setRoomObjectEventHandler(handler: ((event: IRoomObjectEvent) => void) | undefined): void {
        this._roomObjectEventHandler = handler;

        if (!handler || !this._eventsBeforeHandler) return;

        const events = this._eventsBeforeHandler;

        this._eventsBeforeHandler = undefined;

        for (const event of events) this.handleRoomObjectEvent(event);
    }

    public setRoomCanvasMouseHandler(handler: ((event: IRoomSpriteMouseEvent, object: IRoomObject) => void) | undefined): void {
        this._roomCanvasMouseHandler = handler;
    }

    public get eventDispatcher(): IEventDispatcher {
        return this._room.eventDispatcher;
    }
}
