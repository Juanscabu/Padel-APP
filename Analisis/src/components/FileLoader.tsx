// Carga el JSON: drag & drop + input file. La validación pesada vive
// en el parser; acá solo leemos el archivo y llamamos al callback.

import { useCallback, useRef, useState } from "react";

interface Props {
  onJson: (raw: unknown, fileName: string) => void;
  onError: (message: string) => void;
}

export function FileLoader({ onJson, onError }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".json")) {
        onError("Tiene que ser un archivo .json");
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => onError("No se pudo leer el archivo");
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          onJson(parsed, file.name);
        } catch (e) {
          onError("El archivo no es JSON válido: " + (e as Error).message);
        }
      };
      reader.readAsText(file);
    },
    [onJson, onError],
  );

  return (
    <div
      className={`file-loader ${dragOver ? "drag-over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <div className="file-loader__icon">📂</div>
      <div className="file-loader__title">Cargar partido</div>
      <div className="file-loader__hint">
        Arrastrá un .json acá o hacé click para elegir uno
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
