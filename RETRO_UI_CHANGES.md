
# UI-Überarbeitung – Retrotool-Style (Sticky Notes & Full-Bleed)

**Was ist neu?**
- Vollflächiger Hintergrund (`board-bg`) – die Seite füllt den ganzen Bildschirm.
- Spalten sind kartenbasiert und strecken sich über die volle Höhe.
- Karten sind **Sticky Notes** (leicht gedreht, Stecknadel, Paper-Look).
- Drag & Drop:
  - Privat ➜ Team: Karte auf "Team"-Dropzone ziehen.
  - Team ➜ Privat: Karte auf "Privat"-Dropzone ziehen.
  - Team ➜ anderes Team: Karte auf andere Spalte ziehen.
  - Privat ➜ andere Privatspalte: ziehen.
- Editieren/Löschen direkt auf der Note.
- Zwei Eingabefelder je Spalte: Team-Notiz & private Notiz.

**Geänderte Dateien**
- `src/index.css` – neue Styles (`.sticky-note`, `.board-bg`, `.drop-zone`)
- `src/App.tsx` – Full-Bleed Layout
- `src/components/TeamBoard.tsx` – responsive, volle Höhe, 1–3 Spalten
- `src/components/team/TeamColumn.tsx` – neues Sticky-UI, Drag & Drop

**Build & Test**
```bash
npm install
npm run dev
# oder
npm run build
```

Wenn dies eine Azure DevOps Extension ist, weiter wie gewohnt mit `tfx` packen und veröffentlichen.
