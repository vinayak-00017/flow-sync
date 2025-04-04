"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness.js";

// Use dynamic import to avoid SSR issues
const MonacoEditorComponent = dynamic(() => import("./monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center border rounded-lg">
      Loading editor...
    </div>
  ),
});

const SocketSetup = ({
  roomId,
  userId,
}: {
  roomId: string;
  userId: string | undefined;
}) => {
  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const awarenessRef = useRef<Awareness | null>(null);

  useEffect(() => {
    // Create YJS doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    //Create awareness instance
    const awareness = new Awareness(ydoc);
    awarenessRef.current = awareness;

    const clientId =
      localStorage.getItem("clientId") ||
      `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("clientId", clientId);

    //Set local state
    awareness.setLocalState({
      user: {
        name: userId || "Anonymous",
        color: getRandomColor(),
        id: clientId,
      },
    });

    // Connect to server
    if (!socketRef.current) {
      const socket = io("http://localhost:3001", {
        auth: { clientId },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        // connection statee recovery
        forceNew: false,
        timeout: 20000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Connected to server", socket.id);
        setIsConnected(true);
      });

      socket.on("connect_error", (err) => {
        console.error("Connection error:", err);
      });

      socket.on("disconnect", (reason) => {
        console.log(`Socket disconnected: ${reason}`);
        setIsConnected(false);
      });

      socket.on("reconnect", (attemptNumber) => {
        console.log(`Reconnected after ${attemptNumber} attempts`);
        setIsConnected(true);
      });
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log("Component unmounting, disconnecting socket");
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
    };
  }, [userId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (socket && socket.connected && roomId)
      // Join room
      socket.emit("join-room", {
        roomId,
        clientId: localStorage.getItem("clientId"),
        userId,
      });
  }, [roomId, userId, socketRef.current?.connected]);

  function getRandomColor(): string {
    const colors = [
      "#FF5733", // Coral/Red
      "#33FF57", // Green
      "#3357FF", // Blue
      "#F033FF", // Magenta
      "#FF33F0", // Pink
      "#33FFF0", // Cyan
      "#F0FF33", // Yellow
      "#FF8833", // Orange
      "#8833FF", // Purple
      "#33FFAA", // Teal
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  return (
    <div className="w-full">
      {!isConnected && (
        <div className="p-2 mb-2 bg-yellow-100 text-yellow-800 rounded">
          Connecting to collaboration server...
        </div>
      )}

      <MonacoEditorComponent
        roomId={roomId}
        ydoc={ydocRef.current}
        socket={socketRef.current}
      />
    </div>
  );
};

export default SocketSetup;
