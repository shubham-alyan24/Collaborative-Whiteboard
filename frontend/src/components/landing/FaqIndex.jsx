import { useState } from "react";

const FAQS = [
  {
    q: "Is Lienwand free?",
    a: "Yes. There is no paid plan and no trial. Sign in and start a board.",
  },
  {
    q: "Do I need an account?",
    a: "Not to watch: anyone with a board’s link can look. To create a board or draw on one, sign in with Google, GitHub or an email and password.",
  },
  {
    q: "What can a viewer do?",
    a: "Watch the board change live. Viewers can’t draw. When they ask to edit, the owner approves or declines, and approved people become editors.",
  },
  {
    q: "Which shapes does it recognise?",
    a: "Circle, square, triangle and line. Hold the pen still for a second at the end of a stroke. If the model is less than 60% sure, your stroke stays as you drew it.",
  },
  {
    q: "Does it work on a tablet?",
    a: "Yes. The board takes touch and stylus input, so you can draw with a finger or a pen on an iPad or an Android tablet.",
  },
  {
    q: "Is my work saved?",
    a: "Automatically, about a second after you stop drawing. Your home page shows a thumbnail of each board.",
  },
  {
    q: "Can I export a board?",
    a: "Not yet. Export to PNG and PDF is next on the list, with handwriting to text and lasso selection.",
  },
];

export default function FaqIndex() {
  const [open, setOpen] = useState(0);

  return (
    <section className="lw-faq lw-grid" id="faq" aria-labelledby="lw-faq-title">
      <div className="lw-faq__list">
        <h2 id="lw-faq-title" data-reveal>
          Questions
        </h2>
        <ul>
          {FAQS.map(({ q, a }, i) => (
            <li key={q} data-reveal style={{ "--d": `${i * 50}ms` }}>
              <button
                type="button"
                className="lw-faq__q"
                aria-expanded={open === i}
                aria-controls="lw-faq-answer"
                onClick={() => setOpen(i)}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
              >
                {q}
              </button>
              {open === i && <p className="lw-faq__inline">{a}</p>}
            </li>
          ))}
        </ul>
      </div>
      <div className="lw-faq__pane" id="lw-faq-answer" aria-live="polite" data-reveal>
        <p key={open}>{FAQS[open].a}</p>
      </div>
    </section>
  );
}
