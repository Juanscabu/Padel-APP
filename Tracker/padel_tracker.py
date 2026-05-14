"""
Padel Tracker — captura rápida de golpes via teclado.

Ejecutar:
    python padel_tracker.py

Ver README.md para teclado y EXTENSION.md para personalizar tipos de
golpe y campos del modelo de datos.
"""

import os
import sys
import tkinter as tk
from datetime import datetime
from tkinter import filedialog, messagebox, ttk
from typing import Optional


def app_base_dir() -> str:
    """Carpeta donde viven sessions/ y examples/.

    En modo dev: la carpeta del .py.
    Empaquetado con PyInstaller (--onefile): la carpeta del .exe — no la
    temporal de extracción que apunta __file__."""
    if getattr(sys, "frozen", False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.dirname(os.path.abspath(__file__))

from data_model import Match, Shot, now_iso
from scoring import MatchScore
from shot_types import (
    DIRECTION_LABELS,
    DIRECTIONS,
    PLAYERS,
    RESULT_LABELS,
    RESULTS,
    SAQUE_RESULT_LABELS,
    SAQUE_RESULTS,
    SHOT_TYPE_LABELS,
    SHOT_TYPES,
    SHOT_TYPES_WITH_SIDE,
    SHOT_TYPES_WITH_WALL,
    SIDE_LABELS,
    SIDES,
    TEAM_OF_PLAYER,
    WALL_LABELS,
    WALL_OPTIONS,
)
from storage import (
    export_csv,
    load_match,
    sanitize_basename,
    save_json,
    session_filename,
)


# ---------- Tema ----------
COLORS = {
    "bg": "#1e1e1e",
    "panel": "#252526",
    "panel_alt": "#2d2d30",
    "fg": "#e0e0e0",
    "muted": "#888888",
    "accent": "#4ec9b0",
    "highlight": "#dcdcaa",
    "team_a": "#569cd6",
    "team_b": "#ce9178",
    "ok": "#73c990",
    "error": "#f48771",
    "border": "#3c3c3c",
}

FONT_MONO = ("Consolas", 11)
FONT_MONO_BIG = ("Consolas", 14, "bold")
FONT_TITLE = ("Segoe UI", 13, "bold")
FONT_SCORE = ("Segoe UI", 28, "bold")
FONT_STATE = ("Segoe UI", 16, "bold")


# ---------- Estados de la máquina ----------
S_PLAYER = "player"
S_SHOT = "shot"
S_SIDE = "side"
S_WALL = "wall"
S_DIRECTION = "direction"
S_RESULT = "result"
S_OTRO_LABEL = "otro_label"
S_SERVER = "server"  # al inicio de cada game: ¿quién saca?

# El título y la lista de teclas se generan en runtime — para S_PLAYER
# usando los nombres reales del partido, y para los otros pasos a partir
# de los dicts de shot_types.py. Editar shot_types.py basta para que la
# UI muestre los nuevos golpes/direcciones automáticamente.

STATE_TITLES = {
    S_PLAYER: "¿QUIÉN GOLPEA?",
    S_SHOT: "¿QUÉ TIPO DE GOLPE?",
    S_SIDE: "¿LADO DEL GOLPE?",
    S_WALL: "¿FUE CON PARED?",
    S_DIRECTION: "¿HACIA DÓNDE FUE?",
    S_RESULT: "¿CÓMO TERMINÓ EL GOLPE?",
    S_OTRO_LABEL: "ETIQUETA OPCIONAL DEL GOLPE",
    S_SERVER: "¿QUIÉN SACA ESTE GAME?",
}


def _format_keys(mapping: dict, labels: dict | None = None) -> str:
    """Convierte un mapping {tecla: id} en 'TECLA = Etiqueta · TECLA = Etiqueta'."""
    parts = []
    for key, value in mapping.items():
        label = labels.get(value, value) if labels else value
        parts.append(f"{key.upper()} = {label}")
    return "  ·  ".join(parts)


def auto_winner(jugador: str, resultado: str) -> str | None:
    """Determina el equipo ganador del punto a partir del jugador y resultado.

    - winner / ace del jugador → punto para SU equipo
    - error / doble_falta      → punto para el equipo RIVAL
    - en_juego / falta         → None (el punto sigue: peloteo o segundo saque)
    """
    if resultado in ("en_juego", "falta"):
        return None
    team = TEAM_OF_PLAYER[jugador]
    if resultado == "winner":
        return team
    # error o doble_falta
    return "B" if team == "A" else "A"


class PadelTracker(tk.Tk):
    def __init__(self, startup):
        """
        startup: dict con la configuración de arranque devuelta por StartupDialog.
            { "action": "new", "players": {...} }
            { "action": "continue", "path": "..." }
        """
        super().__init__()
        self.title("Padel Tracker")
        self.configure(bg=COLORS["bg"])
        self.geometry("1100x780")
        self.minsize(900, 700)

        # --- Persistencia base ---
        self.sessions_dir = os.path.join(app_base_dir(), "sessions")
        os.makedirs(self.sessions_dir, exist_ok=True)

        # --- Estado de partido ---
        if startup["action"] == "continue":
            self._load_existing(startup["path"])
        else:
            self._init_new(startup.get("players"))

        # --- Estado de la máquina ---
        self.current = {}  # campos parcialmente armados del próximo golpe
        self._set_initial_state()

        self._build_ui()
        self._bind_keys()
        self._refresh_ui()
        self._save()  # garantiza que el archivo exista en disco

    def _set_initial_state(self):
        """Decide estado y current según el último golpe registrado.

        - sin golpes:           pedir saque del game 1                   (S_SERVER)
        - última 'falta':       segundo saque del mismo jugador          (S_DIRECTION)
        - última 'en_juego':    rally activo, esperar próximo jugador    (S_PLAYER)
        - punto cerrado:        auto-asigna por rotación si hay info,
                                sino preguntá quién saca                 (S_SERVER)
        """
        self.current = {}
        shots = self.match.shots
        if not shots:
            self.state = S_SERVER
            self.server = None
            return
        last = shots[-1]
        if last.resultado == "falta":
            self.server = last.jugador
            self.current = {"jugador": last.jugador, "tipo_golpe": "saque"}
            self.state = S_DIRECTION
            return
        if last.equipo_ganador_punto is None:
            # rally activo: server es el del primer saque del punto en curso
            self.server = self._find_server_in_current_point()
            self.state = S_PLAYER
            return
        # último golpe cerró un punto. Intentar auto-asignar el sacador.
        auto = self._compute_auto_server()
        if auto is not None:
            self._arm_server(auto)
            return
        self.server = None
        self.state = S_SERVER

    def _find_server_in_current_point(self):
        if not self.match.shots:
            return None
        last = self.match.shots[-1]
        if last.equipo_ganador_punto is not None:
            return None
        for s in self.match.shots:
            if s.punto_id == last.punto_id and s.tipo_golpe == "saque":
                return s.jugador
        return None

    def _init_new(self, players):
        self.started_at_dt = datetime.now()
        self.match = Match(
            started_at=self.started_at_dt.astimezone().isoformat(timespec="seconds"),
            players=players or {"J1": "J1", "J2": "J2", "J3": "J3", "J4": "J4"},
        )
        self.point_id = 1
        self.golpe_id = 1
        self.match_score = MatchScore()
        self.server = None  # se setea en S_SERVER antes del primer saque
        # Orden de saque del set actual. Vacío al inicio, [X] tras game 1,
        # [X, Y, otherX, otherY] tras game 2. Se resetea al cerrar un set.
        self.server_order: list[str] = []
        self.json_path = os.path.join(
            self.sessions_dir, session_filename(self.started_at_dt, "json")
        )
        self.csv_path = os.path.join(
            self.sessions_dir, session_filename(self.started_at_dt, "csv")
        )

    def _load_existing(self, path):
        self.match = load_match(path)
        try:
            self.started_at_dt = datetime.fromisoformat(self.match.started_at)
        except ValueError:
            self.started_at_dt = datetime.now()
        # auto-save al mismo archivo abierto
        self.json_path = os.path.abspath(path)
        base, _ = os.path.splitext(self.json_path)
        self.csv_path = base + ".csv"
        self.point_id = 1
        self.golpe_id = 1
        self.match_score = MatchScore()
        self.server = None
        self.server_order = []
        self._recompute_counters()

    # ------------------------------------------------------------------
    # UI
    # ------------------------------------------------------------------
    def _build_ui(self):
        style = ttk.Style(self)
        # ttk en tema 'clam' acepta colores custom
        try:
            style.theme_use("clam")
        except tk.TclError:
            pass
        style.configure(
            "Treeview",
            background=COLORS["panel"],
            foreground=COLORS["fg"],
            fieldbackground=COLORS["panel"],
            rowheight=24,
            font=FONT_MONO,
            borderwidth=0,
        )
        style.configure(
            "Treeview.Heading",
            background=COLORS["panel_alt"],
            foreground=COLORS["accent"],
            font=("Segoe UI", 10, "bold"),
            borderwidth=0,
        )
        style.map("Treeview", background=[("selected", COLORS["panel_alt"])])

        # ---- Header ----
        header = tk.Frame(self, bg=COLORS["bg"])
        header.pack(fill="x", padx=12, pady=(10, 4))
        tk.Label(
            header,
            text="PÁDEL TRACKER",
            fg=COLORS["accent"],
            bg=COLORS["bg"],
            font=FONT_TITLE,
        ).pack(side="left")
        self.lbl_file = tk.Label(
            header,
            text=os.path.basename(self.json_path),
            fg=COLORS["muted"],
            bg=COLORS["bg"],
            font=FONT_MONO,
        )
        self.lbl_file.pack(side="right")

        # ---- Score row ----
        score_row = tk.Frame(self, bg=COLORS["bg"])
        score_row.pack(fill="x", padx=12, pady=4)

        team_a_box = self._panel(score_row)
        team_a_box.pack(side="left", expand=True, fill="both", padx=(0, 6))
        tk.Label(
            team_a_box, text="EQUIPO A", fg=COLORS["team_a"], bg=COLORS["panel"],
            font=("Segoe UI", 11, "bold"),
        ).pack(anchor="w", padx=10, pady=(8, 0))
        self.lbl_players_a = tk.Label(
            team_a_box, text="J1 · J2", fg=COLORS["muted"],
            bg=COLORS["panel"], font=FONT_MONO,
        )
        self.lbl_players_a.pack(anchor="w", padx=10)
        self.lbl_meta_a = tk.Label(
            team_a_box, text="Sets 0  ·  Games 0", fg=COLORS["highlight"],
            bg=COLORS["panel"], font=FONT_MONO,
        )
        self.lbl_meta_a.pack(anchor="w", padx=10, pady=(4, 0))
        self.lbl_score_a = tk.Label(
            team_a_box, text="0", fg=COLORS["fg"], bg=COLORS["panel"], font=FONT_SCORE
        )
        self.lbl_score_a.pack(anchor="w", padx=10, pady=(0, 8))

        team_b_box = self._panel(score_row)
        team_b_box.pack(side="left", expand=True, fill="both", padx=(6, 0))
        tk.Label(
            team_b_box, text="EQUIPO B", fg=COLORS["team_b"], bg=COLORS["panel"],
            font=("Segoe UI", 11, "bold"),
        ).pack(anchor="w", padx=10, pady=(8, 0))
        self.lbl_players_b = tk.Label(
            team_b_box, text="J3 · J4", fg=COLORS["muted"],
            bg=COLORS["panel"], font=FONT_MONO,
        )
        self.lbl_players_b.pack(anchor="w", padx=10)
        self.lbl_meta_b = tk.Label(
            team_b_box, text="Sets 0  ·  Games 0", fg=COLORS["highlight"],
            bg=COLORS["panel"], font=FONT_MONO,
        )
        self.lbl_meta_b.pack(anchor="w", padx=10, pady=(4, 0))
        self.lbl_score_b = tk.Label(
            team_b_box, text="0", fg=COLORS["fg"], bg=COLORS["panel"], font=FONT_SCORE
        )
        self.lbl_score_b.pack(anchor="w", padx=10, pady=(0, 8))

        # ---- Info row: saca / sets cerrados / punto de oro / tiebreak ----
        info_row = self._panel(self)
        info_row.pack(fill="x", padx=12, pady=(0, 4))
        self.lbl_match_status = tk.Label(
            info_row, text="", fg=COLORS["fg"], bg=COLORS["panel"],
            font=FONT_MONO, anchor="w", justify="left",
        )
        self.lbl_match_status.pack(fill="x", padx=10, pady=6)

        # ---- Estado actual ----
        state_box = self._panel(self)
        state_box.pack(fill="x", padx=12, pady=4)

        self.lbl_state_title = tk.Label(
            state_box, text="ESPERANDO: JUGADOR", fg=COLORS["accent"],
            bg=COLORS["panel"], font=FONT_STATE,
        )
        self.lbl_state_title.pack(anchor="w", padx=12, pady=(10, 2))
        self.lbl_state_hint = tk.Label(
            state_box, text="", fg=COLORS["muted"],
            bg=COLORS["panel"], font=FONT_MONO,
        )
        self.lbl_state_hint.pack(anchor="w", padx=12)

        meta_row = tk.Frame(state_box, bg=COLORS["panel"])
        meta_row.pack(fill="x", padx=12, pady=(8, 4))
        self.lbl_point_meta = tk.Label(
            meta_row, text="Punto #1 · Golpe #1", fg=COLORS["highlight"],
            bg=COLORS["panel"], font=FONT_MONO,
        )
        self.lbl_point_meta.pack(side="left")

        self.lbl_building = tk.Label(
            state_box, text="", fg=COLORS["fg"], bg=COLORS["panel"], font=FONT_MONO_BIG,
        )
        self.lbl_building.pack(anchor="w", padx=12, pady=(2, 10))

        # Entry para etiqueta de "otro" — oculta hasta que se pulse X
        self.otro_var = tk.StringVar()
        self.otro_entry = tk.Entry(
            state_box, textvariable=self.otro_var, bg=COLORS["panel_alt"],
            fg=COLORS["fg"], insertbackground=COLORS["fg"],
            font=FONT_MONO, relief="flat",
        )
        # solo se hace pack cuando se necesita

        # ---- Cuerpo: dos columnas ----
        body = tk.Frame(self, bg=COLORS["bg"])
        body.pack(fill="both", expand=True, padx=12, pady=4)

        # Rally en curso
        rally_box = self._panel(body)
        rally_box.pack(side="left", fill="both", expand=True, padx=(0, 6))
        tk.Label(
            rally_box, text="RALLY ACTUAL", fg=COLORS["accent"],
            bg=COLORS["panel"], font=("Segoe UI", 10, "bold"),
        ).pack(anchor="w", padx=10, pady=(8, 4))
        self.tree_rally = ttk.Treeview(
            rally_box, columns=("g", "j", "tipo", "dir", "res"),
            show="headings", height=10,
        )
        for col, text, w in [
            ("g", "#", 36),
            ("j", "Jugador", 90),
            ("tipo", "Tipo", 110),
            ("dir", "Dirección", 90),
            ("res", "Resultado", 90),
        ]:
            self.tree_rally.heading(col, text=text)
            self.tree_rally.column(col, width=w, anchor="w")
        self.tree_rally.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        # Feed últimos golpes
        feed_box = self._panel(body)
        feed_box.pack(side="left", fill="both", expand=True, padx=(6, 0))
        tk.Label(
            feed_box, text="ÚLTIMOS GOLPES", fg=COLORS["accent"],
            bg=COLORS["panel"], font=("Segoe UI", 10, "bold"),
        ).pack(anchor="w", padx=10, pady=(8, 4))
        self.tree_feed = ttk.Treeview(
            feed_box, columns=("p", "g", "j", "tipo", "dir", "res", "win"),
            show="headings", height=10,
        )
        for col, text, w in [
            ("p", "Pto", 40),
            ("g", "#", 36),
            ("j", "Jug", 50),
            ("tipo", "Tipo", 100),
            ("dir", "Dir", 80),
            ("res", "Resultado", 90),
            ("win", "Pto p/", 60),
        ]:
            self.tree_feed.heading(col, text=text)
            self.tree_feed.column(col, width=w, anchor="w")
        self.tree_feed.pack(fill="both", expand=True, padx=8, pady=(0, 8))

        # ---- Status bar ----
        status = self._panel(self)
        status.pack(fill="x", padx=12, pady=(4, 4))
        self.lbl_status = tk.Label(
            status, text="Listo. Pulsá 1/2/3/4 para empezar.",
            fg=COLORS["fg"], bg=COLORS["panel"], font=FONT_MONO, anchor="w",
        )
        self.lbl_status.pack(fill="x", padx=10, pady=6)

        # ---- Help ----
        help_text = (
            "Atajos: Backspace retroceder un paso · Ctrl+Z deshacer último golpe · "
            "Esc cancelar golpe en curso · F2 editar jugadores · "
            "Ctrl+S guardar · Ctrl+Q salir y exportar CSV"
        )
        tk.Label(
            self, text=help_text, fg=COLORS["muted"], bg=COLORS["bg"],
            font=("Segoe UI", 9),
        ).pack(fill="x", padx=12, pady=(0, 8))

    def _panel(self, parent):
        return tk.Frame(
            parent, bg=COLORS["panel"], highlightthickness=1,
            highlightbackground=COLORS["border"],
        )

    # ------------------------------------------------------------------
    # Bindings
    # ------------------------------------------------------------------
    def _bind_keys(self):
        self.bind("<Key>", self._on_key)
        self.bind("<Control-z>", self._on_undo)
        self.bind("<Control-Z>", self._on_undo)
        self.bind("<Escape>", self._on_escape)
        self.bind("<BackSpace>", self._on_back_step)
        self.bind("<F2>", lambda e: self._edit_players())
        self.bind("<Control-s>", lambda e: self._save_and_flash())
        self.bind("<Control-q>", lambda e: self._quit_and_export())
        self.protocol("WM_DELETE_WINDOW", self._quit_and_export)

        # Enter en el entry de "otro" confirma la etiqueta
        self.otro_entry.bind("<Return>", self._on_otro_confirm)
        self.otro_entry.bind("<Escape>", self._on_otro_cancel)

    # ------------------------------------------------------------------
    # Manejo de teclas
    # ------------------------------------------------------------------
    def _on_key(self, event):
        # ignorar si el foco está en el entry de "otro"
        if self.focus_get() is self.otro_entry:
            return
        # ignorar combinaciones con Ctrl
        if event.state & 0x0004:
            return
        # Match terminado: bloquear input. Ctrl+Z, Ctrl+Q y Esc tienen sus
        # propios bindings y siguen funcionando.
        if self.match_score.match_finished:
            self._flash("Match finalizado — Ctrl+Z para deshacer · Ctrl+Q para cerrar", "info")
            return
        char = (event.char or "").lower()
        if not char:
            return
        # Atajo: en el paso de resultado, ESPACIO = En juego (es lo más
        # frecuente en un rally, ahorra estirar los dedos hacia la J).
        if event.keysym == "space" and self.state == S_RESULT:
            char = "j"

        if self.state == S_SERVER:
            if char in PLAYERS:
                nuevo = PLAYERS[char]
                role = self._pending_server_role()
                if role == "rival":
                    first = self.server_order[0]
                    if TEAM_OF_PLAYER[nuevo] == TEAM_OF_PLAYER[first]:
                        self._flash(
                            f"Game 2 lo saca el equipo rival a {self._player_display(first)}",
                            "error",
                        )
                        self._refresh_ui()
                        return
                # Actualizar server_order del set
                if role == "first":
                    self.server_order = [nuevo]
                elif role == "rival":
                    self.server_order = self._complete_server_order(
                        self.server_order[0], nuevo
                    )
                # role == "any": la rotación ya está fija, no toco server_order
                self._arm_server(nuevo)
                self._flash(
                    f"Saca {self._player_display(nuevo)} — pulsá dirección",
                    "ok",
                )
            else:
                self._flash(f"Tecla '{char}' inválida — esperando 1/2/3/4", "error")
        elif self.state == S_PLAYER:
            if char in PLAYERS:
                self.current["jugador"] = PLAYERS[char]
                self.state = S_SHOT
                self._flash(f"Jugador: {self.current['jugador']}", "ok")
            else:
                self._flash(f"Tecla '{char}' inválida — esperando 1/2/3/4", "error")
        elif self.state == S_SHOT:
            if char == "x":
                # caso especial: tipo "otro" con etiqueta opcional
                self.current["tipo_golpe"] = "otro"
                self.state = S_OTRO_LABEL
                self.otro_var.set("")
                self.otro_entry.pack(fill="x", padx=12, pady=(0, 8))
                self.otro_entry.focus_set()
                self._flash("Tipo: Otro — escribí etiqueta o Enter para saltar", "ok")
            elif char in SHOT_TYPES:
                self.current["tipo_golpe"] = SHOT_TYPES[char]
                self.state = self._next_state_after_shot()
                self._flash(
                    f"Tipo: {SHOT_TYPE_LABELS[self.current['tipo_golpe']]}", "ok"
                )
            else:
                self._flash(f"Tecla '{char}' inválida — esperando tipo de golpe", "error")
        elif self.state == S_SIDE:
            if char in SIDES:
                self.current.setdefault("extra", {})["lado"] = SIDES[char]
                self.state = self._next_state_after_side()
                self._flash(f"Lado: {SIDE_LABELS[SIDES[char]]}", "ok")
            else:
                self._flash(f"Tecla '{char}' inválida — esperando D/R", "error")
        elif self.state == S_WALL:
            if char in WALL_OPTIONS:
                con_pared = WALL_OPTIONS[char]
                self.current.setdefault("extra", {})["con_pared"] = con_pared
                self.state = S_DIRECTION
                self._flash(WALL_LABELS[con_pared], "ok")
            else:
                self._flash(f"Tecla '{char}' inválida — esperando S/N", "error")
        elif self.state == S_DIRECTION:
            if char in DIRECTIONS:
                self.current["direccion"] = DIRECTIONS[char]
                self.state = S_RESULT
                self._flash(
                    f"Dirección: {DIRECTION_LABELS[self.current['direccion']]}", "ok"
                )
            else:
                self._flash(f"Tecla '{char}' inválida — esperando C/P/T", "error")
        elif self.state == S_RESULT:
            is_saque = self.current.get("tipo_golpe") == "saque"
            results_dict = SAQUE_RESULTS if is_saque else RESULTS
            labels_dict = SAQUE_RESULT_LABELS if is_saque else RESULT_LABELS
            if char in results_dict:
                resultado = results_dict[char]
                self.current["resultado"] = resultado
                jugador = self.current["jugador"]
                equipo_ganador = auto_winner(jugador, resultado)
                event = self._register_shot(equipo_ganador=equipo_ganador)
                suffix = self._closure_suffix(event)
                # Mensajes contextuales
                if resultado == "falta":
                    self._flash(
                        f"Falta de {jugador} — segundo saque (mismo jugador)",
                        "ok",
                    )
                elif resultado == "doble_falta":
                    self._flash(
                        f"Doble falta de {jugador} → punto Equipo {equipo_ganador}{suffix}",
                        "ok",
                    )
                elif resultado == "en_juego":
                    self._flash(
                        "Saque entró — siguiente golpe del rally" if is_saque
                        else "En juego — siguiente golpe del rally",
                        "ok",
                    )
                else:
                    self._flash(
                        f"{labels_dict[resultado]} de {jugador} → "
                        f"punto Equipo {equipo_ganador}{suffix}",
                        "ok",
                    )
            else:
                expected = "W/F/D/J" if is_saque else "W/E/J"
                self._flash(
                    f"Tecla '{char}' inválida — esperando {expected}", "error"
                )

        self._refresh_ui()

    def _build_status_text(self) -> str:
        """Línea informativa: saca / sets cerrados / punto de oro / tiebreak / match."""
        ms = self.match_score
        parts = []
        if ms.match_finished:
            winner = ms.match_winner()
            sets = ", ".join(s.display() for s in ms.completed_sets)
            return f"MATCH FINALIZADO — Equipo {winner} ({sets})"
        if self.server:
            parts.append(f"Saca: {self._player_display(self.server)}")
        elif self.state == S_SERVER:
            parts.append("Esperando elegir saque")
        if ms.completed_sets:
            sets_str = " · ".join(
                f"Set {i+1}: {s.display()}" for i, s in enumerate(ms.completed_sets)
            )
            parts.append(sets_str)
        if ms.in_tiebreak:
            parts.append("TIEBREAK")
        elif ms.is_golden_point():
            parts.append("PUNTO DE ORO")
        return "  ·  ".join(parts) if parts else "—"

    def _closure_suffix(self, event) -> str:
        """Sufijo para el mensaje de flash cuando un punto cierra game/set/match."""
        if not event:
            return ""
        if event.match_closed:
            winner = self.match_score.match_winner()
            sets = " · ".join(s.display() for s in self.match_score.completed_sets)
            return f"  ·  ¡MATCH! Equipo {winner} ({sets})"
        if event.set_closed:
            last = self.match_score.completed_sets[-1]
            sa, sb = self.match_score.sets_won()
            return f"  ·  Set cerrado {last.display()}  ·  Sets {sa}-{sb}"
        if event.game_closed:
            return (
                f"  ·  Game cerrado · Games "
                f"{self.match_score.games_a}-{self.match_score.games_b}"
            )
        if event.started_tiebreak:
            return "  ·  TIEBREAK"
        return ""

    def _next_state_after_shot(self):
        """Después de fijar tipo_golpe, decide el próximo paso.

        Orden: tipo → (lado) → (con_pared) → dirección. Cada paso
        intermedio solo aparece si el tipo está en su set correspondiente.
        """
        tipo = self.current.get("tipo_golpe")
        if tipo in SHOT_TYPES_WITH_SIDE:
            return S_SIDE
        if tipo in SHOT_TYPES_WITH_WALL:
            return S_WALL
        return S_DIRECTION

    def _next_state_after_side(self):
        """Tras fijar lado, pedir con_pared si aplica; si no, ir a dirección."""
        if self.current.get("tipo_golpe") in SHOT_TYPES_WITH_WALL:
            return S_WALL
        return S_DIRECTION

    def _on_otro_confirm(self, event):
        label = self.otro_var.get().strip()
        if label:
            self.current.setdefault("extra", {})["etiqueta"] = label
        self.otro_entry.pack_forget()
        self.focus_set()
        self.state = self._next_state_after_shot()
        if label:
            self._flash(f"Otro: '{label}'", "ok")
        else:
            self._flash("Otro (sin etiqueta)", "ok")
        self._refresh_ui()
        return "break"

    def _on_otro_cancel(self, event):
        self.otro_entry.pack_forget()
        self.focus_set()
        self.state = self._next_state_after_shot()
        self._flash("Otro (sin etiqueta)", "ok")
        self._refresh_ui()
        return "break"

    def _on_escape(self, event):
        if self.focus_get() is self.otro_entry:
            return
        if self.state == S_PLAYER and not self.current:
            return
        self.current = {}
        self.state = S_PLAYER
        self.otro_entry.pack_forget()
        self._flash("Golpe en curso cancelado", "ok")
        self._refresh_ui()

    def _on_back_step(self, event):
        """Retrocede UN paso dentro del armado del golpe en curso.

        Para deshacer un golpe ya registrado, ver _on_undo (Ctrl+Z).
        """
        # En el entry de "otro" Backspace borra caracteres — no interceptar.
        if self.state == S_OTRO_LABEL or self.focus_get() is self.otro_entry:
            return None
        if self.match_score.match_finished:
            return "break"

        s = self.state
        current = self.current
        extra = current.get("extra", {})
        tipo = current.get("tipo_golpe")

        if s in (S_PLAYER, S_SERVER):
            # Si hay un saque pre-armado (rotación auto o falta), descartarlo
            # y volver a preguntar/auto-asignar.
            if current.get("jugador"):
                self.current = {}
                self.server = None
                self.state = S_SERVER
                self._flash("Saque descartado — elegí sacador", "ok")
                self._refresh_ui()
                return "break"
            self._flash("Nada para retroceder", "info")
            return "break"

        if s == S_SHOT:
            current.pop("jugador", None)
            self.state = S_PLAYER
            self._flash("Retrocedido a jugador", "ok")
        elif s == S_SIDE:
            current.pop("tipo_golpe", None)
            self.state = S_SHOT
            self._flash("Retrocedido a tipo de golpe", "ok")
        elif s == S_WALL:
            if tipo in SHOT_TYPES_WITH_SIDE:
                extra.pop("lado", None)
                self.state = S_SIDE
                self._flash("Retrocedido a lado", "ok")
            else:
                current.pop("tipo_golpe", None)
                self.state = S_SHOT
                self._flash("Retrocedido a tipo de golpe", "ok")
        elif s == S_DIRECTION:
            if tipo == "saque":
                # El saque va directo de S_SERVER a S_DIRECTION — descartar.
                self.current = {}
                self.server = None
                self.state = S_SERVER
                self._flash("Saque descartado — elegí sacador", "ok")
            elif tipo in SHOT_TYPES_WITH_WALL:
                extra.pop("con_pared", None)
                self.state = S_WALL
                self._flash("Retrocedido a con/sin pared", "ok")
            elif tipo in SHOT_TYPES_WITH_SIDE:
                extra.pop("lado", None)
                self.state = S_SIDE
                self._flash("Retrocedido a lado", "ok")
            else:
                current.pop("tipo_golpe", None)
                self.state = S_SHOT
                self._flash("Retrocedido a tipo de golpe", "ok")
        elif s == S_RESULT:
            current.pop("direccion", None)
            self.state = S_DIRECTION
            self._flash("Retrocedido a dirección", "ok")

        self._refresh_ui()
        return "break"

    def _on_undo(self, event):
        if not self.match.shots:
            self._flash("Nada para deshacer", "error")
            return "break"
        last = self.match.shots.pop()
        self._recompute_counters()
        self.otro_entry.pack_forget()
        # Reposicionar estado/current según último golpe restante
        self._set_initial_state()
        self._save()
        msg = (
            f"Deshecho: P{last.punto_id} G{last.golpe_id} "
            f"{last.jugador} {last.tipo_golpe}"
        )
        self._flash(msg, "ok")
        self._refresh_ui()
        return "break"

    # ------------------------------------------------------------------
    # Lógica de partido
    # ------------------------------------------------------------------
    def _register_shot(self, equipo_ganador):
        # Enriquecer 'extra' con campos derivados antes de persistir.
        extra = dict(self.current.get("extra", {}))
        tipo = self.current["tipo_golpe"]
        resultado = self.current["resultado"]
        if tipo == "saque":
            extra["saque_numero"] = self._compute_saque_numero()
            # Solo para el primer saque del punto: snapshot del marcador al inicio.
            # Permite análisis post-hoc tipo "puntos de oro ganados/perdidos",
            # "% de puntos que arranqué con set perdido", etc.
            if extra["saque_numero"] == 1:
                extra.update(self._snapshot_match_state())
        elif self._is_resto():
            extra["es_resto"] = True

        shot = Shot(
            punto_id=self.point_id,
            golpe_id=self.golpe_id,
            jugador=self.current["jugador"],
            tipo_golpe=tipo,
            direccion=self.current["direccion"],
            resultado=resultado,
            equipo_ganador_punto=equipo_ganador,
            timestamp=now_iso(),
            extra=extra,
        )
        self.match.shots.append(shot)

        # Score de tenis: solo procesa puntos cerrados.
        event = None
        if equipo_ganador is not None:
            event = self.match_score.add_point(equipo_ganador)

        # Avanzar contadores de punto/golpe
        if equipo_ganador is None:
            self.golpe_id += 1
        else:
            self.point_id += 1
            self.golpe_id = 1

        # Decidir próximo estado
        if self.match_score.match_finished:
            # match terminado: freeze (Ctrl+Z y Ctrl+Q siguen funcionando)
            self.current = {}
            self.state = S_PLAYER
            self.server = None
        elif resultado == "falta":
            # segundo saque del MISMO jugador
            self.current = {"jugador": shot.jugador, "tipo_golpe": "saque"}
            self.state = S_DIRECTION
        elif event and event.set_closed:
            # nuevo set: reset de rotación, preguntar manual.
            self.server_order = []
            self.current = {}
            self.state = S_SERVER
            self.server = None
        elif event and event.game_closed:
            # game cerró (puede incluir entrada a TB). Intentar auto-asignar.
            auto = self._compute_auto_server()
            if auto is not None:
                self._arm_server(auto)
            else:
                self.current = {}
                self.state = S_SERVER
                self.server = None
        elif equipo_ganador is not None:
            # Punto cerró pero game NO. En TB el sacador rota cada 2 puntos,
            # así que recalculamos. Fuera de TB se mantiene el mismo server.
            if self.match_score.in_tiebreak:
                auto = self._compute_auto_server()
                if auto is not None:
                    self._arm_server(auto)
                else:
                    self.current = {}
                    self.state = S_SERVER
                    self.server = None
            elif self.server:
                self.current = {"jugador": self.server, "tipo_golpe": "saque"}
                self.state = S_DIRECTION
            else:
                self.current = {}
                self.state = S_SERVER
        else:
            # rally continúa (en_juego)
            self.current = {}
            self.state = S_PLAYER

        self._save()
        return event

    def _snapshot_match_state(self) -> dict:
        """Snapshot del marcador AL INICIO del punto, para análisis posterior.

        Se adjunta como extras del primer saque del punto. Los campos:
            pt_start_pts_a/b   — score del game (0/15/30/40, o cuenta del TB)
            pt_start_games_a/b — games del set actual
            pt_start_sets_a/b  — sets ganados
            pt_golden          — true si era punto de oro al iniciar
            pt_tiebreak        — true si el punto se jugó dentro de un TB
        """
        ms = self.match_score
        if ms.in_tiebreak:
            pts_a, pts_b = ms.tb_a, ms.tb_b
        else:
            pts_a, pts_b = ms.points_a, ms.points_b
        sa, sb = ms.sets_won()
        return {
            "pt_start_pts_a": pts_a,
            "pt_start_pts_b": pts_b,
            "pt_start_games_a": ms.games_a,
            "pt_start_games_b": ms.games_b,
            "pt_start_sets_a": sa,
            "pt_start_sets_b": sb,
            "pt_golden": ms.is_golden_point(),
            "pt_tiebreak": ms.in_tiebreak,
        }

    def _compute_saque_numero(self) -> int:
        """1 = primer saque del punto. 2 = segundo saque (el anterior fue falta)."""
        for s in reversed(self.match.shots):
            if s.punto_id != self.point_id:
                break
            if s.tipo_golpe == "saque" and s.resultado == "falta":
                return 2
        return 1

    def _is_resto(self) -> bool:
        """¿Este golpe es el resto del punto? Sí, si el último golpe del
        punto en curso fue un saque que entró (en_juego)."""
        for s in reversed(self.match.shots):
            if s.punto_id != self.point_id:
                return False
            return s.tipo_golpe == "saque" and s.resultado == "en_juego"
        return False

    def _recompute_counters(self):
        """Reconstruye match_score, point_id, golpe_id y server_order desde shots."""
        self.match_score = MatchScore.from_shots(self.match.shots)
        self.server_order = self._reconstruct_server_order_from_shots()
        if not self.match.shots:
            self.point_id = 1
            self.golpe_id = 1
            return
        last = self.match.shots[-1]
        if last.equipo_ganador_punto is not None:
            self.point_id = last.punto_id + 1
            self.golpe_id = 1
        else:
            self.point_id = last.punto_id
            self.golpe_id = last.golpe_id + 1

    # ------------------------------------------------------------------
    # Rotación de saque
    # ------------------------------------------------------------------
    def _other_of_team(self, player: str) -> str:
        team = TEAM_OF_PLAYER.get(player)
        for code, t in TEAM_OF_PLAYER.items():
            if t == team and code != player:
                return code
        return player

    def _complete_server_order(self, first: str, second: str) -> list[str]:
        """Dado el sacador de los games 1 y 2 del set, devuelve la lista de
        4 jugadores en orden de rotación: el segundo par son los compañeros
        de cancha del primero y del segundo respectivamente."""
        return [first, second, self._other_of_team(first), self._other_of_team(second)]

    def _reconstruct_server_order_from_shots(self) -> list[str]:
        """Re-deduce el orden de saque del set EN CURSO recorriendo shots.

        Toma los primeros dos sacadores distintos (uno por equipo) del set
        actual y completa con los compañeros. Si el set acaba de cerrar,
        devuelve []."""
        ms = MatchScore()
        current_set_servers: list[str] = []
        seen_first_saque_of_game = False
        for s in self.match.shots:
            if (
                s.tipo_golpe == "saque"
                and s.golpe_id == 1
                and not seen_first_saque_of_game
            ):
                if len(current_set_servers) < 2 and s.jugador not in current_set_servers:
                    current_set_servers.append(s.jugador)
                seen_first_saque_of_game = True
            if s.equipo_ganador_punto is not None:
                event = ms.add_point(s.equipo_ganador_punto)
                if event.game_closed:
                    seen_first_saque_of_game = False
                if event.set_closed:
                    current_set_servers = []
        if len(current_set_servers) == 2:
            return self._complete_server_order(
                current_set_servers[0], current_set_servers[1]
            )
        return current_set_servers

    def _compute_auto_server(self) -> Optional[str]:
        """Devuelve el sacador del próximo punto si la rotación lo permite,
        o None si todavía no hay info suficiente y hay que preguntar manual.

        - Set normal: requiere server_order lleno (4 elementos). El sacador
          del game N (0-indexed = total games del set actual) es
          server_order[N % 4].
        - Tiebreak: el primer punto lo saca server_order[0]; después cada
          jugador saca 2 puntos consecutivos siguiendo server_order.
        """
        if len(self.server_order) < 4:
            return None
        ms = self.match_score
        if ms.in_tiebreak:
            tb_index = ms.tb_a + ms.tb_b
            if tb_index == 0:
                return self.server_order[0]
            return self.server_order[((tb_index + 1) // 2) % 4]
        n_games = ms.games_a + ms.games_b
        return self.server_order[n_games % 4]

    def _arm_server(self, jugador: str):
        """Pre-arma el flujo para que jugador saque el próximo punto."""
        self.server = jugador
        self.current = {"jugador": jugador, "tipo_golpe": "saque"}
        self.state = S_DIRECTION

    def _pending_server_role(self) -> str:
        """'first' (game 1), 'rival' (game 2: debe ser equipo rival), 'any'."""
        if len(self.server_order) == 0:
            return "first"
        if len(self.server_order) == 1:
            return "rival"
        return "any"

    # ------------------------------------------------------------------
    # Refresco visual
    # ------------------------------------------------------------------
    def _refresh_ui(self):
        ms = self.match_score
        sets_a, sets_b = ms.sets_won()
        # nombres de jugadores
        p = self.match.players
        self.lbl_players_a.config(text=f"{p['J1']} · {p['J2']}")
        self.lbl_players_b.config(text=f"{p['J3']} · {p['J4']}")
        # sets / games
        self.lbl_meta_a.config(text=f"Sets {sets_a}  ·  Games {ms.games_a}")
        self.lbl_meta_b.config(text=f"Sets {sets_b}  ·  Games {ms.games_b}")
        # score actual del game (o tiebreak)
        self.lbl_score_a.config(text=ms.current_score("A"))
        self.lbl_score_b.config(text=ms.current_score("B"))
        # info bar (saca / cerrados / punto de oro / tiebreak / match)
        self.lbl_match_status.config(text=self._build_status_text())

        # estado actual
        title, hint = self._state_prompt(self.state)
        self.lbl_state_title.config(text=title)
        self.lbl_state_hint.config(text=hint)
        self.lbl_point_meta.config(
            text=f"Punto #{self.point_id} · Golpe #{self.golpe_id}"
        )
        self.lbl_building.config(text=self._building_str())

        # rally actual
        for iid in self.tree_rally.get_children():
            self.tree_rally.delete(iid)
        rally_shots = [
            s for s in self.match.shots if s.punto_id == self.point_id
            and s.equipo_ganador_punto is None
        ]
        # si el punto en curso aún no tiene shots porque el último cerró un punto,
        # el rally muestra los del punto previo solo si point_id no avanzó.
        # _recompute mantiene consistencia.
        for s in rally_shots:
            self.tree_rally.insert(
                "", "end",
                values=(
                    s.golpe_id,
                    self._player_display(s.jugador),
                    self._tipo_cell(s),
                    DIRECTION_LABELS.get(s.direccion, s.direccion),
                    RESULT_LABELS.get(s.resultado, s.resultado),
                ),
            )

        # feed (últimos 15)
        for iid in self.tree_feed.get_children():
            self.tree_feed.delete(iid)
        for s in self.match.shots[-15:][::-1]:
            self.tree_feed.insert(
                "", "end",
                values=(
                    s.punto_id,
                    s.golpe_id,
                    s.jugador,
                    self._tipo_cell(s),
                    DIRECTION_LABELS.get(s.direccion, s.direccion),
                    RESULT_LABELS.get(s.resultado, s.resultado),
                    s.equipo_ganador_punto or "",
                ),
            )

    def _player_display(self, code):
        name = self.match.players.get(code, code)
        if name == code:
            return code
        return f"{code} {name}"

    def _state_prompt(self, state):
        """Devuelve (titulo, hint) para el estado actual.

        El hint se arma dinámicamente desde los dicts de shot_types.py —
        agregar un golpe/dirección ahí actualiza la UI sin tocar este archivo.
        Para el paso de jugador usa los nombres reales del partido."""
        title = STATE_TITLES.get(state, "")
        if state == S_SERVER:
            role = self._pending_server_role()
            allowed_codes = None
            if role == "rival":
                first = self.server_order[0]
                rival_team = "B" if TEAM_OF_PLAYER[first] == "A" else "A"
                allowed_codes = {
                    code for code, t in TEAM_OF_PLAYER.items() if t == rival_team
                }
                title = f"¿QUIÉN SACA? (Game 2 — equipo rival a {self._player_display(first)})"
            parts = []
            for key, code in PLAYERS.items():
                if allowed_codes is not None and code not in allowed_codes:
                    continue
                name = self.match.players.get(code, code)
                shown = name if name and name != code else code
                parts.append(f"{key} = {shown}")
            return title, "  ·  ".join(parts)
        if state == S_PLAYER:
            parts = []
            for key, code in PLAYERS.items():
                name = self.match.players.get(code, code)
                shown = name if name and name != code else code
                parts.append(f"{key} = {shown}")
            return title, "  ·  ".join(parts)
        if state == S_SHOT:
            return title, _format_keys(SHOT_TYPES, SHOT_TYPE_LABELS)
        if state == S_SIDE:
            return title, _format_keys(SIDES, SIDE_LABELS)
        if state == S_WALL:
            return title, "C = Con pared  ·  S = Sin pared"
        if state == S_DIRECTION:
            return title, _format_keys(DIRECTIONS, DIRECTION_LABELS)
        if state == S_RESULT:
            if self.current.get("tipo_golpe") == "saque":
                base = _format_keys(SAQUE_RESULTS, SAQUE_RESULT_LABELS)
            else:
                base = _format_keys(RESULTS, RESULT_LABELS)
            return title, base + "  ·  ESPACIO = En juego"
        if state == S_OTRO_LABEL:
            return title, "Escribí una palabra y Enter — Enter solo para saltar"
        return title, ""

    def _building_str(self):
        if not self.current:
            return "—"
        parts = []
        if "jugador" in self.current:
            parts.append(self._player_display(self.current["jugador"]))
        if "tipo_golpe" in self.current:
            label = SHOT_TYPE_LABELS.get(
                self.current["tipo_golpe"], self.current["tipo_golpe"]
            )
            extra = self.current.get("extra", {})
            if extra.get("etiqueta"):
                label = f"{label} ({extra['etiqueta']})"
            parts.append(label)
        if self.current.get("extra", {}).get("lado"):
            parts.append(SIDE_LABELS[self.current["extra"]["lado"]])
        if "con_pared" in self.current.get("extra", {}):
            parts.append(WALL_LABELS[self.current["extra"]["con_pared"]])
        if "direccion" in self.current:
            parts.append(DIRECTION_LABELS[self.current["direccion"]])
        if "resultado" in self.current:
            parts.append(RESULT_LABELS[self.current["resultado"]])
        return "  +  ".join(parts) + "  +  ?"

    def _tipo_cell(self, shot):
        """Texto que va en la columna 'Tipo' de las tablas — incluye lado
        y flag de pared entre paréntesis si el golpe los tiene."""
        label = SHOT_TYPE_LABELS.get(shot.tipo_golpe, shot.tipo_golpe)
        extras = shot.extra or {}
        marks = []
        lado = extras.get("lado")
        if lado:
            marks.append("D" if lado == "drive" else "R")
        if "con_pared" in extras:
            marks.append("pared" if extras["con_pared"] else "s/pared")
        if marks:
            label = f"{label} ({', '.join(marks)})"
        return label

    def _flash(self, text, kind="info"):
        color = {
            "ok": COLORS["ok"],
            "error": COLORS["error"],
            "info": COLORS["fg"],
        }.get(kind, COLORS["fg"])
        self.lbl_status.config(text=text, fg=color)

    # ------------------------------------------------------------------
    # Persistencia
    # ------------------------------------------------------------------
    def _save(self):
        save_json(self.match, self.json_path)

    def _save_and_flash(self):
        self._save()
        self._flash(f"Guardado en {os.path.basename(self.json_path)}", "ok")

    def _quit_and_export(self):
        # Pregunta si querés renombrar antes de cerrar. Cancelar el diálogo
        # mantiene la app abierta; aceptar (con o sin nombre custom) guarda
        # JSON, exporta CSV y cierra.
        current_base = os.path.splitext(os.path.basename(self.json_path))[0]
        dlg = EndMatchDialog(self, current_base)
        self.wait_window(dlg)
        if dlg.result is None:
            # canceló — sigue jugando
            return

        new_base = dlg.result.strip()
        if new_base and new_base != current_base:
            try:
                self._rename_session(new_base)
            except FileExistsError as e:
                messagebox.showerror(
                    "No se pudo renombrar",
                    f"{e}\n\nElegí otro nombre o dejá el por defecto.",
                    parent=self,
                )
                return  # vuelve al partido — el usuario reintenta
        try:
            self._save()
            export_csv(self.match, self.csv_path)
        finally:
            self.destroy()

    def _rename_session(self, new_base):
        """Renombra el JSON (y borra .tmp residual si existiera) para que
        los autosaves siguientes vayan al nuevo nombre. Las rutas absolutas
        se actualizan in-place."""
        new_json = os.path.join(self.sessions_dir, new_base + ".json")
        new_csv = os.path.join(self.sessions_dir, new_base + ".csv")
        # si existe el JSON viejo, moverlo al nuevo nombre
        if os.path.exists(self.json_path) and self.json_path != new_json:
            if os.path.exists(new_json):
                # no pisar archivos existentes
                raise FileExistsError(f"Ya existe {new_json}")
            os.replace(self.json_path, new_json)
        self.json_path = new_json
        self.csv_path = new_csv
        try:
            self.lbl_file.config(text=os.path.basename(self.json_path))
        except (AttributeError, tk.TclError):
            pass

    # ------------------------------------------------------------------
    # Setup de jugadores
    # ------------------------------------------------------------------
    def _edit_players(self):
        dlg = PlayerNamesDialog(self, self.match.players)
        self.wait_window(dlg)
        if dlg.result:
            self.match.players.update(dlg.result)
            self._save()
            self._refresh_ui()
            self._flash("Nombres actualizados", "ok")


class PlayerNamesDialog(tk.Toplevel):
    def __init__(self, parent, players):
        super().__init__(parent)
        self.title("Editar jugadores")
        self.configure(bg=COLORS["panel"])
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()
        self.result = None

        self.entries = {}
        for i, code in enumerate(("J1", "J2", "J3", "J4")):
            tk.Label(
                self, text=f"{code}:", fg=COLORS["fg"], bg=COLORS["panel"],
                font=FONT_MONO,
            ).grid(row=i, column=0, sticky="e", padx=(16, 6), pady=4)
            var = tk.StringVar(value=players.get(code, code))
            entry = tk.Entry(
                self, textvariable=var, bg=COLORS["panel_alt"], fg=COLORS["fg"],
                insertbackground=COLORS["fg"], font=FONT_MONO, relief="flat", width=24,
            )
            entry.grid(row=i, column=1, padx=(0, 16), pady=4)
            self.entries[code] = var

        btns = tk.Frame(self, bg=COLORS["panel"])
        btns.grid(row=4, column=0, columnspan=2, pady=(8, 12))
        tk.Button(
            btns, text="Cancelar", command=self.destroy,
            bg=COLORS["panel_alt"], fg=COLORS["fg"], relief="flat", padx=12,
        ).pack(side="left", padx=4)
        tk.Button(
            btns, text="Guardar", command=self._ok,
            bg=COLORS["accent"], fg=COLORS["bg"], relief="flat", padx=12,
        ).pack(side="left", padx=4)

        self.bind("<Return>", lambda e: self._ok())
        self.bind("<Escape>", lambda e: self.destroy())
        for child in self.grid_slaves():
            if isinstance(child, tk.Entry):
                child.focus_set()
                break

    def _ok(self):
        self.result = {code: var.get().strip() or code for code, var in self.entries.items()}
        self.destroy()


class StartupDialog(tk.Tk):
    """Diálogo inicial: nuevo partido (con nombres) o continuar uno existente.

    Es un tk.Tk (no Toplevel) para evitar problemas de visibilidad cuando
    el padre está withdrawn — patrón frágil en Windows."""

    def __init__(self, sessions_dir):
        super().__init__()
        self.title("Padel Tracker")
        self.configure(bg=COLORS["panel"])
        self.resizable(False, False)
        self.sessions_dir = sessions_dir
        self.result = None  # None = cerrar app

        tk.Label(
            self, text="PÁDEL TRACKER", fg=COLORS["accent"],
            bg=COLORS["panel"], font=FONT_TITLE,
        ).pack(padx=24, pady=(20, 4))
        tk.Label(
            self, text="Nuevo partido o continuar uno existente",
            fg=COLORS["muted"], bg=COLORS["panel"], font=FONT_MONO,
        ).pack(padx=24, pady=(0, 12))

        # ---- Sección nuevo partido ----
        new_box = tk.Frame(self, bg=COLORS["panel"])
        new_box.pack(padx=24, pady=4, fill="x")
        tk.Label(
            new_box, text="NUEVO PARTIDO — nombres de jugadores",
            fg=COLORS["accent"], bg=COLORS["panel"],
            font=("Segoe UI", 10, "bold"),
        ).grid(row=0, column=0, columnspan=2, sticky="w", pady=(0, 6))

        self.entries = {}
        teams_hint = {"J1": "Equipo A", "J2": "Equipo A", "J3": "Equipo B", "J4": "Equipo B"}
        for i, code in enumerate(("J1", "J2", "J3", "J4")):
            tk.Label(
                new_box, text=f"{code} ({teams_hint[code]}):",
                fg=COLORS["fg"], bg=COLORS["panel"], font=FONT_MONO,
            ).grid(row=i + 1, column=0, sticky="e", padx=(0, 8), pady=3)
            var = tk.StringVar(value="")
            entry = tk.Entry(
                new_box, textvariable=var, bg=COLORS["panel_alt"], fg=COLORS["fg"],
                insertbackground=COLORS["fg"], font=FONT_MONO, relief="flat", width=28,
            )
            entry.grid(row=i + 1, column=1, sticky="w", pady=3)
            self.entries[code] = var

        tk.Button(
            new_box, text="Empezar nuevo partido", command=self._start_new,
            bg=COLORS["accent"], fg=COLORS["bg"], relief="flat",
            font=("Segoe UI", 10, "bold"), padx=16, pady=4,
        ).grid(row=5, column=0, columnspan=2, pady=(10, 0), sticky="we")

        # ---- Separador ----
        tk.Frame(self, bg=COLORS["border"], height=1).pack(
            fill="x", padx=24, pady=14
        )

        # ---- Sección continuar ----
        cont_box = tk.Frame(self, bg=COLORS["panel"])
        cont_box.pack(padx=24, pady=(0, 16), fill="x")
        tk.Label(
            cont_box, text="CONTINUAR PARTIDO",
            fg=COLORS["accent"], bg=COLORS["panel"],
            font=("Segoe UI", 10, "bold"),
        ).pack(anchor="w", pady=(0, 6))
        tk.Label(
            cont_box,
            text="Carga un .json previo y sigue desde el último golpe registrado",
            fg=COLORS["muted"], bg=COLORS["panel"], font=("Segoe UI", 9),
        ).pack(anchor="w", pady=(0, 6))
        tk.Button(
            cont_box, text="Abrir .json...", command=self._continue_match,
            bg=COLORS["panel_alt"], fg=COLORS["fg"], relief="flat",
            font=FONT_MONO, padx=16, pady=4,
        ).pack(fill="x")

        # ---- Cancelar ----
        tk.Button(
            self, text="Cancelar", command=self._cancel,
            bg=COLORS["panel"], fg=COLORS["muted"], relief="flat",
            font=("Segoe UI", 9),
        ).pack(pady=(0, 12))

        self.bind("<Return>", lambda e: self._start_new())
        self.bind("<Escape>", lambda e: self._cancel())
        self.protocol("WM_DELETE_WINDOW", self._cancel)
        # focus al primer entry de jugadores
        for child in new_box.grid_slaves():
            if isinstance(child, tk.Entry):
                child.focus_set()
                break

        self.update_idletasks()
        self._center_on_screen()
        # Forzar visibilidad — Windows a veces abre ventanas detrás de otras
        self.lift()
        self.attributes("-topmost", True)
        self.after(250, lambda: self.attributes("-topmost", False))
        self.focus_force()

    def _center_on_screen(self):
        try:
            w = self.winfo_reqwidth()
            h = self.winfo_reqheight()
            sw = self.winfo_screenwidth()
            sh = self.winfo_screenheight()
            x = max(0, (sw - w) // 2)
            y = max(0, (sh - h) // 2)
            self.geometry(f"+{x}+{y}")
        except tk.TclError:
            pass

    def _start_new(self):
        players = {
            code: (var.get().strip() or code)
            for code, var in self.entries.items()
        }
        self.result = {"action": "new", "players": players}
        self.destroy()

    def _continue_match(self):
        path = filedialog.askopenfilename(
            parent=self,
            title="Continuar partido",
            initialdir=self.sessions_dir,
            filetypes=[("Partidos JSON", "*.json"), ("Todos", "*.*")],
        )
        if not path:
            return
        # validación rápida del archivo
        try:
            m = load_match(path)
        except Exception as e:
            messagebox.showerror(
                "No se pudo abrir el archivo",
                f"{path}\n\n{e}",
                parent=self,
            )
            return
        self.result = {"action": "continue", "path": path}
        self.destroy()

    def _cancel(self):
        self.result = None
        self.destroy()


class EndMatchDialog(tk.Toplevel):
    """Diálogo de cierre: permite poner un nombre custom al archivo."""

    def __init__(self, parent, current_base):
        super().__init__(parent)
        self.title("Finalizar partido")
        self.configure(bg=COLORS["panel"])
        self.resizable(False, False)
        self.transient(parent)
        self.grab_set()
        self.result = None  # None = cancelar (sigue jugando) | str = nombre final

        tk.Label(
            self, text="Finalizar y exportar", fg=COLORS["accent"],
            bg=COLORS["panel"], font=("Segoe UI", 12, "bold"),
        ).pack(padx=20, pady=(16, 4))
        tk.Label(
            self,
            text="Dejá el nombre actual o poné uno custom (sin extensión).\n"
                 "Se guardarán <nombre>.json y <nombre>.csv en sessions/.",
            fg=COLORS["muted"], bg=COLORS["panel"], font=("Segoe UI", 9),
            justify="left",
        ).pack(padx=20, pady=(0, 8), anchor="w")

        self.var = tk.StringVar(value=current_base)
        entry = tk.Entry(
            self, textvariable=self.var, bg=COLORS["panel_alt"], fg=COLORS["fg"],
            insertbackground=COLORS["fg"], font=FONT_MONO, relief="flat", width=44,
        )
        entry.pack(padx=20, pady=(0, 12), fill="x")
        entry.select_range(0, "end")
        entry.focus_set()

        btns = tk.Frame(self, bg=COLORS["panel"])
        btns.pack(pady=(0, 16))
        tk.Button(
            btns, text="Seguir jugando", command=self._cancel,
            bg=COLORS["panel_alt"], fg=COLORS["fg"], relief="flat", padx=14, pady=4,
        ).pack(side="left", padx=4)
        tk.Button(
            btns, text="Finalizar y exportar", command=self._ok,
            bg=COLORS["accent"], fg=COLORS["bg"], relief="flat",
            font=("Segoe UI", 10, "bold"), padx=14, pady=4,
        ).pack(side="left", padx=4)

        self.bind("<Return>", lambda e: self._ok())
        self.bind("<Escape>", lambda e: self._cancel())
        self.protocol("WM_DELETE_WINDOW", self._cancel)

        self.update_idletasks()
        try:
            px = parent.winfo_rootx()
            py = parent.winfo_rooty()
            pw = parent.winfo_width()
            ph = parent.winfo_height()
            w = self.winfo_width()
            h = self.winfo_height()
            self.geometry(f"+{px + (pw - w) // 2}+{py + (ph - h) // 2}")
        except tk.TclError:
            pass

    def _ok(self):
        clean = sanitize_basename(self.var.get())
        self.result = clean  # "" significa "dejar el nombre actual"
        self.destroy()

    def _cancel(self):
        self.result = None
        self.destroy()


def main():
    sessions_dir = os.path.join(app_base_dir(), "sessions")
    os.makedirs(sessions_dir, exist_ok=True)

    # 1) StartupDialog es su propio tk.Tk (root principal).
    dlg = StartupDialog(sessions_dir)
    dlg.mainloop()
    config = dlg.result

    if config is None:
        return

    # 2) PadelTracker arranca como nuevo tk.Tk una vez elegida la config.
    app = PadelTracker(startup=config)
    # Forzar al frente también la ventana principal
    app.lift()
    app.attributes("-topmost", True)
    app.after(250, lambda: app.attributes("-topmost", False))
    app.focus_force()
    app.mainloop()


if __name__ == "__main__":
    main()
