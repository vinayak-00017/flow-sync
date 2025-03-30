import React from "react";
import { signIn } from "next-auth/react";
import { Button } from "./ui/button";

const Dashboard = () => {
  const handleGoogle = () => {
    signIn("google");
  };
  return (
    <div>
      <Button onClick={handleGoogle}>signin</Button>
      <Button>Create Room</Button>
    </div>
  );
};

export default Dashboard;
