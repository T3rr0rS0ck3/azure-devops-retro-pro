import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getIdentity, loadTeamValue, saveTeamValue, loadMyLocal, saveMyLocal } from "../services/storage";

export type Column = { id: string; title: string };
export type Card = { id: string; text: string };

type RetroBoard = {
  id: string;
  name: string;
  columns: Column[];
  teamCards: Record<string, Card[]>;
};

type Ctx = {
  columns: Column[];
  teamCards: Record<string, Card[]>;
  myCardsByCol: Record<string, Card[]>;

  boards: { id: string; name: string }[];
  activeBoardId: string | null;
  addBoard: (name: string) => Promise<void>;
  switchBoard: (id: string) => void;
  renameBoard: (id: string, name: string) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;

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
  demoteToMyArea: (fromCol: string, id: string, toCol?: string) => void;
  updateColumnTitle: (colId: string, title: string) => Promise<void>;
};

const SessionContext = createContext<Ctx>(null as any);
export const useSession = () => useContext(SessionContext);

const COLLECTION_PREFIX = "retro-v5";
const KEY_BOARDS = `${COLLECTION_PREFIX}-boards`; // teamweit
const KEY_MY = (uid: string, boardId: string) => `${COLLECTION_PREFIX}-mycards-${uid}-${boardId}`;

