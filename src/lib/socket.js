import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5003';

/**
 * H-08 Fix: The backend Socket.IO server now requires authentication via
 * the httpOnly session cookie. Setting `withCredentials: true` ensures the
 * cookie is sent in the WebSocket handshake so the server can validate it.
 *
 * The 'join_user_room' client event is no longer needed — the server now
 * auto-joins the per-user room based on the verified JWT payload.
 */
export const socket = io(SOCKET_URL, {
  autoConnect: true,
  withCredentials: true,          // Send httpOnly cookie in handshake
  transports: ['websocket', 'polling']
});
