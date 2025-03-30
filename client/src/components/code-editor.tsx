"use client";
import React, { useEffect, useRef } from "react";
import { Editor } from "@monaco-editor/react";
import { io, Socket } from "socket.io-client";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import { editor } from "monaco-editor";

const CodeEditor = ({ roomId }: { roomId: string }) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const ytext = ydoc.getText("monaco");

    // Connect to server
    const socket = io("http://localhost:3001");
    socketRef.current = socket;

    // Join specific room
    socket.emit("join-room", roomId);

    // Handle document synchronization
    socket.on("sync-doc", (update: number[]) => {
      Y.applyUpdate(ydoc, new Uint8Array(update));
    });

    socket.on("doc-update", (update: number[]) => {
      Y.applyUpdate(ydoc, new Uint8Array(update));
    });

    // Connect editor to YJS if it's already mounted
    if (editorRef.current) {
      setupBinding(editorRef.current, ytext, ydoc);
    }

    // Cleanup on unmount
    return () => {
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
      ydoc.destroy();
      socket.disconnect();
    };
  }, [roomId]);

  function handleEditorMount(editor) {
    editorRef.current = editor;
    // Connect Monaco editor to YJS
    // (Additional setup would go here)
  }

  return (
    <Editor
      height="600px"
      defaultLanguage="javascript"
      defaultValue="// Start coding here"
      onMount={handleEditorMount}
    />
  );
};

export default CodeEditor;
