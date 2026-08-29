import { useEffect, useRef, useState } from "react";
import { getSessions, type SessionInfo } from "@/lib/hermesApi";

// Cockpit-original 3D viewer: a rotating CSS3D graph of your real Hermes
// sessions. Hermes's own dashboard ships NO 3D viewer, so this is "more than
// Hermes" — built on live session data, zero extra dependencies.
const SOURCE_COLORS: Record<string, string> = {
  tui: "#BE3718",
  terminal: "#BE3718",
  telegram: "#2d8cf0",
  whatsapp: "#25d366",
  discord: "#7289da",
  web: "#9b59b6",
  cron: "#f1c40f",
  scheduled: "#f1c40f",
  desktop: "#1abc9c",
  gateway: "#e67e22",
  api: "#95a5a6",
};

function fibonacciSphere(n: number): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(1, n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;
    pts.push([Math.cos(theta) * r, y, Math.sin(theta) * r]);
  }
  return pts;
}

export function ThreeDViewer() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [error, setError] = useState<string>("");
  const sceneRef = useRef<HTMLDivElement>(null);
  const rotRef = useRef({ x: -12, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    getSessions(200, 0, "recent")
      .then((d) => setSessions(d.sessions ?? []))
      .catch((e) => setError(e?.message ?? String(e)));
  }, []);

  useEffect(() => {
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      rotRef.current.y += dt * 12; // deg/sec
      const s = sceneRef.current;
      if (s) {
        const { x, y } = rotRef.current;
        s.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [sessions]);

  const pts = fibonacciSphere(Math.max(1, sessions.length));
  const maxMsgs = Math.max(1, ...sessions.map((s) => s.message_count ?? 0));

  return (
    <div className="page">
      <header className="page-head">
        <h1>3D Session Graph</h1>
        <p className="page-sub">
          Cockpit-original view of your real Hermes sessions — rotating in 3D,
          sized by message count, colored by source. (Hermes's own dashboard
          has no 3D viewer.)
        </p>
      </header>

      {error && <div className="page-state err">{error.includes("401") ? "Sign in to view." : error}</div>}

      <div className="viewer-stage">
        <div className="viewer-world" ref={sceneRef}>
          {sessions.map((s, i) => {
            const [x, y, z] = pts[i] ?? [0, 0, 0];
            const size = 8 + ((s.message_count ?? 0) / maxMsgs) * 26;
            const color = SOURCE_COLORS[s.source] ?? "#ccc";
            return (
              <div
                key={s.id}
                className="viewer-node"
                title={`${s.title ?? s.id}\n${s.source} · ${s.message_count ?? 0} msgs`}
                style={{
                  transform: `translate3d(${x * 220}px, ${y * 220}px, ${z * 220}px)`,
                  width: size,
                  height: size,
                  background: color,
                  boxShadow: `0 0 ${size / 2}px ${color}`,
                }}
              >
                <span className="viewer-label">{(s.title ?? s.id).slice(0, 14)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="viewer-legend">
        {Object.entries(SOURCE_COLORS).map(([src, c]) => (
          <span key={src} className="legend-item">
            <i style={{ background: c }} /> {src}
          </span>
        ))}
      </div>
    </div>
  );
}
