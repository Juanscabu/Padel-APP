"""
Modelo de datos del partido.

`Shot` es la unidad mínima persistida. El campo `extra` permite agregar
nuevos atributos sin romper compatibilidad con archivos existentes.
"""

from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Optional


SCHEMA_VERSION = 1


@dataclass
class Shot:
    punto_id: int
    golpe_id: int
    jugador: str
    tipo_golpe: str
    direccion: str
    resultado: str
    equipo_ganador_punto: Optional[str]
    timestamp: str
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        extras = d.pop("extra", {}) or {}
        d.update(extras)
        return d


@dataclass
class Match:
    started_at: str
    players: dict
    shots: list = field(default_factory=list)
    schema_version: int = SCHEMA_VERSION

    def to_dict(self) -> dict:
        return {
            "schema_version": self.schema_version,
            "started_at": self.started_at,
            "players": self.players,
            "shots": [s.to_dict() for s in self.shots],
        }


def now_iso() -> str:
    return datetime.now().astimezone().isoformat(timespec="seconds")
