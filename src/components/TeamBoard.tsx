import React from "react";
import { useSession } from "../context/SessionContext";
import TeamColumn from "./team/TeamColumn";

export default function TeamBoard() {
  const { columns } = useSession();
  return (
    <div className="h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
      {columns.map((c) => (
        <TeamColumn key={c.id} columnId={c.id} title={c.title} />
      ))}
    </div>
  );
}
