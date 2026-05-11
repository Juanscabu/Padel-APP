"""
Persistencia: guardado automático en JSON tras cada golpe y exportación
a CSV al cerrar la sesión. Los archivos se nombran con el timestamp de
inicio del partido.
"""

import csv
import json
import os
import re
from datetime import datetime

from data_model import Match, Shot


BASE_FIELDS = [
    "punto_id",
    "golpe_id",
    "jugador",
    "tipo_golpe",
    "direccion",
    "resultado",
    "equipo_ganador_punto",
    "timestamp",
]


def session_filename(started_at_dt: datetime, ext: str) -> str:
    return f"partido_{started_at_dt.strftime('%Y%m%d_%H%M%S')}.{ext}"


def sanitize_basename(name: str) -> str:
    name = (name or "").strip()
    if not name:
        return ""
    # quitar extensión si la trajeron
    name = re.sub(r"\.(json|csv)$", "", name, flags=re.IGNORECASE)
    # caracteres no válidos en Windows
    name = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "_", name)
    return name.rstrip(" .") or ""


def load_match(path: str) -> Match:
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    base_set = set(BASE_FIELDS)
    shots = []
    for d in data.get("shots", []):
        extra = {k: v for k, v in d.items() if k not in base_set}
        shots.append(
            Shot(
                punto_id=d["punto_id"],
                golpe_id=d["golpe_id"],
                jugador=d["jugador"],
                tipo_golpe=d["tipo_golpe"],
                direccion=d["direccion"],
                resultado=d["resultado"],
                equipo_ganador_punto=d.get("equipo_ganador_punto"),
                timestamp=d["timestamp"],
                extra=extra,
            )
        )
    return Match(
        started_at=data["started_at"],
        players=data.get("players", {"J1": "J1", "J2": "J2", "J3": "J3", "J4": "J4"}),
        shots=shots,
        schema_version=data.get("schema_version", 1),
    )


def save_json(match: Match, path: str) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(match.to_dict(), f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def export_csv(match: Match, path: str) -> None:
    rows = [s.to_dict() for s in match.shots]
    if not rows:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write("")
        return

    extra_fields: list[str] = []
    for row in rows:
        for k in row.keys():
            if k not in BASE_FIELDS and k not in extra_fields:
                extra_fields.append(k)

    fieldnames = BASE_FIELDS + extra_fields
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow(row)
