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
  const { teamCards, columns } = useSession();

  const download = () => {
    const md = toMarkdown(teamCards, columns);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "retro-export.md"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white shadow">
      <h1 className="text-lg font-semibold">Team Retrospective Pro</h1>
      <div className="flex items-center gap-2">
        <button onClick={download} className="px-3 py-1.5 bg-white text-blue-700 rounded shadow hover:shadow-md">Export Markdown</button>
      </div>
    </header>
  );
}
