# Pádel Tracker

Herramienta de escritorio para registrar golpe a golpe un partido de pádel
mientras se mira el video en otro monitor. Todo el flujo es por teclado:
sin mouse, sin perder el ritmo del peloteo.

## Stack

- **Python 3.10+** + **Tkinter** (incluido en la instalación estándar de
  Python). Cero dependencias externas, multiplataforma
  (Windows / macOS / Linux), arranque inmediato y manejo de teclas nativo.

## Instalación y ejecución

1. Verificá que tengas Python 3.10 o superior:
   ```
   python --version
   ```
   En Windows, si `python` no está en el PATH probá `py --version`.
   Si no lo tenés, instalalo desde https://www.python.org/downloads/
   (en macOS/Linux es habitual que ya esté).

2. Tkinter viene con Python en Windows/macOS. En algunas distros Linux
   se instala aparte, p. ej. `sudo apt install python3-tk`.

3. Cloná o copiá los archivos a una carpeta y desde allí ejecutá:
   ```
   python padel_tracker.py
   ```
   (en Windows: `py padel_tracker.py`)

No hay `pip install` ni entornos virtuales: todo es stdlib.

## Distribuir a otra PC (sin instalar Python ahí)

`dist\PadelTracker.exe` es un ejecutable standalone (~11MB) generado con
PyInstaller. Lo copiás a la otra máquina, doble-click y la app arranca
sin instalar nada. La primera vez que se ejecuta crea la carpeta
`sessions/` al lado del `.exe` (ahí van los `partido_*.json` y `.csv`).

Para reconstruir el `.exe` después de cambios al código: doble-click
`build.bat` (la primera vez requiere instalar PyInstaller con
`python -m pip install --user pyinstaller`).

Para **desarrollo** (correr desde fuente sin compilar) seguí leyendo.

## Arranque

Al abrir la app aparece un diálogo con dos opciones:

- **Nuevo partido** — escribís los nombres de los 4 jugadores
  (cualquiera puede quedar vacío y queda como "J1"/"J2"/etc) y arrancás.
  Los nombres se persisten en el JSON del partido.
- **Continuar partido...** — abre un selector de archivos en
  `sessions/`; al elegir un `.json` previo, la app reconstruye el score,
  el contador de puntos y golpes, y sigue grabando autosaves al mismo
  archivo.

## Finalizar y nombrar el archivo

Cuando querés terminar (`Ctrl+Q` o cerrando la ventana) aparece un
diálogo "Finalizar partido" con un campo de nombre:

- Si lo dejás como está, se exporta `partido_YYYYMMDD_HHMMSS.csv` y
  el `.json` mantiene su nombre original.
- Si escribís otro nombre (p. ej. `final_circuito_amigos`), se renombra
  el `.json` y se exporta `final_circuito_amigos.csv`.
- Si elegís "Seguir jugando", el diálogo se cierra y la app sigue
  registrando golpes — los autosaves no se interrumpieron en ningún
  momento.

## Cómo se registra un golpe

El flujo es una máquina de estados. La UI siempre indica qué se espera:

| Paso | Tecla | Significado                                                 |
|------|-------|-------------------------------------------------------------|
| 1    | 1/2/3/4 | Jugador (J1, J2 = Equipo A · J3, J4 = Equipo B)          |
| 2    | D R V B S G Q C | Drive · Revés · Volea · Bandeja · Smash · Globo · Saque · Chiquita |
| 2    | X     | Otro (abre un campo opcional de etiqueta — Enter para saltar) |
| 3*   | D R   | Lado del golpe: Drive · Revés (solo para tipos con lado)    |
| 4*   | S N   | ¿Con pared? Sí · No (solo para Drive, Revés, Globo)         |
| 5    | C P M D R J | Cruzado · Paralelo · Medio · Cuerpo Drive · Cuerpo Revés · Reja |
| 6    | W E J | Winner · Error · En juego (sigue el peloteo)                |

Los pasos marcados con `*` solo aparecen para ciertos tipos de golpe.
Drive y Revés definen el lado implícitamente, así que para ellos el
flujo es: tipo → pared → dirección → resultado. Globo pide lado y pared:
tipo → lado → pared → dirección → resultado.

El equipo que gana el punto se infiere automáticamente del resultado:

- **Winner** del jugador → el punto es para SU equipo.
- **Error** del jugador → el punto es para el equipo RIVAL.
- **En juego** → el peloteo sigue; no se cierra el punto.

Esto saca un keystroke por punto y elimina la ambigüedad de tener que
acordarse manualmente quién ganó.

## Atajos

| Tecla       | Acción                                                  |
|-------------|---------------------------------------------------------|
| `Ctrl+Z`    | Deshace el último golpe registrado (si hay un golpe en curso, primero lo descarta) |
| `Esc`       | Cancela el golpe en curso (vuelve a esperar jugador)    |
| `F2`        | Editar nombres de los jugadores                         |
| `Ctrl+S`    | Guardar manualmente (de todos modos hay autosave)       |
| `Ctrl+Q` / cerrar ventana | Guarda JSON, exporta CSV y cierra         |

## Salida de datos

Cada partido genera dos archivos en la subcarpeta `sessions/`:

- `partido_YYYYMMDD_HHMMSS.json` — estado completo, escrito tras cada
  golpe (autosave atómico vía `os.replace`).
- `partido_YYYYMMDD_HHMMSS.csv` — exportado al cerrar.

Estructura de cada golpe:

```json
{
  "punto_id": 3,
  "golpe_id": 5,
  "jugador": "J2",
  "tipo_golpe": "smash",
  "direccion": "medio",
  "resultado": "winner",
  "equipo_ganador_punto": "A",
  "timestamp": "2026-05-08T15:42:11-03:00"
}
```

Los nombres de jugadores y la versión de schema se guardan en el JSON
del partido (no en cada golpe). Un consumidor downstream (la futura app
de stats) puede tomar `match.shots` directamente.

## Layout en pantalla

- Marcador grande arriba con puntos por equipo.
- Panel central con el paso esperado, contador de Punto/Golpe y el
  golpe que se está armando en este momento.
- Tabla del rally en curso (a la izquierda) y feed de los últimos
  15 golpes (a la derecha).
- Barra de estado abajo con feedback de cada tecla (verde si fue
  válida, rojo si no).
- Tema oscuro por defecto.

## Archivo de ejemplo

`examples/partido_ejemplo.json` contiene un partido corto simulado
(6 puntos) con todos los tipos de golpe y un caso de tipo "otro" con
etiqueta — útil para probar el formato y como semilla de la app de
estadísticas.

## Extender la app

Ver [EXTENSION.md](EXTENSION.md) para agregar tipos de golpe nuevos o
campos extra en el modelo de datos.
