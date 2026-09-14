from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.services.websocket_manager import ws_manager


router = APIRouter(
    prefix="/ws",
    tags=["WebSockets"],
)


@router.websocket("/parking")
async def websocket_parking(websocket: WebSocket):
    await ws_manager.connect(websocket, "parking")
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "parking")


@router.websocket("/security")
async def websocket_security(websocket: WebSocket):
    await ws_manager.connect(websocket, "security")
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "security")


@router.websocket("/notifications")
async def websocket_notifications(websocket: WebSocket):
    await ws_manager.connect(websocket, "notifications")
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, "notifications")
