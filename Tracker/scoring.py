"""
Lógica de marcador padel-style: best-of-3 sets, punto de oro en games,
tiebreak a 6-6.

El estado entero es derivable de la lista de puntos cerrados (golpes con
equipo_ganador_punto != None). `MatchScore.from_shots(shots)` reconstruye
desde cero — útil para "Continuar partido" y para Ctrl+Z.
"""

from dataclasses import dataclass, field
from typing import Optional


_NEXT_REGULAR_SCORE = {0: 15, 15: 30, 30: 40}


@dataclass
class CompletedSet:
    games_a: int
    games_b: int
    tiebreak: Optional[tuple] = None  # (tb_a, tb_b) cuando se cerró por TB

    def winner(self) -> str:
        return "A" if self.games_a > self.games_b else "B"

    def display(self) -> str:
        base = f"{self.games_a}-{self.games_b}"
        if self.tiebreak:
            return f"{base} ({self.tiebreak[0]}-{self.tiebreak[1]})"
        return base


@dataclass
class PointEvent:
    """Devuelto por add_point() para que la UI sepa qué transición hacer."""
    point_winner: str
    game_closed: bool = False
    set_closed: bool = False
    match_closed: bool = False
    started_tiebreak: bool = False


@dataclass
class MatchScore:
    completed_sets: list = field(default_factory=list)  # list[CompletedSet]
    games_a: int = 0
    games_b: int = 0
    points_a: int = 0  # 0 / 15 / 30 / 40
    points_b: int = 0
    tb_a: int = 0  # solo si in_tiebreak
    tb_b: int = 0
    in_tiebreak: bool = False
    match_finished: bool = False

    # ------------------------------------------------------------------
    # Construcción
    # ------------------------------------------------------------------
    @classmethod
    def from_shots(cls, shots) -> "MatchScore":
        ms = cls()
        for s in shots:
            if s.equipo_ganador_punto:
                ms.add_point(s.equipo_ganador_punto)
        return ms

    # ------------------------------------------------------------------
    # Procesamiento de un punto
    # ------------------------------------------------------------------
    def add_point(self, team: str) -> PointEvent:
        if self.match_finished:
            return PointEvent(point_winner=team)

        evt = PointEvent(point_winner=team)
        games_before = (self.games_a, self.games_b)
        sets_before = len(self.completed_sets)
        was_tiebreak = self.in_tiebreak

        if self.in_tiebreak:
            self._add_tb_point(team)
        else:
            self._add_regular_point(team)

        evt.set_closed = len(self.completed_sets) > sets_before
        evt.game_closed = (
            (self.games_a, self.games_b) != games_before
            or evt.set_closed
        )
        evt.started_tiebreak = (not was_tiebreak) and self.in_tiebreak
        evt.match_closed = self.match_finished
        return evt

    # ----- internals -----

    def _add_regular_point(self, team):
        # Punto de oro: a 40-40, el siguiente cierra el game.
        if self.points_a == 40 and self.points_b == 40:
            self._close_game(team)
            return
        # Si team está en 40, gana el game.
        if (team == "A" and self.points_a == 40) or (
            team == "B" and self.points_b == 40
        ):
            self._close_game(team)
            return
        # Sino, avanzar score
        if team == "A":
            self.points_a = _NEXT_REGULAR_SCORE[self.points_a]
        else:
            self.points_b = _NEXT_REGULAR_SCORE[self.points_b]

    def _add_tb_point(self, team):
        if team == "A":
            self.tb_a += 1
        else:
            self.tb_b += 1
        # Tiebreak: primero a 7 con 2 de diferencia
        if self.tb_a >= 7 and self.tb_a - self.tb_b >= 2:
            self._close_tiebreak("A")
        elif self.tb_b >= 7 and self.tb_b - self.tb_a >= 2:
            self._close_tiebreak("B")

    def _close_game(self, winner):
        if winner == "A":
            self.games_a += 1
        else:
            self.games_b += 1
        self.points_a = 0
        self.points_b = 0
        self._check_set_close()

    def _close_tiebreak(self, winner):
        # Quien ganó el tiebreak gana el game número 7 del set.
        if winner == "A":
            self.games_a += 1
        else:
            self.games_b += 1
        self.completed_sets.append(
            CompletedSet(self.games_a, self.games_b, tiebreak=(self.tb_a, self.tb_b))
        )
        self.tb_a = 0
        self.tb_b = 0
        self.in_tiebreak = False
        self.points_a = 0
        self.points_b = 0
        self.games_a = 0
        self.games_b = 0
        self._check_match_close()

    def _check_set_close(self):
        a, b = self.games_a, self.games_b
        if a == 6 and b == 6:
            self.in_tiebreak = True
            return
        if (a >= 6 and a - b >= 2) or (b >= 6 and b - a >= 2):
            self.completed_sets.append(CompletedSet(a, b))
            self.games_a = 0
            self.games_b = 0
            self._check_match_close()

    def _check_match_close(self):
        sa, sb = self.sets_won()
        if sa >= 2 or sb >= 2:
            self.match_finished = True

    # ------------------------------------------------------------------
    # Display helpers
    # ------------------------------------------------------------------
    def sets_won(self):
        a = sum(1 for s in self.completed_sets if s.games_a > s.games_b)
        b = sum(1 for s in self.completed_sets if s.games_b > s.games_a)
        return a, b

    def is_golden_point(self) -> bool:
        return (
            (not self.in_tiebreak)
            and self.points_a == 40
            and self.points_b == 40
        )

    def current_score(self, team: str) -> str:
        if self.in_tiebreak:
            return str(self.tb_a if team == "A" else self.tb_b)
        return str(self.points_a if team == "A" else self.points_b)

    def match_winner(self) -> Optional[str]:
        if not self.match_finished:
            return None
        sa, sb = self.sets_won()
        return "A" if sa > sb else "B"
