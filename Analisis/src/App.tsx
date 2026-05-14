import { useEffect, useMemo, useState } from "react";
import { FileLoader } from "./components/FileLoader";
import { TeamsBanner } from "./components/TeamsBanner";
import { DASHBOARD_SECTIONS } from "./dashboard.config";
import { parseMatch, ParseError } from "./parser/parseMatch";
import { Match } from "./parser/types";

const STORAGE_KEY = "padel-analisis:lastMatch";
const FILE_NAME_KEY = "padel-analisis:lastFileName";

interface StoredMatch {
  raw: unknown;
  fileName: string;
}

function loadFromStorage(): StoredMatch | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const name = localStorage.getItem(FILE_NAME_KEY) ?? "";
    if (!raw) return null;
    return { raw: JSON.parse(raw), fileName: name };
  } catch {
    return null;
  }
}

function saveToStorage(raw: unknown, fileName: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
    localStorage.setItem(FILE_NAME_KEY, fileName);
  } catch {
    // localStorage lleno o deshabilitado — no es bloqueante
  }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(FILE_NAME_KEY);
}

export function App() {
  const [match, setMatch] = useState<Match | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // Restaurar el último partido cargado, si existe.
  useEffect(() => {
    const stored = loadFromStorage();
    if (!stored) return;
    try {
      setMatch(parseMatch(stored.raw));
      setFileName(stored.fileName);
    } catch {
      clearStorage();
    }
  }, []);

  const handleJson = (raw: unknown, name: string) => {
    try {
      const parsed = parseMatch(raw);
      setMatch(parsed);
      setFileName(name);
      setError(null);
      saveToStorage(raw, name);
    } catch (e) {
      const msg = e instanceof ParseError ? e.message : "No se pudo parsear el JSON";
      setError(msg);
    }
  };

  const sections = useMemo(() => DASHBOARD_SECTIONS, []);

  return (
    <div className="app">
      <Header
        fileName={fileName}
        match={match}
        onChange={() => {
          setMatch(null);
          setFileName("");
          clearStorage();
        }}
      />

      {!match && (
        <div className="loader-wrap">
          <FileLoader onJson={handleJson} onError={setError} />
          {error && <div className="error">{error}</div>}
          <div className="loader-hint">
            Tip: cargá el .json generado por la app de tracking. El parser
            tolera campos nuevos y valores desconocidos.
          </div>
        </div>
      )}

      {match && (
        <>
          <TeamsBanner match={match} />
          <nav className="nav">
            {sections.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="nav__link">
                {s.navLabel}
              </a>
            ))}
          </nav>
          <main className="main">
            {sections.map(({ id, component: Component }) => (
              <Component key={id} match={match} />
            ))}
          </main>
        </>
      )}

      {error && match && <div className="error error--floating">{error}</div>}
    </div>
  );
}

interface HeaderProps {
  fileName: string;
  match: Match | null;
  onChange: () => void;
}

function Header({ fileName, match, onChange }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__dot" />
        <span className="header__title">PÁDEL · ANÁLISIS</span>
      </div>
      {match && (
        <div className="header__match">
          <span className="header__file">{fileName || "partido"}</span>
          <button className="btn btn--ghost" onClick={onChange}>
            Cargar otro
          </button>
        </div>
      )}
    </header>
  );
}
