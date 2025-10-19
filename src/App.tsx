import React from "react";
import HeaderBar from "./components/HeaderBar";
import { SessionProvider } from "./context/SessionContext";
import TeamBoard from "./components/TeamBoard";

export default function App() {
  return (
    <SessionProvider>
      <div className="min-h-screen flex flex-col board-bg">
        <HeaderBar />
        <div className="p-4 flex-1">
          <TeamBoard />
        </div>
      </div>
    </SessionProvider>
  );
}