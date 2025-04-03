"use client";
import React, { useRef, useEffect, useState } from "react";
import { Editor } from "@monaco-editor/react";
import { MonacoBinding } from "y-monaco";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { Socket } from "socket.io-client";
import { editor as monacoEditor } from "monaco-editor";

interface MonacoEditorProps {
  roomId: string;
  ydoc: Y.Doc | null;
  socket: Socket | null;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  roomId,
  ydoc,
  socket,
}) => {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const handlersRegisteredRef = useRef(false);
  const bindingCreatedRef = useRef(false);
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  useEffect(() => {
    console.log("Main effect running with:", {
      hasYDoc: !!ydoc,
      hasSocket: !!socket,
      hasEditor: !!editorRef.current,
      roomId,
      isSocketConnected: socket?.connected,
      bindingCreated: bindingCreatedRef.current,
    });
    if (!ydoc || !socket || !editorRef.current || !socket.connected) {
      console.log("Missing dependencies, waiting...");
      return;
    }

    //Join the room explicitly
    if (roomId) {
      console.log(`Explicitly joining room: ${roomId}`);
      socket.emit("join-room", {
        roomId,
        clientId: localStorage.getItem("clientId"),
      });
    }

    // Create binding only once
    if (!bindingCreatedRef.current && !bindingRef.current) {
      console.log("Creating Monaco binding...");
      try {
        const editor = editorRef.current;
        const model = editor.getModel();
        const ytext = ydoc.getText("monaco");

        //Log the initial state
        console.log(
          "Initial editor value:",
          model?.getValue().substring(0, 50)
        );
        console.log("Initial YText value:", ytext.toString().substring(0, 50));

        if (model) {
          const binding = new MonacoBinding(
            ytext,
            model,
            new Set([editor]),
            null
          );
          bindingRef.current = binding;
          bindingCreatedRef.current = true;

          ytext.observe(() => {
            console.log("YText changed:", ytext.toString().substring(0, 50));
            console.log("Editor value:", model.getValue().substring(0, 50));
          });
          console.log("Binding created successfully!");
        }
      } catch (error) {
        console.error("Failed to create binding:", error);
      }
    }

    // Register socket handlers if not already done
    if (!handlersRegisteredRef.current) {
      console.log("Registering socket event handlers");

      const handleDocUpdate = (update: number[]) => {
        console.log("📥 Received document update, bytes:", update.length);
        try {
          Y.applyUpdate(ydoc, new Uint8Array(update));
          console.log("✅ Applied update to YDoc!");
        } catch (err) {
          console.error("❌ Error applying update:", err);
        }
      };
      const handleInitialSync = (update: number[]) => {
        console.log(
          "📜 Received initial document state, bytes:",
          update.length
        );
        try {
          Y.applyUpdate(ydoc, new Uint8Array(update));
          console.log("✅ Applied initial state to YDoc!");
        } catch (err) {
          console.error("❌ Error applying initial state:", err);
        }
      };
      socket.on("sync-doc", handleInitialSync);
      socket.on("doc-update", handleDocUpdate);
      handlersRegisteredRef.current = true;

      // Set up document update emission
      ydoc.on("update", (update: Uint8Array) => {
        if (socket && socket.connected) {
          console.log("📤 Sending document update, bytes:", update.length);
          socket.emit("doc-update", Array.from(update));
        } else {
          console.warn("⚠️ Can't send update - socket disconnected");
        }
      });
    }
    //  Cleanup on unmount
    return () => {
      if (handlersRegisteredRef.current) {
        console.log("Cleaning up socket handlers and binding");
        socket.off("sync-doc");
        socket.off("doc-update");

        if (bindingRef.current) {
          bindingRef.current.destroy();
          bindingRef.current = null;
        }

        handlersRegisteredRef.current = false;
      }
    };
  }, [ydoc, socket, roomId, socket?.connected, isEditorMounted]);

  const handleEditorDidMount = (editor: monacoEditor.IStandaloneCodeEditor) => {
    console.log("🖥️ Editor mounted successfully!");
    editorRef.current = editor;
    setIsEditorMounted(true);
  };

  return (
    <div className="border rounded-lg overflow-hidden w-full h-[600px]">
      <style jsx global>{`
        .monaco-editor .monaco-hover,
        .monaco-editor .suggest-widget,
        .monaco-editor .context-view,
        .monaco-editor .monaco-list,
        .monaco-editor .codicon-suggest,
        .monaco-editor .suggest-details,
        .monaco-editor .parameter-hints-widget {
          z-index: 100 !important;
        }
        .overflow-guard {
          overflow: visible !important;
        }
      `}</style>
      <Editor
        height="100%"
        defaultLanguage="javascript"
        defaultValue="// Start coding here"
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: {
            top: 20,
          },
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent;
