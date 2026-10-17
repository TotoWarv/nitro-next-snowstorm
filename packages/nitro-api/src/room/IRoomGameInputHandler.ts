export interface IRoomGameInputModifiers {
    shift: boolean;
    alt: boolean;
}

export interface IRoomGameInputHandler {
    onTileClick(x: number, y: number, modifiers: IRoomGameInputModifiers): void;
    onUserClick(objectId: number, modifiers: IRoomGameInputModifiers): void;
    onMouseMove(x: number, y: number): void;
    onUserHover(objectId: number | null): void;
}
