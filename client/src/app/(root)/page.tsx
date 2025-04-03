"use client";
import { Button } from "@/components/ui/button";
import React from "react";
import { signIn, useSession } from "next-auth/react";
import SocketSetup from "@/components/socket-setup";

const Page = () => {
  const handleGoogle = () => {
    signIn("google");
  };

  const { data: session, status } = useSession();

  return (
    <main>
      <Button onClick={handleGoogle}>signin</Button>
      <Button>Create Room</Button>
      <div>{status}</div>
      <SocketSetup roomId="1" userId={session?.user.id}></SocketSetup>
    </main>
  );
};

export default Page;
