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
};

const defaultColumns: Column[] = [
  { id: "wentWell", title: "✅ Went Well" },
  { id: "toImprove", title: "⚙️ To Improve" },
  { id: "actionItems", title: "🎯 Action Items" }
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
    (async () => {
      const uid = await getIdentity();
      setUserId(uid);
      await loadTeamData();
      loadMyData(uid);
    })();
  }, []);

  async function loadTeamData() {
    const client = await getDataClient();
    const data = await client.getValue(KEY_TEAM).catch(()=>null);
    if (data) {
      setColumns(data.columns || defaultColumns);
      setTeamCards(data.cards || { wentWell: [], toImprove: [], actionItems: [] });
    } else {
      await client.setValue(KEY_TEAM, { columns: defaultColumns, cards: { wentWell: [], toImprove: [], actionItems: [] } });
    }
  }

  function loadMyData(uid: string) {
    const raw = localStorage.getItem(KEY_MY(uid));
    try {
      const parsed = raw ? JSON.parse(raw) : {};
      setMyCardsByCol({
        wentWell: parsed.wentWell || [],
        toImprove: parsed.toImprove || [],
        actionItems: parsed.actionItems || []
      });
    } catch {
      setMyCardsByCol({ wentWell: [], toImprove: [], actionItems: [] });
    }
  }

  function saveMy(next: Record<string, Card[]>) {
    setMyCardsByCol(next);
    if (userId) localStorage.setItem(KEY_MY(userId), JSON.stringify(next));
  }

  async function saveTeam(next: Record<string, Card[]>) {
    setTeamCards(next);
    const client = await getDataClient();
    await client.setValue(KEY_TEAM, { columns, cards: next });
  }

  // Private
  const addMyCard = (columnId: string, text: string) => {
    const card = { id: uuidv4(), text };
    const next = { ...myCardsByCol, [columnId]: [...(myCardsByCol[columnId]||[]), card] };
    saveMy(next);
  };
  const editMyCard = (columnId: string, id: string, text: string) => {
    const next = { ...myCardsByCol, [columnId]: (myCardsByCol[columnId]||[]).map(c => c.id===id ? { ...c, text } : c) };
    saveMy(next);
  };
  const deleteMyCard = (columnId: string, id: string) => {
    const next = { ...myCardsByCol, [columnId]: (myCardsByCol[columnId]||[]).filter(c => c.id!==id) };
    saveMy(next);
  };
  const moveMyCard = (fromCol: string, toCol: string, id: string) => {
    const fromList = [...(myCardsByCol[fromCol]||[])];
    const card = fromList.find(c => c.id===id);
    if (!card) return;
    const next = {
      ...myCardsByCol,
      [fromCol]: fromList.filter(c => c.id!==id),
      [toCol]: [...(myCardsByCol[toCol]||[]), card]
    };
    saveMy(next);
  };
  const clearMyColumn = (columnId: string) => {
    const next = { ...myCardsByCol, [columnId]: [] };
    saveMy(next);
  };

  // Team
  const addTeamCard = async (columnId: string, text: string) => {
    const card = { id: uuidv4(), text };
    await saveTeam({ ...teamCards, [columnId]: [...(teamCards[columnId]||[]), card] });
  };
  const editTeamCard = async (columnId: string, id: string, text: string) => {
    await saveTeam({ ...teamCards, [columnId]: (teamCards[columnId]||[]).map(c => c.id===id ? { ...c, text } : c) });
  };
  const deleteTeamCard = async (columnId: string, id: string) => {
    await saveTeam({ ...teamCards, [columnId]: (teamCards[columnId]||[]).filter(c => c.id!==id) });
  };
  const moveTeamCard = async (fromCol: string, toCol: string, id: string) => {
    const fromList = [...(teamCards[fromCol]||[])];
    const card = fromList.find(c => c.id===id);
    if (!card) return;
    await saveTeam({
      ...teamCards,
      [fromCol]: fromList.filter(c => c.id!==id),
      [toCol]: [...(teamCards[toCol]||[]), card]
    });
  };

  const promoteToTeam = async (fromCol: string, id: string, toCol?: string) => {
    const src = [...(myCardsByCol[fromCol]||[])];
    const card = src.find(c => c.id===id);
    if (!card) return;
    await addTeamCard(toCol || fromCol, card.text);
    deleteMyCard(fromCol, id);
  };

  const demoteToMyArea = async (fromCol: string, id: string, toCol?: string) => {
    const list = [...(teamCards[fromCol]||[])];
    const card = list.find(c => c.id===id);
    if (!card) return;
    await deleteTeamCard(fromCol, id);
    const target = toCol || fromCol;
    const next = { ...myCardsByCol, [target]: [...(myCardsByCol[target]||[]), { id: uuidv4(), text: card.text }] };
    saveMy(next);
  };

  const value: Ctx = useMemo(() => ({
    columns, teamCards, myCardsByCol,
    addMyCard, editMyCard, deleteMyCard, moveMyCard, clearMyColumn,
    addTeamCard, editTeamCard, deleteTeamCard, moveTeamCard,
    promoteToTeam, demoteToMyArea
  }), [columns, teamCards, myCardsByCol]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
