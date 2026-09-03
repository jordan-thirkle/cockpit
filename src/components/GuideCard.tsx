import { type ReactNode } from "react";
import { useNavigate } from "react-router";

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
  pageLink, // direct link to a page (preferred over "Open in chat")
}: {
  icon: string;
  title: string;
  what: string; // plain-language, one line
  why: string; // why you'd use it
  live?: boolean; // true = shows real backend data; false = guided only
  children?: ReactNode; // live data / detail
  onOpenChat?: () => void;
  chatHint?: string; // what clicking "Open in chat" does
  pageLink?: string; // direct navigation target (e.g., "/skills", "/mcp")
}) {
  const navigate = useNavigate();

  const handleAction = () => {
    if (pageLink) {
      navigate(pageLink);
    } else if (onOpenChat) {
      onOpenChat();
    }
  };

  const buttonLabel = pageLink ? "Open page" : "Open in chat";

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
      {(onOpenChat || pageLink) && (
        <button className="btn-primary guide-chat" onClick={handleAction} title={chatHint || pageLink}>
          {buttonLabel}
        </button>
      )}
    </section>
  );
}
