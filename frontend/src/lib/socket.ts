import { io } from 'socket.io-client';
import { API_BASE_URL } from './config';

// The socket connects to the same base URL as the API
const socketUrl = API_BASE_URL.replace('/api/v1', '');
export const socket = io(socketUrl, {
  autoConnect: true,
  reconnection: true
});
