"use client";
import React from "react";
import { Editor } from "@monaco-editor/react";
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { Socket } from "socket.io-client";
import { useCursorTracking } from "@/hooks/monaco-editor/use-cursor-tracking";
import { useDocumentSync } from "@/hooks/monaco-editor/use-document-sync";
import { useEditorSetup } from "@/hooks/monaco-editor/use-editor-setup";

interface MonacoEditorProps {
  roomId: string;
  ydoc: Y.Doc | null;
  socket: Socket | null;
  awareness?: Awareness | null;
}

const MonacoEditorComponent: React.FC<MonacoEditorProps> = ({
  roomId,
  ydoc,
  socket,
  awareness,
}) => {
  const { editorRef, handleEditorDidMount, isEditorMounted } = useEditorSetup();

  const { bindingRef, bindingCreated } = useDocumentSync({
    editorRef,
    ydoc,
    socket,
    roomId,
    isEditorMounted,
  });

  useCursorTracking({
    editorRef,
    socket,
    roomId,
    isEditorMounted,
  });

  return (
    <div className="border rounded-lg overflow-hidden w-full h-[600px]">
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
          padding: { top: 20 },
        }}
      />
    </div>
  );
};

export default MonacoEditorComponent;
