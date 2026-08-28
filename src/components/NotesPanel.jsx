import { useState } from 'react';
import { loadNote, saveNote } from '../utils/notesStorage.js';

// Dezente, rein opt-in Notizfunktion: Stift-Icon unten rechts, Panel schiebt
// sich von unten hoch. Notizen sind pro Block in localStorage gespeichert.
export default function NotesPanel({ blockId }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(() => loadNote(blockId));

  function handleChange(e) {
    const value = e.target.value;
    setText(value);
    saveNote(blockId, value);
  }

  return (
    <>
      <button
        type="button"
        className="notes-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Notizen schließen' : 'Notizen öffnen'}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path
            d="M4 20L4.8 16.5L15.5 5.8C16 5.3 16.8 5.3 17.3 5.8L18.7 7.2C19.2 7.7 19.2 8.5 18.7 9L8 19.7L4 20Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open && (
        <div className="notes-panel">
          <div className="notes-panel-header">
            <span>Notizen</span>
            <button type="button" className="notes-close-btn" onClick={() => setOpen(false)} aria-label="Schließen">
              ×
            </button>
          </div>
          <textarea
            className="notes-textarea"
            value={text}
            onChange={handleChange}
            placeholder="Halt hier fest, was dir auffällt …"
            autoFocus
          />
        </div>
      )}
    </>
  );
}
