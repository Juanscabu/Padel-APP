# Cómo extender Pádel Tracker

La app está pensada para evolucionar sin tocar la lógica central. Hay
dos puntos de extensión principales: **tipos de golpe / direcciones /
resultados** y **campos del modelo de datos**.

## 1. Agregar un tipo de golpe nuevo

Todo el mapeo vive en [shot_types.py](shot_types.py). Para agregar
"chiquita" disparado por la tecla `Y`:

```python
# shot_types.py
SHOT_TYPES = {
    ...
    "y": "chiquita",   # tecla -> id canónico
}

SHOT_TYPE_LABELS = {
    ...
    "chiquita": "Chiquita",   # id -> texto que se muestra en pantalla
}
```

No hace falta tocar nada más. La validación de teclas en
`PadelTracker._on_key` consulta `SHOT_TYPES` directamente y la
visualización usa `SHOT_TYPE_LABELS`.

Reglas:

- La clave del dict (`"y"`) debe ser una letra **en minúscula** y
  **única** dentro del paso.
- No reutilices las teclas reservadas: `1 2 3 4` (jugadores),
  `c p m d r j` (direcciones), `w e j` (resultados), `a b` (equipos),
  `s n` (paso "con pared"), ni los atajos `q z`.
- El id canónico (`"chiquita"`) es lo que termina en JSON/CSV.
  Mantenelo en `snake_case` y estable: cambiarlo rompe consumers
  río abajo.

Direcciones (`DIRECTIONS` / `DIRECTION_LABELS`) y resultados
(`RESULTS` / `RESULT_LABELS`) se extienden igual.

### Hacer que un tipo pida lado o "con pared"

Dos sets controlan los pasos intermedios opcionales:

- `SHOT_TYPES_WITH_SIDE` — tipos que disparan el paso "¿lado?" (drive
  o revés). Pensado para golpes donde el lado no está implícito en el
  nombre: bandeja, globo, volea, etc.
- `SHOT_TYPES_WITH_WALL` — tipos que disparan el paso "¿con pared?"
  (S/N). Pensado para golpes donde la pared cambia la dificultad pero
  no el nombre del golpe: globo y chiquita. La salida de pared como
  drive/revés se registra con su propio tipo (`salida`), no con flag.

Agregar/sacar el id del set basta para cambiar el flujo — la máquina
de estados se adapta sola y persiste como `extra.lado` y
`extra.con_pared` respectivamente.

## 2. Agregar un campo nuevo al modelo

`Shot` tiene un dict `extra` que se "aplana" al serializar: cualquier
clave que pongas allí termina como columna propia en el JSON y el CSV,
junto a los campos base, sin romper compatibilidad con archivos
existentes.

### Ejemplo: zona de cancha y calidad subjetiva

a) Donde armás el golpe (en `padel_tracker.py`, dentro de
`_register_shot`), poblá `extra` con los campos nuevos:

```python
shot = Shot(
    ...
    extra={
        **self.current.get("extra", {}),
        "zona": self.current.get("zona"),
        "calidad": self.current.get("calidad"),
    },
)
```

b) Capturá esos valores como un paso más de la máquina. Definí un
estado nuevo (`S_ZONA` / `S_CALIDAD`), un mapeo de teclas en
`shot_types.py` (p. ej. `ZONAS = {"1": "fondo_der", "2": "fondo_izq", ...}`)
y un branch en `_on_key` que setee `self.current["zona"]` y avance.
Reusá el patrón de los pasos existentes — son 6 líneas por paso.

c) Exportación: `storage.export_csv` ya descubre dinámicamente los
campos extra mirando los primeros golpes. No hace falta tocarlo.

### Compatibilidad hacia atrás

- Para **leer** archivos viejos (sin el campo nuevo), tratá el campo
  como opcional desde el lado de la app de estadísticas: `shot.get("zona")`.
- Para **escribir**, no es necesario rellenar campos nuevos en golpes
  viejos; el campo simplemente queda ausente.
- `schema_version` en el JSON del partido permite detectar el formato
  desde un consumer y bifurcar la lógica si en algún momento un cambio
  rompe el formato.

## 3. Cambiar el atajo de algún paso

Las teclas son las claves de los dicts. Para mover Drive de `D` a `F`:

```python
SHOT_TYPES = {
    "f": "drive",   # antes era "d"
    ...
}
```

El id canónico (`"drive"`) sigue igual, así que los archivos
históricos siguen siendo válidos.

## 4. Cambiar el tema visual

Los colores viven en el dict `COLORS` al tope de
[padel_tracker.py](padel_tracker.py). Las fuentes están en `FONT_*`
también al tope. Cambiá ahí y reiniciá.

## 5. Convertir varios JSON en un dataset combinado

El JSON ya está en un formato directamente apto para pandas:

```python
import json, glob, pandas as pd

frames = []
for path in glob.glob("sessions/partido_*.json"):
    data = json.load(open(path, encoding="utf-8"))
    df = pd.DataFrame(data["shots"])
    df["partido"] = data["started_at"]
    frames.append(df)

dataset = pd.concat(frames, ignore_index=True)
```

Ese es el formato que la futura app de estadísticas debería consumir.
