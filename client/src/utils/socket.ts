import { io } from "socket.io-client";
import { SERVER_URL } from "../config/config";

const socket = io(SERVER_URL, {
  withCredentials: true,
  autoConnect: false,
});

export default socket;
