import React, { useMemo, useRef, useState } from "react";
import { useSession } from "../../context/SessionContext";
import { Plus, Trash2, Edit } from "lucide-react";

type Props = { columnId: string; title: string };

export default function TeamColumn({ columnId, title }: Props) {
  const {
    teamCards,
    myCardsByCol,
    addMyCard,
    editMyCard,
    deleteMyCard,
    moveMyCard,
    addTeamCard,
    editTeamCard,
    deleteTeamCard,
    moveTeamCard,
    promoteToTeam,
    demoteToMyArea,
  } = useSession();

  const [text, setText] = useState("");
  const [textPrivate, setTextPrivate] = useState("");
  const [dragOverArea, setDragOverArea] = useState<"team" | "private" | null>(null);

  const publicCards = teamCards[columnId] || [];
  const privateCards = myCardsByCol[columnId] || [];

  const onDropTeam = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    if (type === "mycard") {
      const id = e.dataTransfer.getData("id");
      const fromCol = e.dataTransfer.getData("fromCol");
      if (id && fromCol) promoteToTeam(fromCol, id, columnId);
    } else if (type === "teamcard") {
      const id = e.dataTransfer.getData("id");
      const fromCol = e.dataTransfer.getData("fromCol");
      if (id && fromCol && fromCol !== columnId) moveTeamCard(fromCol, columnId, id);
    }
    setDragOverArea(null);
  };

  const onDropPrivate = (e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    if (type === "teamcard") {
      const id = e.dataTransfer.getData("id");
      const fromCol = e.dataTransfer.getData("fromCol");
      if (id && fromCol) demoteToMyArea(fromCol, id, columnId);
    } else if (type === "mycard") {
      const id = e.dataTransfer.getData("id");
      const fromCol = e.dataTransfer.getData("fromCol");
      if (id && fromCol && fromCol !== columnId) moveMyCard(fromCol, columnId, id);
    }
    setDragOverArea(null);
  };

  const onDragOver = (e: React.DragEvent, zone: "team" | "private") => {
    e.preventDefault();
    setDragOverArea(zone);
  };

  return (
    <section className="min-h-[60vh] flex flex-col rounded-xl bg-white/70 backdrop-blur border border-slate-200 shadow-sm">
      <header className="px-4 py-3 border-b bg-white/60 rounded-t-xl sticky top-0 z-10">
        <header className="px-4 py-3 border-b bg-white/60 rounded-t-xl sticky top-0 z-10 flex items-center justify-between">
          <EditableTitle columnId={columnId} initialTitle={title} />
        </header>
      </header>

      <div className="grid grid-rows-[auto_auto_1fr_auto_auto_1fr] gap-2 p-4 flex-1">
        {/* ÖFFENTLICHER BEREICH */}
        <section
          className={`rounded-xl shadow-sm border-2 border-dashed ${dragOverArea === "team" ? "border-slate-600 bg-slate-50/50" : "border-slate-300"
            } p-4 mb-6 flex flex-col transition-colors duration-150`}
          onDragOver={(e) => onDragOver(e, "team")}
          onDragLeave={() => setDragOverArea(null)}
          onDrop={onDropTeam}
        >
          {/* Kartenliste (2 Reihen sichtbar, dann scroll) */}
          <div
            className="relative"
            style={{ maxHeight: "340px", overflowY: "auto" }}
          >
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 place-items-center pb-4">
              {publicCards.map((c) => (
                <StickyCard
                  key={c.id}
                  id={c.id}
                  text={c.text}
                  onEdit={(t) => editTeamCard(columnId, c.id, t)}
                  onDelete={() => deleteTeamCard(columnId, c.id)}
                  draggableType="teamcard"
                  fromCol={columnId}
                />
              ))}
              {publicCards.length === 0 && (
                <p className="text-sm text-slate-400 italic py-4">
                  Noch keine öffentlichen Notizen.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* PRIVATER BEREICH */}
        <section
          className={`rounded-xl shadow-inner border-2 border-dashed ${dragOverArea === "private" ? "border-slate-500 bg-slate-50/60" : "border-slate-300"
            } p-4 flex flex-col transition-colors duration-150`}
          onDragOver={(e) => onDragOver(e, "private")}
          onDragLeave={() => setDragOverArea(null)}
          onDrop={onDropPrivate}
        >
          <div className="flex items-center justify-between mb-3 sticky top-0 bg-slate-50/90 backdrop-blur-sm py-1 z-10">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Private
            </h3>
            <button
              onClick={() => addMyCard(columnId, "")}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-600 text-white text-sm hover:opacity-90"
            >
              <Plus size={16} /> Hinzufügen
            </button>
          </div>

          {/* Kartenliste (2 Reihen sichtbar, dann scroll) */}
          <div
            className="relative"
            style={{ maxHeight: "340px", overflowY: "auto" }}
          >
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 place-items-center pb-4">
              {privateCards.map((c) => (
                <StickyCard
                  key={c.id}
                  id={c.id}
                  text={c.text}
                  onEdit={(t) => editMyCard(columnId, c.id, t)}
                  onDelete={() => deleteMyCard(columnId, c.id)}
                  draggableType="mycard"
                  fromCol={columnId}
                />
              ))}
              {privateCards.length === 0 && (
                <p className="text-sm text-slate-400 italic py-4">
                  Noch keine privaten Notizen. Klicke auf <b>„+ Hinzufügen“</b>.
                </p>
              )}
            </div>
          </div>
        </section>

      </div>
    </section>
  );
}

