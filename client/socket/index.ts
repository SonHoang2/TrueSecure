import { io } from 'socket.io-client';
import { SERVER_URL } from '../src/config/config';

const deviceUuid = localStorage.getItem('deviceUuid');

const socket = io(SERVER_URL, {
    withCredentials: true,
    autoConnect: false,
    query: {
        deviceUuid,
    },
});

export default socket;
