import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let _socket: Socket | null = null;

export function getBotSocket(): Socket {
  if (!_socket) {
    _socket = io(BACKEND_URL, { autoConnect: true, transports: ['websocket', 'polling'] });
  }
  return _socket;
}
