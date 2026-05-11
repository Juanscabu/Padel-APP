// Wrapper común de sección: título + descripción + slot para el body.
// Incluye anchor para scroll y animación de fade-in al montar.

import { ReactNode } from "react";

interface Props {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function Section({ id, title, subtitle, children }: Props) {
  return (
    <section className="section" id={id}>
      <header className="section__header">
        <h2 className="section__title">{title}</h2>
        {subtitle && <p className="section__subtitle">{subtitle}</p>}
      </header>
      <div className="section__body">{children}</div>
    </section>
  );
}
