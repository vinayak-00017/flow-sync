import { useEffect, useRef } from "react";
import { Socket } from "socket.io-client";
import { editor as monacoEditor } from "monaco-editor";

interface UseCursorTrackingProps {
  editorRef: React.MutableRefObject<monacoEditor.IStandaloneCodeEditor | null>;
  socket: Socket | null;
  roomId: string;
  isEditorMounted: boolean;
}

export function useCursorTracking({
  editorRef,
  socket,
  roomId,
  isEditorMounted,
}: UseCursorTrackingProps) {
  // Store cursor widgets in a ref so they persist between renders
  const cursorWidgetsRef = useRef(new Map());

  useEffect(() => {
    // Exit early if dependencies aren't ready
    if (!socket || !editorRef.current || !socket.connected || !roomId) {
      console.log("Missing dependencies for cursor tracking, skipping setup");
      return;
    }

    const editor = editorRef.current;
    console.log("Setting up cursor tracking");

    // Get reference to our widget map from the ref
    const cursorWidgets = cursorWidgetsRef.current;

    // 1. TRACK LOCAL CURSOR: Monitor when the user moves their cursor/selection
    const disposable = editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getSelection();
      if (selection) {
        // Send our cursor position to others
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

    // 2. TRACK REMOTE CURSORS: Listen for cursor updates from other users
    socket.on("awareness-update", (data) => {
      console.log("received awareness update", data);
      const { userId, selection } = data;

      // Don't show our own cursor
      if (userId === socket.id) return;

      // 3. REMOVE OLD CURSOR if it exists for this user
      if (cursorWidgets.has(userId)) {
        const existingWidget = cursorWidgets.get(userId);
        editor.layoutContentWidget(existingWidget); // Force position update
        return;
      }

      // 4. CREATE NEW CURSOR ELEMENT
      const cursorDiv = document.createElement("div");
      console.log("hi");
      cursorDiv.className = "remote-cursor";
      cursorDiv.style.backgroundColor = getColorForUser(userId);
      cursorDiv.style.width = "2px";
      cursorDiv.style.height = "18px";
      cursorDiv.style.position = "absolute";

      // 5. ADD USER TOOLTIP to show who's cursor it is
      const tooltipDiv = document.createElement("div");
      tooltipDiv.className = "remote-cursor-tooltip";
      tooltipDiv.textContent = userId.substring(0, 6);
      tooltipDiv.style.backgroundColor = getColorForUser(userId);
      tooltipDiv.style.color = "white";
      tooltipDiv.style.padding = "2px 4px";
      tooltipDiv.style.borderRadius = "3px";
      tooltipDiv.style.fontSize = "10px";
      tooltipDiv.style.position = "absolute";
      tooltipDiv.style.top = "-20px";
      tooltipDiv.style.left = "-2px";
      cursorDiv.appendChild(tooltipDiv);

      // 6. CREATE MONACO CONTENT WIDGET for the cursor
      const widget: monacoEditor.IContentWidget = {
        getId: () => `cursor-${userId}`,
        getDomNode: () => cursorDiv,
        getPosition: () => ({
          position: {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn,
          },
          preference: [monacoEditor.ContentWidgetPositionPreference.EXACT],
        }),
        dispose: () => {
          if (cursorDiv.parentNode) {
            cursorDiv.parentNode.removeChild(cursorDiv);
          }
        },
      };

      // 7. ADD WIDGET to editor and save reference
      editor.addContentWidget(widget);
      cursorWidgets.set(userId, widget);
    });

    // 8. CLEANUP when component unmounts or dependencies change
    return () => {
      console.log("Cleaning up cursor tracking");

      // Remove event listener
      disposable.dispose();

      // Remove socket event handler
      socket.off("awareness-update");

      // Remove all cursor widgets
      cursorWidgets.forEach((widget) => {
        if (editor) {
          editor.removeContentWidget(widget);
        }
      });

      // Clear the map
      cursorWidgets.clear();
    };
  }, [socket, roomId, socket?.connected, isEditorMounted, editorRef]);

  // Helper function to get a consistent color for each user
  function getColorForUser(id: string): string {
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

    // Hash the ID to get a consistent color
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }

    return colors[Math.abs(hash) % colors.length];
  }

  // No need to return anything unless the parent component needs it
  return {};
}
