import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Github, Moon, Sun } from "lucide-react";
import { Google } from "@boxicons/react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { authApi } from "@/api/auth.api";
import SnapCanvas from "@/components/landing/SnapCanvas";
import ToolCells from "@/components/landing/ToolCells";
import SharingStages from "@/components/landing/SharingStages";
import FaqIndex from "@/components/landing/FaqIndex";
import "@/components/landing/landing.css";

const REPO_URL = "https://github.com/Amarjeet0538/Collaborative-Whiteboard";
const CONTACT_EMAIL = "amarjeet0538@gmail.com";

const NEXT = [
  "Export to PNG and PDF",
  "Handwriting to text",
  "Lasso selection",
];

// Dates come from the repository's commit history
const ADDED = [
  ["Google and GitHub login", "2026-10-20", "20 Oct"],
  ["Images and thumbnails stored in the cloud", "2026-07-06", "6 Jul"],
  ["Selection tool", "2026-07-04", "4 Jul"],
  ["Better touch drawing on tablets", "2026-07-02", "2 Jul"],
  ["Shape recognition model", "2026-06-30", "30 Jun"],
  ["Side panels for every tool", "2026-06-30", "30 Jun"],
  ["Undo and redo", "2026-06-26", "26 Jun"],
  ["Account settings", "2026-05-18", "18 May"],
  ["Pan and zoom", "2026-04-28", "28 Apr"],
  ["Profile photos", "2026-04-27", "27 Apr"],
  ["Notifications for join requests", "2026-03-30", "30 Mar"],
];

// Reveal each marked element once as it enters the viewport
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    const targets = root.querySelectorAll("[data-reveal], [data-shutter]");
    if (!("IntersectionObserver" in window)) return;
    root.classList.add("lw-js");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef]);
}

function Nav({ user }) {
  const { isDark, toggleDarkMode } = useTheme();
  return (
    <header className="lw-nav">
      <Link to="/" className="lw-wordmark">
        Lienwand<span>.</span>
      </Link>
      <nav aria-label="Sections">
        <ul className="lw-nav__links">
          <li>
            <a className="lw-link" href="#shapes">
              Shapes
            </a>
          </li>
          <li>
            <a className="lw-link" href="#tools">
              Tools
            </a>
          </li>
          <li>
            <a className="lw-link" href="#sharing">
              Sharing
            </a>
          </li>
          <li>
            <a className="lw-link" href="#faq">
              FAQ
            </a>
          </li>
        </ul>
      </nav>
      <button
        type="button"
        className="lw-theme"
        onClick={toggleDarkMode}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
      <Link className="lw-btn" to={user ? "/home" : "/login"}>
        {user ? "Your boards" : "Start a board"}
      </Link>
    </header>
  );
}

function Hero({ user }) {
  return (
    <section className="lw-hero" aria-labelledby="lw-title">
      <div className="lw-hero__copy lw-grid">
        <h1 id="lw-title" className="lw-display" data-reveal>
          A whiteboard that snaps your shapes
        </h1>
        <p
          className="lw-hero__sub lw-lead"
          data-reveal
          style={{ "--d": "90ms" }}
        >
          Free and shared, for small teams and classrooms. Draw a rough
          circle, hold the pen still for a second, and it comes back clean.
        </p>
        <div className="lw-hero__action" data-reveal style={{ "--d": "180ms" }}>
          <Link className="lw-btn" to={user ? "/home" : "/login"}>
            {user ? "Your boards" : "Start a board"}
          </Link>
          <a className="lw-link" href="#sharing">
            How sharing works
          </a>
        </div>
      </div>
      <div className="lw-stage">
        <div className="lw-stage__inner">
          <SnapCanvas />
        </div>
      </div>
    </section>
  );
}

