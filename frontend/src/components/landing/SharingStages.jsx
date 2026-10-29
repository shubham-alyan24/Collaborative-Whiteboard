import { useState } from "react";
import { Check, Copy, MousePointer2, Plus, X } from "lucide-react";

const CODE = "K7QX2M";

function StartFragment() {
  return (
    <div className="ui-panel ui-card">
      <div className="ui-row" style={{ justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Your boards</span>
        <button type="button" className="ui-btn ui-btn--primary">
          <Plus size={15} /> New board
        </button>
      </div>
      <div className="ui-thumb" style={{ marginTop: 16, display: "grid", placeItems: "center" }}>
        <svg width="180" height="84" viewBox="0 0 180 84" aria-hidden="true">
          <circle cx="40" cy="42" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="84" y="16" width="52" height="52" fill="none" stroke="#E63946" strokeWidth="3" />
          <path d="M150 68 L165 16 L178 68 Z" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
      <p style={{ marginTop: 12, fontSize: 15, fontWeight: 600 }}>Year 9 geometry</p>
      <p className="ui-small">Edited just now, saved</p>
    </div>
  );
}

function ShareFragment() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="ui-panel ui-card">
      <p style={{ fontSize: 15, fontWeight: 600 }}>Share “Year 9 geometry”</p>
      <div className="ui-code" aria-label={`Share code ${CODE.split("").join(" ")}`}>
        {CODE.split("").map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </div>
      <div className="ui-row" style={{ justifyContent: "space-between" }}>
        <span className="ui-small">Anyone with the code can watch.</span>
        <button
          type="button"
          className="ui-btn"
          onClick={() => {
            navigator.clipboard?.writeText(CODE).catch(() => {});
            setCopied(true);
          }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function AskFragment() {
  const [sent, setSent] = useState(false);
  return (
    <div className="ui-panel ui-card">
      <div className="ui-row" style={{ justifyContent: "space-between" }}>
        <span style={{ fontSize: 15, fontWeight: 600 }}>Year 9 geometry</span>
        <span className="ui-small">View only</span>
      </div>
      <p className="ui-small" style={{ marginTop: 4 }}>
        lienwand.vercel.app/join/{CODE}
      </p>
      <div className="ui-thumb" style={{ marginTop: 14, display: "grid", placeItems: "center" }}>
        <svg width="180" height="84" viewBox="0 0 180 84" aria-hidden="true">
          <circle cx="40" cy="42" r="28" fill="none" stroke="currentColor" strokeWidth="3" />
          <rect x="84" y="16" width="52" height="52" fill="none" stroke="#E63946" strokeWidth="3" />
          <path d="M150 68 L165 16 L178 68 Z" fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
      {sent ? (
        <p className="ui-small" style={{ marginTop: 14, height: 36, display: "flex", alignItems: "center" }}>
          Request sent, waiting for the owner
        </p>
      ) : (
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          style={{ width: "100%", marginTop: 14 }}
          onClick={() => setSent(true)}
        >
          Request to edit
        </button>
      )}
    </div>
  );
}

function ApproveFragment() {
  const [answer, setAnswer] = useState(null);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="ui-panel" style={{ padding: "10px 12px" }}>
        <div className="ui-row" style={{ gap: 12 }}>
          <span className="ui-avatar" style={{ background: "#2A9D8F" }}>
            PS
          </span>
          <span style={{ display: "grid", marginRight: "auto" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Priya S.</span>
            <span className="ui-small">
              {answer === "yes"
                ? "Can now edit"
                : answer === "no"
                  ? "Request declined"
                  : "wants to edit"}
            </span>
          </span>
          {!answer && (
            <>
              <button
                type="button"
                className="ui-iconbtn"
                style={{ background: "var(--ui-ink)", color: "var(--ui-bg)" }}
                aria-label="Approve"
                onClick={() => setAnswer("yes")}
              >
                <Check size={15} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                className="ui-iconbtn"
                aria-label="Deny"
                onClick={() => setAnswer("no")}
              >
                <X size={15} strokeWidth={2.5} />
              </button>
            </>
          )}
        </div>
      </div>
      <div className="ui-panel" style={{ height: 150, position: "relative", overflow: "hidden" }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 400 150"
          preserveAspectRatio="xMinYMid meet"
          aria-hidden="true"
        >
          <rect x="40" y="36" width="80" height="80" fill="none" stroke="#E63946" strokeWidth="3" />
          <path
            d="M170 110 L250 40"
            fill="none"
            stroke="#2A9D8F"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
        {answer !== "no" && (
          <span className="ui-cursor" style={{ position: "absolute", left: "62%", top: 18, color: "#2A9D8F" }}>
            <MousePointer2 size={18} fill="currentColor" />
            <span style={{ background: "#2A9D8F" }}>Priya</span>
          </span>
        )}
      </div>
    </div>
  );
}

const STAGES = [
  {
    name: "Start",
    heading: "First, start a board",
    text: "Sign in and press New board. It saves itself about a second after you stop drawing.",
    fragment: StartFragment,
  },
  {
    name: "Share",
    heading: "Then send its code",
    text: "Every board has a six-character code. Read it out in class or paste it in the group chat.",
    fragment: ShareFragment,
  },
  {
    name: "Ask",
    heading: "They ask to join",
    text: "Anyone with the code or link can open the board and watch. To draw, they sign in and send you a request.",
    fragment: AskFragment,
  },
  {
    name: "Approve",
    heading: "You let them draw",
    text: "Approve and they become an editor, with their cursor and name on the board. Decline and they keep watching.",
    fragment: ApproveFragment,
  },
];

export default function SharingStages() {
  const [stage, setStage] = useState(0);
  const current = STAGES[stage];
  const Fragment = current.fragment;
  const last = STAGES.length - 1;

  return (
    <section className="lw-share" id="sharing" aria-labelledby="lw-share-title">
      <div className="lw-share__words">
        <h2 id="lw-share-title" className="lw-head" key={`h-${stage}`} data-swap>
          {current.heading}
        </h2>
        <p className="lw-lead" key={`p-${stage}`} data-swap>
          {current.text}
        </p>
      </div>
      <div className="lw-share__frag">
        <div data-ui className="ui-swap" key={stage}>
          <Fragment />
        </div>
      </div>
      <div className="lw-share__control">
        <div className="lw-track">
          {/* Ends at the centre of the thumb, which travels 32px less than the track */}
          <span
            className="lw-track__fill"
            style={{ width: `calc(16px + ${stage / last} * (100% - 32px))` }}
          />
          <input
            className="lw-range"
            type="range"
            min="0"
            max={last}
            step="1"
            value={stage}
            onChange={(e) => setStage(Number(e.target.value))}
            aria-label="How sharing works, step"
            aria-valuetext={`${current.name}: ${current.heading}`}
          />
        </div>
        <ol className="lw-stages" style={{ "--last": last }}>
          {STAGES.map((s, i) => (
            <li key={s.name} style={{ "--i": i }}>
              <button
                type="button"
                aria-current={i === stage ? "step" : undefined}
                onClick={() => setStage(i)}
              >
                {s.name}
              </button>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
