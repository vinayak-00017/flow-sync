"use client";
import React, { useRef, useEffect } from "react";
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

  useEffect(() => {
    console.log("Monaco effect running with:", {
      hasYDoc: !!ydoc,
      hasSocket: !!socket,
      hasEditor: !!editorRef.current,
      roomId,
    });
    if (!ydoc || !socket || !editorRef.current) {
      console.log("Skipping Monaco bindig setup - dependencies not ready");
      return;
    }

    console.log("Setting up Monaco binding for room:", roomId);
    const ytext = ydoc.getText("monaco");

    // Listen for document updates from server
    const handleDocUpdate = (update: number[]) => {
      console.log("Received document update");
      Y.applyUpdate(ydoc, new Uint8Array(update));
    };

    const handleInitialSync = (update: number[]) => {
      console.log("Received Initial document state");
      Y.applyUpdate(ydoc, new Uint8Array(update));
    };

    socket.on("sync-doc", handleInitialSync);
    socket.on("doc-update", handleDocUpdate);

    // Setup editor binding
    const editor = editorRef.current;
    const model = editor.getModel();

    if (model) {
      try {
        const binding = new MonacoBinding(
          ytext,
          model,
          new Set([editor]),
          null
        );
        bindingRef.current = binding;

        const awareness = new Awareness(ydoc);

        // Send updates to server
        ydoc.on("update", (update: Uint8Array) => {
          if (socket && socket.connected) {
            console.log("Sending document update");
            socket.emit("doc-update", Array.from(update));
          }
        });

        // Track selection changes for cursor awareness
        editor.onDidChangeCursorSelection((e) => {
          const selection = e.selection;
          if (socket && socket.connected) {
            socket.emit("awareness-update", {
              selection: {
                startLineNumber: selection.startLineNumber,
                startColumn: selection.startColumn,
                endLineNumber: selection.endLineNumber,
                endColumn: selection.endColumn,
              },
            });
          }
        });

        console.log("Monaco binding created successfully");
      } catch (error) {
        console.error("Error creating Monaco binding:", error);
      }
    }

    // Cleanup
    return () => {
      socket.off("sync-doc", handleInitialSync);
      socket.off("doc-update", handleDocUpdate);
      if (bindingRef.current) {
        bindingRef.current.destroy();
      }
    };
  }, [ydoc, socket, roomId]);

  function handleEditorDidMount(editor: monacoEditor.IStandaloneCodeEditor) {
    console.log("Editor mounted");
    editorRef.current = editor;

    // if(ydoc && socket){
    //   setupBinding
    // }
  }

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