type CardProps = {
  id: string;
  text: string;
  onEdit: (text: string) => void;
  onDelete: () => void;
  draggableType: "teamcard" | "mycard";
  fromCol: string;
};

function StickyCard({ id, text, onEdit, onDelete, draggableType, fromCol }: CardProps) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(text);
  const noteRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={noteRef}
      className="sticky-note"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("type", draggableType);
        e.dataTransfer.setData("id", id);
        e.dataTransfer.setData("fromCol", fromCol);
      }}
    >
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (val.trim().length === 0) return;
            onEdit(val.trim());
            setEditing(false);
          }}
          className="flex flex-col gap-2"
        >
          <textarea
            className="w-full resize-none rounded border border-yellow-300 bg-yellow-50 px-2 py-1 text-sm"
            rows={3}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2">
            <button type="submit" className="px-2 py-1 text-xs rounded bg-emerald-600 text-white">Speichern</button>
            <button type="button" onClick={() => setEditing(false)} className="px-2 py-1 text-xs rounded bg-slate-200">Abbrechen</button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <div className="whitespace-pre-wrap text-[0.95rem] leading-5">{text}</div>
          <div className="flex gap-2 shrink-0">
            <button className="text-sm" title="Bearbeiten" onClick={() => setEditing(true)}><Edit size={16} /></button>
            <button className="text-sm text-red-600" title="Löschen" onClick={onDelete}><Trash2 size={16} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableTitle({ columnId, initialTitle }: { columnId: string; initialTitle: string }) {
  const { columns, updateColumnTitle } = useSession();
  const [editing, setEditing] = React.useState(false);
  const [value, setValue] = React.useState(initialTitle);

  const onSave = () => {
    setEditing(false);
    if (value.trim().length > 0 && value !== initialTitle) {
      updateColumnTitle(columnId, value.trim());
    }
  };

  return (
    <div className="flex items-center gap-2 w-full">
      {editing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="w-full"
        >
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={onSave}
            className="w-full bg-yellow-50 border border-yellow-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            autoFocus
          />
        </form>
      ) : (
        <h2
          className="font-semibold text-slate-800 text-base cursor-pointer hover:underline"
          onClick={() => setEditing(true)}
          title="Titel bearbeiten"
        >
          {value}
        </h2>
      )}
    </div>
  );
}
