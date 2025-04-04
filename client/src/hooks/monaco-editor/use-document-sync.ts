import { useEffect, useRef } from "react";
import * as Y from "yjs";
import { Socket } from "socket.io-client";
import { MonacoBinding } from "y-monaco";
import { editor as monacoEditor } from "monaco-editor";

interface UseDocumentSyncProps {
  editorRef: React.MutableRefObject<monacoEditor.IStandaloneCodeEditor | null>;
  ydoc: Y.Doc | null;
  socket: Socket | null;
  roomId: string;
  isEditorMounted: boolean;
}

export function useDocumentSync({
  editorRef,
  ydoc,
  socket,
  roomId,
  isEditorMounted,
}: UseDocumentSyncProps) {
  const bindingRef = useRef<MonacoBinding | null>(null);
  const bindingCreatedRef = useRef(false);
  const handlersRegisteredRef = useRef(false);

  useEffect(() => {
    console.log("Document sync effect running");
    if (!ydoc || !socket || !editorRef.current || !socket.connected) {
      console.log("Missing dependencies for document sync, waiting...");
      return;
    }

    // Join the room
    if (roomId) {
      console.log(`Joining room: ${roomId}`);
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

        if (model) {
          const binding = new MonacoBinding(
            ytext,
            model,
            new Set([editor]),
            null
          );
          bindingRef.current = binding;
          bindingCreatedRef.current = true;

          // Debug logs
          console.log(
            "Initial editor value:",
            model.getValue().substring(0, 50)
          );
          console.log(
            "Initial YText value:",
            ytext.toString().substring(0, 50)
          );

          ytext.observe(() => {
            console.log("YText changed:", ytext.toString().substring(0, 50));
          });

          console.log("Binding created successfully!");
        }
      } catch (error) {
        console.error("Failed to create binding:", error);
      }
    }

    // Register socket handlers if not already done
    if (!handlersRegisteredRef.current) {
      console.log("Registering document sync handlers");

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

    // Cleanup on unmount
    return () => {
      if (handlersRegisteredRef.current) {
        console.log("Cleaning up document sync handlers");
        socket.off("sync-doc");
        socket.off("doc-update");

        if (bindingRef.current) {
          bindingRef.current.destroy();
          bindingRef.current = null;
        }

        handlersRegisteredRef.current = false;
      }
    };
  }, [ydoc, socket, roomId, socket?.connected, isEditorMounted, editorRef]);

  return {
    bindingRef,
    bindingCreated: bindingCreatedRef.current,
  };
}
