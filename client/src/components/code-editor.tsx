"use client";
import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";

// Use dynamic import to avoid SSR issues
const MonacoEditorComponent = dynamic(() => import("./monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] flex items-center justify-center border rounded-lg">
      Loading editor...
    </div>
  ),
});

const CodeEditor = ({ roomId, userId }: { roomId: string; userId: string }) => {
  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create YJS doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const clientId =
      userId ||
      localStorage.getItem("clientId") ||
      `user-${Math.random().toString(36).substring(2, 10)}`;
    localStorage.setItem("clientId", clientId);

    // Connect to server
    const socket = io("http://localhost:3001", {
      auth: { clientId },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      // connection statee recovery
      transportOptions: {
        websocket: {
          extraHeaders: {
            "x-client-id": clientId,
          },
        },
      },
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);

      // Join room
      socket.emit("join-room", {
        roomId,
        clientId,
        userId,
      });
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
    });

    // Cleanup on unmount
    return () => {
      if (ydocRef.current) {
        ydocRef.current.destroy();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [roomId, userId]);

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

export default CodeEditor;
