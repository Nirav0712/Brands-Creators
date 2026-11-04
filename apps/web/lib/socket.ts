import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  if (typeof window === 'undefined') return null;

  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const baseUrl = rawApiUrl.replace(/\/api\/v1\/?$/, '');
  const token = localStorage.getItem('bc_access_token') || '';

  if (socket) {
    // If the auth token has changed (e.g. user logged in or switched account), reconnect with new token
    if ((socket.auth as any)?.token !== token) {
      socket.disconnect();
      socket = null;
    } else {
      return socket;
    }
  }

  socket = io(`${baseUrl}/messaging`, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    auth: { token },
    reconnectionAttempts: 10,
    reconnectionDelay: 1500,
  });

  socket.on('connect', () => {
    // Socket connected
  });

  socket.on('connect_error', () => {
    // Handled silently
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
