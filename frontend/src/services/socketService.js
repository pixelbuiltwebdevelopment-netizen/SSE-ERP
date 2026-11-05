import { io } from 'socket.io-client';
import { getAccessToken } from '../api/axiosClient';

// ✅ Checks both names and cleans '/api' properly:
const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
const SOCKET_URL = 
  import.meta.env.VITE_SOCKET_URL || 
  (apiUrl ? apiUrl.replace(/\/api\/?$/, '') : 'http://127.0.0.1:5000');

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!this.socket) {
      const token = getAccessToken();
      this.socket = io(SOCKET_URL, {
        withCredentials: true,
        transports: ['websocket', 'polling'], // Faster & more reliable on Render
        auth: {
          token,
        },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected with ID:', this.socket.id);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  on(eventName, callback) {
    if (this.socket) {
      this.socket.on(eventName, callback);
    }
  }

  off(eventName, callback) {
    if (this.socket) {
      this.socket.off(eventName, callback);
    }
  }

  getSocket() {
    return this.socket;
  }
}

export const socketService = new SocketService();