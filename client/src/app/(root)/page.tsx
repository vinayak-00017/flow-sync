"use client";
import { Button } from "@/components/ui/button";
import React from "react";
import { signIn, useSession } from "next-auth/react";
import CodeEditor from "@/components/code-editor";

const Page = () => {
  const handleGoogle = () => {
    signIn("google");
  };

  const { data: session, status, update } = useSession();

  return (
    <main>
      <Button onClick={handleGoogle}>signin</Button>
      <Button>Create Room</Button>
      <div>{status}</div>
      <CodeEditor roomId="46545t5464" userId={session?.user.id}></CodeEditor>
    </main>
  );
};

export default Page;
