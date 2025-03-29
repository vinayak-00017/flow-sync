"use client";
import { Button } from "@/components/ui/button";
import React from "react";
import { signIn } from "next-auth/react";

const page = () => {
  const handleGoogle = () => {
    signIn("google");
  };
  return (
    <main>
      <Button onClick={handleGoogle}>signin</Button>
    </main>
  );
};

export default page;
