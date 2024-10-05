import { io } from "socket.io-client";

const socket = io("http://localhost:8000", {
    extraHeaders: {
      Authorization: `Bearer ${localStorage.getItem("access_token")}`,
    },
  }
);
console.log('Setting scoket');
export default socket;