const defaultColumns: Column[] = [
  { id: "wentWell", title: "✅ Gut gelaufen" },
  { id: "toImprove", title: "🛠️ Verbesserung" },
  { id: "actionItems", title: "📋 Aktionen" }
];

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string>("");
  const [boards, setBoards] = useState<RetroBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const currentBoard = useMemo(() => boards.find(b => b.id === activeBoardId) || null, [boards, activeBoardId]);
  const columns = currentBoard?.columns || defaultColumns;
  const [teamCards, setTeamCards] = useState<Record<string, Card[]>>({ wentWell: [], toImprove: [], actionItems: [] });
  const [myCardsByCol, setMyCardsByCol] = useState<Record<string, Card[]>>({ wentWell: [], toImprove: [], actionItems: [] });

  function myKey(uid?: string, boardId?: string) {
    const id = uid || userId || "local";
    const bid = boardId || activeBoardId || "default";
    return KEY_MY(id, bid);
  }

  // --- Team Boards laden/speichern ---
  async function loadBoards() {
    const data = await loadTeamValue<RetroBoard[]>(KEY_BOARDS);
    if (data && Array.isArray(data) && data.length > 0) {
      setBoards(data);
      setActiveBoardId(data[0].id);
      setTeamCards(data[0].teamCards);
    } else {
      // initialisieren (leeres Standardboard)
      const initial: RetroBoard = {
        id: uuidv4(),
        name: "Erstes Board",
        columns: defaultColumns,
        teamCards: { wentWell: [], toImprove: [], actionItems: [] }
      };
      await saveTeamValue(KEY_BOARDS, [initial]);
      setBoards([initial]);
      setActiveBoardId(initial.id);
      setTeamCards(initial.teamCards);
    }
  }

  async function saveBoards(next: RetroBoard[]) {
    await saveTeamValue(KEY_BOARDS, next);
    setBoards(next);
  }

  // --- Private (pro Board & User) ---
  function loadMyData(uid?: string, boardId?: string) {
    const key = myKey(uid, boardId);
    const parsed = loadMyLocal<Record<string, Card[]>>(key);
    if (parsed) setMyCardsByCol(parsed);
    else setMyCardsByCol({ wentWell: [], toImprove: [], actionItems: [] });
  }

  function persistMy(next: Record<string, Card[]>, uidOverride?: string, boardIdOverride?: string) {
    const key = myKey(uidOverride, boardIdOverride);
    saveMyLocal(key, next);
    setMyCardsByCol(next);
  }

  // --- Board-Operationen ---
  async function addBoard(name: string) {
    const newB: RetroBoard = { id: uuidv4(), name: name || "Neues Board", columns: defaultColumns, teamCards: { wentWell: [], toImprove: [], actionItems: [] } };
    const updated = [...boards, newB];
    await saveBoards(updated);
    setActiveBoardId(newB.id);
    setTeamCards(newB.teamCards);
    loadMyData(userId, newB.id);
  }

  function switchBoard(id: string) {
    const found = boards.find(b => b.id === id);
    if (!found) return;
    setActiveBoardId(found.id);
    setTeamCards(found.teamCards);
    loadMyData(userId, found.id);
  }

  async function renameBoard(id: string, name: string) {
    const updated = boards.map(b => b.id === id ? { ...b, name } : b);
    await saveBoards(updated);
  }

  async function deleteBoard(id: string) {
    const updated = boards.filter(b => b.id !== id);
    await saveBoards(updated);
    if (activeBoardId === id) {
      const next = updated[0] || null;
      setActiveBoardId(next ? next.id : null);
      setTeamCards(next ? next.teamCards : { wentWell: [], toImprove: [], actionItems: [] });
      loadMyData(userId, next?.id || "");
    }
  }

  // --- Team-Operationen (persistiert im Team-Storage) ---
  async function saveTeam(next: Record<string, Card[]>) {
    if (!currentBoard) return;
    setTeamCards(next);
    const updated = boards.map(b => b.id === currentBoard.id ? { ...b, teamCards: next } : b);
    await saveBoards(updated);
  }

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
    const card = fromList.find(c => c.id === id);
    if (!card) return;
    const updatedTeam: Record<string, Card[]> = {
      ...teamCards,
      [fromCol]: fromList.filter(c => c.id !== id),
      [toCol]: [...(teamCards[toCol] || []), card],
    };
    await saveTeam(updatedTeam);
  };

  // --- Private Operationen (lokal, pro Board & User) ---
  const addMyCard = (columnId: string, text: string) => {
    const card = { id: uuidv4(), text };
    const next = { ...myCardsByCol, [columnId]: [...(myCardsByCol[columnId] || []), card] };
    persistMy(next);
  };
  const editMyCard = (columnId: string, id: string, text: string) => {
    const next = { ...myCardsByCol, [columnId]: (myCardsByCol[columnId] || []).map(c => c.id === id ? { ...c, text } : c) };
    persistMy(next);
  };
  const deleteMyCard = (columnId: string, id: string) => {
    const next = { ...myCardsByCol, [columnId]: (myCardsByCol[columnId] || []).filter(c => c.id !== id) };
    persistMy(next);
  };
  const moveMyCard = (fromCol: string, toCol: string, id: string) => {
    const fromList = myCardsByCol[fromCol] || [];
    const card = fromList.find(c => c.id === id);
    if (!card) return;
    const next = {
      ...myCardsByCol,
      [fromCol]: fromList.filter(c => c.id !== id),
      [toCol]: [...(myCardsByCol[toCol] || []), card]
    };
    persistMy(next);
  };
  const clearMyColumn = (columnId: string) => {
    const next = { ...myCardsByCol, [columnId]: [] };
    persistMy(next);
  };

  // Promote / demote
  const promoteToTeam = async (fromCol: string, id: string, toCol?: string) => {
    const fromList = myCardsByCol[fromCol] || [];
    const card = fromList.find(c => c.id === id);
    if (!card) return;
    await addTeamCard(toCol || fromCol, card.text);
    const next = { ...myCardsByCol, [fromCol]: fromList.filter(c => c.id !== id) };
    persistMy(next);
  };
  const demoteToMyArea = (fromCol: string, id: string, toCol?: string) => {
    const fromList = teamCards[fromCol] || [];
    const card = fromList.find(c => c.id === id);
    if (!card) return;
    const target = toCol || fromCol;
    const next = { ...myCardsByCol, [target]: [...(myCardsByCol[target] || []), { id: uuidv4(), text: card.text }] };
    persistMy(next);
  };

  const updateColumnTitle = async (colId: string, title: string) => {
    if (!currentBoard) return;
    const nextCols = columns.map(c => c.id === colId ? ({ ...c, title }) : c);
    const updated = boards.map(b => b.id === currentBoard.id ? { ...b, columns: nextCols } : b);
    await saveBoards(updated);
  };

  // Initial load
  useEffect(() => {
    (async () => {
      const uid = await getIdentity();
      setUserId(uid);
      await loadBoards();
      // my-cards werden im folgenden Effekt geladen
    })();
  }, []);

  // load my-cards when board or user changes
  useEffect(() => {
    if (userId && activeBoardId) loadMyData(userId, activeBoardId);
  }, [userId, activeBoardId]);

  // Polling zur Synchronisation zwischen mehreren Tabs
  useEffect(() => {
    const id = setInterval(async () => {
      const data = await loadTeamValue<RetroBoard[]>(KEY_BOARDS);
      if (!data) return;
      const found = activeBoardId ? data.find(b => b.id === activeBoardId) : null;
      if (found) {
        const current = JSON.stringify(teamCards);
        const incoming = JSON.stringify(found.teamCards);
        if (current !== incoming) {
          setTeamCards(found.teamCards);
        }
      }
    }, 3000);
    return () => clearInterval(id);
  }, [activeBoardId, teamCards]);

  const value: Ctx = useMemo(() => ({
    columns, teamCards, myCardsByCol,
    boards: boards.map(b => ({ id: b.id, name: b.name })),
    activeBoardId,
    addBoard, switchBoard, renameBoard, deleteBoard,
    addMyCard, editMyCard, deleteMyCard, moveMyCard, clearMyColumn,
    addTeamCard, editTeamCard, deleteTeamCard, moveTeamCard,
    promoteToTeam, demoteToMyArea, updateColumnTitle
  }), [columns, teamCards, myCardsByCol, boards, activeBoardId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
