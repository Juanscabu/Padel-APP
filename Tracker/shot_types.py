"""
Registro de tipos de golpe, direcciones, resultados y mapeo de teclas.

Para extender, ver EXTENSION.md. Las claves de los diccionarios son la
tecla que dispara el evento (en minúscula). Los valores son el
identificador canónico que se persiste en JSON/CSV.
"""

PLAYERS = {
    "1": "J1",
    "2": "J2",
    "3": "J3",
    "4": "J4",
}

SHOT_TYPES = {
    "d": "drive",
    "r": "reves",
    "v": "volea",
    "z": "bajada",
    "b": "bandeja",
    "s": "smash",
    "g": "globo",
    "q": "saque",
    "c": "chiquita",
    "j": "dejada",
    "m": "contra_pared",
    "3": "x3",
    "4": "x4",
    "x": "otro",
}

# "salida" se mantiene en los labels para que los partidos viejos sigan
# mostrando "Salida de Pared" como tipo. No se puede registrar uno nuevo
# porque ya no está en SHOT_TYPES — ahora se modela como flag con_pared
# sobre drive/revés/globo (ver SHOT_TYPES_WITH_WALL).
SHOT_TYPE_LABELS = {
    "drive": "Drive",
    "reves": "Revés",
    "volea": "Volea",
    "bandeja": "Bandeja/Víbora",
    "salida": "Salida de Pared",
    "bajada": "Bajada de Pared",
    "smash": "Smash",
    "globo": "Globo",
    "saque": "Saque",
    "chiquita": "Chiquita",
    "dejada": "Dejada",
    "contra_pared": "Contra Pared",
    "x3": "X3",
    "x4": "X4",
    "otro": "Otro",
}

SIDES = {
    "d": "drive",
    "r": "reves",
}

SIDE_LABELS = {
    "drive": "Drive",
    "reves": "Revés",
}

# Tipos de golpe que disparan el paso "¿lado?" (drive o revés) entre
# tipo y dirección. Cualquier tipo no incluido acá se saltea ese paso —
# útil para drive/revés (lado implícito) o saque (no aplica).
# Editá este set para personalizar tipo por tipo.
SHOT_TYPES_WITH_SIDE = {
    "volea",
    "chiquita",
    "globo",
    "bajada",
    "dejada",
    "contra_pared",
    "otro",
}

# Tipos de golpe que disparan el paso "¿con pared?" (sí/no) antes de
# la dirección. Si el tipo también pide lado, el orden es:
# tipo → lado → con_pared → dirección.
SHOT_TYPES_WITH_WALL = {
    "drive",
    "reves",
    "globo",
}

WALL_OPTIONS = {
    "s": True,
    "n": False,
}

WALL_LABELS = {
    True: "Con pared",
    False: "Sin pared",
}

DIRECTIONS = {
    "c": "cruzado",
    "p": "paralelo",
    "m": "centro",
    "d": "cuerpo drive",
    "r": "cuerpo reves",
    "j": "reja"
}

DIRECTION_LABELS = {
    "cruzado": "Cruzado",
    "paralelo": "Paralelo",
    "centro": "Centro",
    "cuerpo drive": "Cuerpo Drive",
    "cuerpo reves": "Cuerpo Reves",
    "reja": "Reja"
}

RESULTS = {
    "w": "winner",
    "e": "error",
    "j": "en_juego",
}

# Resultados específicos del saque. Se usan SOLO cuando tipo_golpe="saque".
# - winner = ace
# - falta = primera falta (no cierra el punto, viene segundo saque)
# - doble_falta = falta del segundo saque (cierra el punto a favor del rival)
# - en_juego = el saque entró y el peloteo sigue
SAQUE_RESULTS = {
    "w": "winner",
    "f": "falta",
    "d": "doble_falta",
    "j": "en_juego",
}

RESULT_LABELS = {
    "winner": "Winner",
    "error": "Error",
    "en_juego": "En juego",
    "falta": "Falta",
    "doble_falta": "Doble falta",
}

SAQUE_RESULT_LABELS = {
    "winner": "Ace",
    "falta": "Falta",
    "doble_falta": "Doble falta",
    "en_juego": "En juego",
}

TEAMS = {
    "a": "A",
    "b": "B",
}

TEAM_OF_PLAYER = {
    "J1": "A",
    "J2": "A",
    "J3": "B",
    "J4": "B",
}
