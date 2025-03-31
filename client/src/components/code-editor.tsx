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

const CodeEditor = ({ roomId }: { roomId: string }) => {
  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Create YJS doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Connect to server
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server");
      setIsConnected(true);

      // Join room
      socket.emit("join-room", roomId);
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
  }, [roomId]);

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
