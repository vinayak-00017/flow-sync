import { useRef, useState } from "react";
import { editor as monacoEditor } from "monaco-editor";

export function useEditorSetup() {
  const editorRef = useRef<monacoEditor.IStandaloneCodeEditor | null>(null);
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const handleEditorDidMount = (editor: monacoEditor.IStandaloneCodeEditor) => {
    console.log("🖥️ Editor mounted successfully!");
    editorRef.current = editor;
    setIsEditorMounted(true);
  };

  return {
    editorRef,
    isEditorMounted,
    handleEditorDidMount,
  };
}
