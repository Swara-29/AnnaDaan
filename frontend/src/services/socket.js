import { io } from "socket.io-client";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const socketBase = apiBase.replace(/\/api\/?$/, "");

export const socket = io(socketBase, {
  transports: ["websocket", "polling"]
});

