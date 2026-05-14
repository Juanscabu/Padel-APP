// Banda persistente arriba del dashboard con la composición de los dos
// equipos. Pensada para que al cambiar de sección no haya que recordar
// quién juega en cada bando.

import { Match, PlayerId } from "../parser/types";
import { PLAYER_COLORS, TEAM_COLORS } from "../utils/colors";

interface Props {
  match: Match;
}

const TEAM_A: PlayerId[] = ["J1", "J2"];
const TEAM_B: PlayerId[] = ["J3", "J4"];

export function TeamsBanner({ match }: Props) {
  return (
    <div className="teams-banner">
      <TeamColumn match={match} label="EQUIPO A" color={TEAM_COLORS.A} ids={TEAM_A} align="left" />
      <div className="teams-banner__vs">VS</div>
      <TeamColumn match={match} label="EQUIPO B" color={TEAM_COLORS.B} ids={TEAM_B} align="right" />
    </div>
  );
}

function TeamColumn({
  match,
  label,
  color,
  ids,
  align,
}: {
  match: Match;
  label: string;
  color: string;
  ids: PlayerId[];
  align: "left" | "right";
}) {
  return (
    <div className={`teams-banner__col teams-banner__col--${align}`}>
      <div className="teams-banner__label" style={{ color }}>
        {label}
      </div>
      <div className="teams-banner__players">
        {ids.map((id) => (
          <span key={id} className="teams-banner__player" style={{ color: PLAYER_COLORS[id] }}>
            <span className="teams-banner__id">{id}</span> {match.players[id].nombre}
          </span>
        ))}
      </div>
    </div>
  );
}
