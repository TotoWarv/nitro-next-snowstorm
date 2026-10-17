export interface IRoomGameInputHandler {
    onTileClick(x: number, y: number): void;
    onUserClick(objectId: number): void;
    onMouseMove(x: number, y: number): void;
}
