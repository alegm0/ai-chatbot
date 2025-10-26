// components/ChatWidget.jsx
"use client";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/ChatWidget.module.css";

export default function ChatWidget({ openByDefault = false }) {
  const [open, setOpen] = useState(openByDefault);
  const [showNudge, setShowNudge] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [locked, setLocked] = useState(false); // ← bloquear input si endSession
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Welcome to sunsets, How can I help you today?" },
  ]);
  const endRef = useRef(null);

  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setShowNudge(true), 800);
      return () => clearTimeout(t);
    } else {
      setShowNudge(false);
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function renderTextWithBold(text) {
    const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => {
      const chunk = /^\*\*[^*]+\*\*$/.test(p) ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>;
      // soportar saltos de línea
      return <>{String(chunk.props.children).split("\n").map((line, j) => <span key={`${i}-${j}`}>{line}<br/></span>)}</>;
    });
  }

  async function send() {
    await sendWith(input.trim());
  }

  async function sendWith(text) {
    const msg = (text || "").trim();
    if (!msg || loading || locked) return;
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await r.json();
       console.log("[/api/chat] resp:", data);

      // dentro de sendWith(), después de hacer const data = await r.json();

const rawText =
  (typeof data.reply === "string" && data.reply.trim()) ||
  (typeof data.text === "string" && data.text.trim()) ||
  "";

const botText =
  rawText ||
  "I couldn’t load that right now. Try asking again or say “Bookings” to get the reservation link.";

const nextBot = {
  role: "assistant",
  content: botText,
  suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
  cta: data?.cta?.href ? data.cta : null,
  escalate: !!data.escalate,
  endSession: !!data.endSession,
};

setMessages((m) => [...m, nextBot]);
if (nextBot.endSession) setLocked(true);


     

      if (nextBot.endSession) setLocked(true);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Demo: soon I’ll reply with AI + RAG 🌅", suggestions: [] },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      {!open && showNudge && (
        <div className={styles.nudge} role="status">
          <span>Need help?</span>
          <button className={styles.nudgeClose} onClick={() => setShowNudge(false)} aria-label="Close">×</button>
        </div>
      )}

      {!open && (
        <button className={styles.fab} onClick={() => setOpen(true)} aria-label="Open chat">
          <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
          </svg>
        </button>
      )}

      {open && (
        <div className={styles.window}>
          <div className={styles.head}>
            <span className={styles.title}>Sunsets Concierge</span>
            <button onClick={() => setOpen(false)} aria-label="Close" className={styles.closeBtn}>×</button>
          </div>

          <div className={styles.log}>
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? styles.user : styles.ai}>
                <div className={styles.msgText}>{renderTextWithBold(m.content)}</div>

                {/* CTA SevenRooms */}
                {m.cta?.href && (
              

                  <a
                    href={m.cta.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.bookButton}
                  >
                    {m.cta.label || "Book a Table"}
                  </a>
                )}

                {/* Nota de escalamiento */}
                {m.escalate && (
                  <div className={styles.escalateNote}>
                    We’ll alert the manager and follow up shortly.
                  </div>
                )}

                {/* Sugerencias (chips) */}
                {m.suggestions?.length ? (
                  <div className={styles.suggestions}>
                    {m.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={styles.suggestionChip}
                        onClick={() => sendWith(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {loading && <div className={styles.typing}>Typing…</div>}
            <div ref={endRef} />
          </div>

          <div className={styles.inputRow}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={locked ? "Session ended" : "Ask about menu, allergens, bookings…"}
              aria-label="Message"
              disabled={loading || locked}
            />
            <button onClick={send} disabled={loading || locked}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
