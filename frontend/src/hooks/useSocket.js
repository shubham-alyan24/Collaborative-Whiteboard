import { useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { storage } from "../utils/storage.js";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const useSocket = () => {
  const socketRef = useRef(null);

  const connect = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL, {
        autoConnect: false,
        // Read the token on every (re)connect so it's never stale
        auth: (cb) => cb({ token: storage.getToken() }),
      });
    }
    socketRef.current.connect();
    return socketRef.current;
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, []);

  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  return {
    socket: () => socketRef.current,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
};
