import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getDataClient, getIdentity } from "../services/storage";

export type Column = { id: string; title: string };
export type Card = { id: string; text: string };

type Ctx = {
  columns: Column[];
  teamCards: Record<string, Card[]>;
  myCardsByCol: Record<string, Card[]>;
  addMyCard: (columnId: string, text: string) => void;
  editMyCard: (columnId: string, id: string, text: string) => void;
  deleteMyCard: (columnId: string, id: string) => void;
  moveMyCard: (fromCol: string, toCol: string, id: string) => void;
  clearMyColumn: (columnId: string) => void;

  addTeamCard: (columnId: string, text: string) => Promise<void>;
  editTeamCard: (columnId: string, id: string, text: string) => Promise<void>;
  deleteTeamCard: (columnId: string, id: string) => Promise<void>;
  moveTeamCard: (fromCol: string, toCol: string, id: string) => Promise<void>;

  promoteToTeam: (fromCol: string, id: string, toCol?: string) => Promise<void>;
  demoteToMyArea: (fromCol: string, id: string, toCol?: string) => Promise<void>;

  updateColumnTitle: (columnId: string, newTitle: string) => void;
};

const defaultColumns: Column[] = [
  { id: "wentWell", title: "✅ Gut" },
  { id: "toImprove", title: "❌ Schlecht" },
  { id: "actionItems", title: "📋 Verbesserungsvorschläge" }
];

const SessionContext = createContext<Ctx>(null as any);
export const useSession = () => useContext(SessionContext);

