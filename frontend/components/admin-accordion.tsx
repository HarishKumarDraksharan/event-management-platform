"use client";

import { ReactNode, useId, useState } from "react";

export function AdminAccordion({
  title,
  eyebrow,
  status,
  children,
  className = "admin-managed-card",
}: {
  title: string;
  eyebrow?: string;
  status?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `admin-panel-${useId().replaceAll(":", "")}`;

  return <article className={`${className} admin-accordion`}>
    <header className="admin-accordion-header">
      <div className="admin-accordion-heading">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2><button className="admin-accordion-trigger" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((open) => !open)}>
          <span className="admin-accordion-title">{title}</span>
          {status ? <span className="admin-accordion-status">{status}</span> : null}
          <span className={`admin-accordion-chevron${expanded ? " is-expanded" : ""}`} aria-hidden="true">⌄</span>
        </button></h2>
      </div>
    </header>
    <div className="admin-accordion-content" id={panelId} hidden={!expanded}>{children}</div>
  </article>;
}
