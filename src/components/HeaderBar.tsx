import React from "react";
import { useSession } from "../context/SessionContext";

function toMarkdown(teamCards: Record<string, {id:string;text:string}[]>, columns: {id:string; title:string}[]) {
  const lines: string[] = [];
  lines.push(`# Retrospective Export`);
  lines.push("");
  for (const col of columns) {
    lines.push(`## ${col.title}`);
    const cards = teamCards[col.id] || [];
    for (const c of cards) lines.push(`- ${c.text}`);
    lines.push("");
  }
  return lines.join("\n");
}

export default function HeaderBar() {
  const { columns, teamCards, boards, activeBoardId, switchBoard, addBoard } = useSession();

  const download = () => {
    const md = toMarkdown(teamCards, columns);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "retro-export.md"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shadow sticky top-0 z-30">
      <h1 className="text-lg font-semibold">Team Retrospective Pro</h1>
      <div className="flex items-center gap-2">
        <select
          value={activeBoardId || ""}
          onChange={(e) => switchBoard(e.target.value)}
          className="text-blue-900 bg-white rounded px-2 py-1 text-sm"
        >
          {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <button
          onClick={() => {
            const name = prompt("Name des neuen Boards:");
            if (name) addBoard(name);
          }}
          className="px-3 py-1.5 bg-white text-blue-700 rounded shadow hover:shadow-md text-sm"
        >
          + Neues Board
        </button>
        <button onClick={download} className="px-3 py-1.5 bg-white text-blue-700 rounded shadow hover:shadow-md text-sm">Export Markdown</button>
      </div>
    </header>
  );
}
