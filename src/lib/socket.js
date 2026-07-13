import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5003';

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  transports: ['websocket', 'polling']
});
