import asyncio
import json
import logging
from typing import Dict, Set, Any, Optional, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    """
    Gestor de Conexiones WebSocket para Salas Colaborativas de Ateneo+.
    Maneja presencia activa, latidos (heartbeats), difusión atómica de eventos y tolerancia a desconexiones.
    """
    def __init__(self):
        # Mapeo: room_code -> conjunto de websockets activos
        self.active_rooms: Dict[str, Set[WebSocket]] = {}
        # Mapeo: websocket -> metadatos del cliente (user_id, nombre, rol)
        self.client_meta: Dict[WebSocket, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, room_code: str, websocket: WebSocket, meta: Optional[Dict[str, Any]] = None):
        """Acepta la conexión WebSocket y la registra en la sala correspondiente."""
        await websocket.accept()
        async with self._lock:
            if room_code not in self.active_rooms:
                self.active_rooms[room_code] = set()
            self.active_rooms[room_code].add(websocket)
            self.client_meta[websocket] = meta or {}

        logger.info(f"[WS] Cliente conectado a sala '{room_code}'. Total en sala: {len(self.active_rooms[room_code])}")

    async def disconnect(self, room_code: str, websocket: WebSocket) -> Optional[Dict[str, Any]]:
        """Desconecta el WebSocket y limpia los registros de la sala."""
        meta = None
        async with self._lock:
            if websocket in self.client_meta:
                meta = self.client_meta.pop(websocket)

            if room_code in self.active_rooms:
                self.active_rooms[room_code].discard(websocket)
                if not self.active_rooms[room_code]:
                    del self.active_rooms[room_code]

        total = len(self.active_rooms.get(room_code, []))
        logger.info(f"[WS] Cliente desconectado de sala '{room_code}'. Restantes en sala: {total}")
        return meta

    async def broadcast_to_room(self, room_code: str, message: Dict[str, Any]):
        """
        Difunde un mensaje JSON a todos los clientes conectados a la sala especificada.
        Elimina de forma segura cualquier conexión muerta o que lance excepción.
        """
        if room_code not in self.active_rooms:
            return

        dead_sockets = set()
        # Copia superficial para evitar problemas de concurrencia durante la iteración
        sockets = list(self.active_rooms[room_code])

        for ws in sockets:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"[WS] Fallo al enviar mensaje a socket en sala '{room_code}': {e}")
                dead_sockets.add(ws)

        if dead_sockets:
            async with self._lock:
                for dead_ws in dead_sockets:
                    if room_code in self.active_rooms:
                        self.active_rooms[room_code].discard(dead_ws)
                    self.client_meta.pop(dead_ws, None)

    def get_connected_count(self, room_code: str) -> int:
        """Retorna la cantidad de sockets conectados actualmente a la sala."""
        return len(self.active_rooms.get(room_code, []))

    def get_connected_participants(self, room_code: str) -> List[Dict[str, Any]]:
        """Retorna la lista de metadatos de participantes conectados actualmente."""
        if room_code not in self.active_rooms:
            return []
        participants = []
        for ws in self.active_rooms[room_code]:
            meta = self.client_meta.get(ws)
            if meta:
                participants.append(meta)
        return participants


# Instancia única singleton del gestor de conexiones
connection_manager = ConnectionManager()