function ShapesSection() {
  return (
    <section
      className="lw-shapes lw-grid"
      id="shapes"
      aria-labelledby="lw-shapes-title"
    >
      <figure className="lw-shapes__picture">
        <div className="lw-frame" data-shutter>
          <img
            src="/landing/homer-blackboard-detail.jpg"
            alt="Chalk drawings of a circle, a square, two straight lines and a crossed rectangle on a school blackboard"
            width="700"
            height="1075"
            loading="lazy"
          />
        </div>
      </figure>
      <div className="lw-shapes__text">
        <h2 id="lw-shapes-title" className="lw-head" data-reveal>
          Four shapes it knows
        </h2>
        <p className="lw-lead" data-reveal style={{ "--d": "90ms" }}>
          Circle, square, triangle, line. The same four a teacher chalked up in
          Homer’s classroom, and the four Lienwand’s model learned from
          thousands of doodles in Google’s Quick, Draw! collection.
        </p>
        <ul className="lw-rules">
          {[
            ["Hold the pen still", "1 second"],
            ["It snaps when it is over", "60% sure"],
            ["Anything else stays", "as drawn"],
            ["Changed your mind?", "Ctrl+Z"],
          ].map(([rule, value], i) => (
            <li key={rule} data-reveal style={{ "--d": `${180 + i * 70}ms` }}>
              <span>{rule}</span>
              <b>{value}</b>
            </li>
          ))}
        </ul>
        <figure className="lw-shapes__painting" data-reveal>
          <div className="lw-frame lw-drift">
            <img
              src="/landing/homer-blackboard.jpg"
              alt="Watercolour of a young teacher in a gingham apron standing at a blackboard covered with chalk shapes"
              width="1100"
              height="1664"
              loading="lazy"
            />
          </div>
          <figcaption className="lw-caption">
            Winslow Homer, Blackboard, 1877, and a detail of its chalk shapes
            on the left. Watercolour, National Gallery of Art, Washington.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function ToolsSection() {
  return (
    <section
      className="lw-tools lw-grid"
      id="tools"
      aria-labelledby="lw-tools-title"
    >
      <h2 id="lw-tools-title" className="lw-head lw-tools__head" data-reveal>
        Everything on the toolbar
      </h2>
      <p
        className="lw-tools__intro lw-lead"
        data-reveal
        style={{ "--d": "90ms" }}
      >
        Seven tools in one bar at the bottom of the board, with undo and redo
        for every stroke. Try the panels below; they work like the real ones.
      </p>
      <ToolCells />
    </section>
  );
}

function ChangelogSection() {
  return (
    <section className="lw-log lw-grid" aria-labelledby="lw-log-title">
      <div className="lw-log__list">
        <h2 id="lw-log-title" className="lw-head" data-reveal>
          What’s new, what’s next
        </h2>
        <div className="lw-log__group">
          <h3 data-reveal>Next</h3>
          <ul>
            {NEXT.map((item, i) => (
              <li key={item} data-reveal style={{ "--d": `${i * 60}ms` }}>
                <span className="lw-dot lw-dot--next" aria-hidden="true" />
                <span>{item}</span>
                <span className="lw-log__value">Planned</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="lw-log__group">
          <h3 data-reveal>Added in 2026</h3>
          <ul>
            {ADDED.map(([item, iso, label], i) => (
              <li key={item} data-reveal style={{ "--d": `${i * 50}ms` }}>
                <span className="lw-dot" aria-hidden="true" />
                <span>{item}</span>
                <time dateTime={iso}>{label}</time>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <figure className="lw-log__picture" data-reveal>
        <div className="lw-frame">
          <img
            src="/landing/geometry-lessons.jpg"
            alt="A teacher in a suit pointing a yardstick at a chalk circle and tangent lines on a blackboard"
            width="1100"
            height="1386"
            loading="lazy"
          />
        </div>
        <figcaption className="lw-caption">
          Geometry lessons on a chalkboard, KUHT, University of Houston
          Libraries.
        </figcaption>
      </figure>
    </section>
  );
}

function StartSection({ user }) {
  return (
    <section className="lw-start lw-grid" aria-labelledby="lw-start-title">
      <div className="lw-start__words">
        <h2 id="lw-start-title" className="lw-display" data-reveal>
          Your first board
        </h2>
        <p className="lw-lead" data-reveal style={{ "--d": "90ms" }}>
          Sign in and you land on your boards. Make one, copy its code, send it
          to your group.
        </p>
      </div>
      <div className="lw-start__card" data-ui data-reveal style={{ "--d": "160ms" }}>
        {user ? (
          <div className="ui-panel">
            <h3>Welcome back, {user.name?.split(" ")[0] || "there"}</h3>
            <p className="ui-small" style={{ marginTop: 6 }}>
              Your boards are where you left them.
            </p>
            <div className="ui-stack">
              <Link className="ui-btn ui-btn--primary" to="/home">
                Open your boards
              </Link>
            </div>
          </div>
        ) : (
          <div className="ui-panel">
            <h3>Create your account</h3>
            <p className="ui-small" style={{ marginTop: 6 }}>
              Free. Takes one click with an account you already have.
            </p>
            <div className="ui-stack">
              <a className="ui-btn" href={authApi.oauthUrl("google")}>
                <Google /> Continue with Google
              </a>
              <a className="ui-btn" href={authApi.oauthUrl("github")}>
                <Github size={18} /> Continue with GitHub
              </a>
              <Link className="ui-btn ui-btn--primary" to="/login">
                Use email instead
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="lw-foot">
      <span>Lienwand, a free shared whiteboard</span>
      <nav aria-label="Footer">
        <Link className="lw-link" to="/login">
          Log in
        </Link>
        <a className="lw-link" href={REPO_URL}>
          Source on GitHub
        </a>
        <a className="lw-link" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </nav>
      <span className="lw-foot__credits">
        © 2026. Pictures: Winslow Homer, Blackboard (1877); Geometry Lessons,
        KUHT. Public domain, via Wikimedia Commons.
      </span>
    </footer>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const rootRef = useRef(null);
  useReveal(rootRef);

  return (
    <div className="lw" ref={rootRef}>
      <Nav user={user} />
      <main>
        <Hero user={user} />
        <ShapesSection />
        <ToolsSection />
        <SharingStages />
        <ChangelogSection />
        <FaqIndex />
        <StartSection user={user} />
      </main>
      <Footer />
    </div>
  );
}
