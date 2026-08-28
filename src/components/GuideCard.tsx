import { type ReactNode } from "react";

// Accessible, themeable card used across the Control Center.
// Every card explains WHAT it is + WHY, so it's understood by all skill levels.
export function GuideCard({
  icon,
  title,
  what,
  why,
  live,
  children,
  onOpenChat,
  chatHint,
}: {
  icon: string;
  title: string;
  what: string; // plain-language, one line
  why: string; // why you'd use it
  live?: boolean; // true = shows real backend data; false = guided only
  children?: ReactNode; // live data / detail
  onOpenChat?: () => void;
  chatHint?: string; // what clicking "Open in chat" does
}) {
  return (
    <section className="guide-card" aria-label={title}>
      <header className="guide-card-head">
        <span className="guide-icon" aria-hidden>
          {icon}
        </span>
        <div>
          <h3>{title}</h3>
          <span className={`guide-badge ${live ? "live" : "guided"}`}>
            {live ? "Live" : "Guided"}
          </span>
        </div>
      </header>
      <p className="guide-what">{what}</p>
      <p className="guide-why">{why}</p>
      {children && <div className="guide-body">{children}</div>}
      {onOpenChat && (
        <button className="btn-primary guide-chat" onClick={onOpenChat} title={chatHint}>
          Open in chat
        </button>
      )}
    </section>
  );
}