const COLLECTION_PREFIX = "retro-v4";
const KEY_TEAM = `${COLLECTION_PREFIX}-team`;
const KEY_MY = (uid: string) => `${COLLECTION_PREFIX}-mycards-${uid}`;

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const [teamCards, setTeamCards] = useState<Record<string, Card[]>>({ wentWell: [], toImprove: [], actionItems: [] });
  const [myCardsByCol, setMyCardsByCol] = useState<Record<string, Card[]>>({ wentWell: [], toImprove: [], actionItems: [] });
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    // 🟢 Sofort versuchen, lokale Daten zu laden (offline verfügbar)
    loadMyData();

    // 🟢 Dann User-ID laden (async) und Teamdaten + private Daten synchronisieren
    (async () => {
      try {
        const uid = await getIdentity();
        console.log("👤 Azure User-ID:", uid);
        setUserId(uid);

        await loadTeamData();

        // Falls lokale Daten unter "local" existieren, migriere sie
        const localKey = getMyKey("local");
        const userKey = getMyKey(uid);
        if (localStorage.getItem(localKey) && !localStorage.getItem(userKey)) {
          console.log("🔄 Migration lokaler Daten → User:", uid);
          localStorage.setItem(userKey, localStorage.getItem(localKey)!);
          localStorage.removeItem(localKey);
        }

        // Jetzt Benutzer-spezifische Daten laden
        loadMyData(uid);
      } catch (e) {
        console.error("❌ Fehler beim Laden von Benutzer- oder Teamdaten:", e);
      }
    })();
  }, []);


  async function loadTeamData() {
    const client = await getDataClient();
    const data = await client.getValue(KEY_TEAM).catch(() => null);
    if (data) {
      setColumns(data.columns || defaultColumns);
      setTeamCards(data.cards || { wentWell: [], toImprove: [], actionItems: [] });
    } else {
      await client.setValue(KEY_TEAM, { columns: defaultColumns, cards: { wentWell: [], toImprove: [], actionItems: [] } });
    }
  }

  function getMyKey(uid?: string) {
    return uid ? KEY_MY(uid) : `${COLLECTION_PREFIX}-mycards-local`;
  }


  function loadMyData(uid?: string) {
    const key = getMyKey(uid);
    const fallback = getMyKey("local");

    // Prüfe zuerst Benutzerkey, sonst lokalen
    const raw = localStorage.getItem(key) || localStorage.getItem(fallback);
    if (!raw) {
      console.log("🟡 Keine gespeicherten privaten Karten gefunden für Key:", key);
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      setMyCardsByCol({
        wentWell: parsed.wentWell || [],
        toImprove: parsed.toImprove || [],
        actionItems: parsed.actionItems || [],
      });
      console.log("✅ Private Karten geladen:", key, parsed);
    } catch (e) {
      console.error("❌ Fehler beim Laden privater Karten:", e);
      setMyCardsByCol({ wentWell: [], toImprove: [], actionItems: [] });
    }
  }



  function saveMy(next: Record<string, Card[]>, uidOverride?: string) {
    const key = getMyKey(uidOverride || userId);
    try {
      localStorage.setItem(key, JSON.stringify(next));
      console.log("💾 Private Karten gespeichert:", key, next);
    } catch (e) {
      console.error("❌ Fehler beim Speichern privater Karten:", e);
    }
    setMyCardsByCol(next); // <-- erst NACH dem Speichern
  }



  async function saveTeam(next: Record<string, Card[]>) {
    setTeamCards(next);
    const client = await getDataClient();
    await client.setValue(KEY_TEAM, { columns, cards: next });
  }

  // Private
  const addMyCard = (columnId: string, text: string) => {
    const card = { id: uuidv4(), text };
    const next = { ...myCardsByCol, [columnId]: [...(myCardsByCol[columnId] || []), card] };
    saveMy(next);
  };
  const editMyCard = (columnId: string, id: string, text: string) => {
    setMyCardsByCol(prev => {
      const updated = {
        ...prev,
        [columnId]: (prev[columnId] || []).map(c => c.id === id ? { ...c, text } : c),
      };

      // direkt beim Update speichern
      const key = getMyKey(userId);
      try {
        localStorage.setItem(key, JSON.stringify(updated));
        console.log("✏️ Karte aktualisiert & gespeichert:", key, updated);
      } catch (e) {
        console.error("❌ Fehler beim Editieren privater Karte:", e);
      }

      return updated;
    });
  };

  const deleteMyCard = (columnId: string, id: string) => {
    setMyCardsByCol(prev => {
      const updated = {
        ...prev,
        [columnId]: (prev[columnId] || []).filter(c => c.id !== id),
      };
      const key = getMyKey(userId);
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  const moveMyCard = (fromCol: string, toCol: string, id: string) => {
    const fromList = myCardsByCol[fromCol] || [];
    const card = fromList.find((c) => c.id === id);
    if (!card) return;

    const updated: Record<string, Card[]> = {
      ...myCardsByCol,
      [fromCol]: fromList.filter((c) => c.id !== id),
      [toCol]: [...(myCardsByCol[toCol] || []), card],
    };
    saveMy(updated);
  };
  const clearMyColumn = (columnId: string) => {
    const next = { ...myCardsByCol, [columnId]: [] };
    saveMy(next);
  };
  // Team
  const addTeamCard = async (columnId: string, text: string) => {
    const card = { id: uuidv4(), text };
    await saveTeam({ ...teamCards, [columnId]: [...(teamCards[columnId] || []), card] });
  };
  const editTeamCard = async (columnId: string, id: string, text: string) => {
    await saveTeam({ ...teamCards, [columnId]: (teamCards[columnId] || []).map(c => c.id === id ? { ...c, text } : c) });
  };
  const deleteTeamCard = async (columnId: string, id: string) => {
    await saveTeam({ ...teamCards, [columnId]: (teamCards[columnId] || []).filter(c => c.id !== id) });
  };
  const moveTeamCard = async (fromCol: string, toCol: string, id: string) => {
    const fromList = teamCards[fromCol] || [];
    const card = fromList.find((c) => c.id === id);
    if (!card) return;

    const updatedTeam: Record<string, Card[]> = {
      ...teamCards,
      [fromCol]: fromList.filter((c) => c.id !== id),
      [toCol]: [...(teamCards[toCol] || []), card],
    };
    setTeamCards(updatedTeam);
    const client = await getDataClient();
    await client.setValue(KEY_TEAM, { columns, cards: updatedTeam });
  };

  const promoteToTeam = async (fromCol: string, id: string, toCol?: string) => {
    const srcList = myCardsByCol[fromCol] || [];
    const card = srcList.find((c) => c.id === id);
    if (!card) return;

    // 1) Privat sofort updaten (lokal + localStorage)
    const updatedMy: Record<string, Card[]> = {
      ...myCardsByCol,
      [fromCol]: srcList.filter((c) => c.id !== id),
    };
    saveMy(updatedMy);

    // 2) Team sofort/lokal updaten + persistent speichern
    const targetCol = toCol || fromCol;
    const updatedTeam: Record<string, Card[]> = {
      ...teamCards,
      [targetCol]: [...(teamCards[targetCol] || []), { id: uuidv4(), text: card.text }],
    };
    setTeamCards(updatedTeam);
    const client = await getDataClient();
    await client.setValue(KEY_TEAM, { columns, cards: updatedTeam });
  };

  const demoteToMyArea = async (fromCol: string, id: string, toCol?: string) => {
    const srcList = teamCards[fromCol] || [];
    const card = srcList.find((c) => c.id === id);
    if (!card) return;

    // 1) Team sofort/lokal updaten + persistent speichern
    const updatedTeam: Record<string, Card[]> = {
      ...teamCards,
      [fromCol]: srcList.filter((c) => c.id !== id),
    };
    setTeamCards(updatedTeam);
    const client = await getDataClient();
    await client.setValue(KEY_TEAM, { columns, cards: updatedTeam });

    // 2) Privat sofort updaten (lokal + localStorage)
    const target = toCol || fromCol;
    const updatedMy: Record<string, Card[]> = {
      ...myCardsByCol,
      [target]: [...(myCardsByCol[target] || []), { id: uuidv4(), text: card.text }],
    };
    saveMy(updatedMy);
  };


  const updateColumnTitle = (columnId: string, newTitle: string) => {
    const updated = columns.map((c) =>
      c.id === columnId ? { ...c, title: newTitle } : c
    );
    setColumns(updated);
    // Optional: Wenn du willst, auch im DevOps-Storage speichern:
    getDataClient().then((client) =>
      client.setValue(KEY_TEAM, { columns: updated, cards: teamCards })
    );
  };

  const value: Ctx = useMemo(() => ({
    columns, teamCards, myCardsByCol,
    addMyCard, editMyCard, deleteMyCard, moveMyCard, clearMyColumn,
    addTeamCard, editTeamCard, deleteTeamCard, moveTeamCard,
    promoteToTeam, demoteToMyArea, updateColumnTitle
  }), [columns, teamCards, myCardsByCol]);




  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
