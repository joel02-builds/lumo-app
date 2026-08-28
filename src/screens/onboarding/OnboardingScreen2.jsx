import { useRef, useState } from 'react';
import LumoMascot from '../../components/LumoMascot.jsx';
import Button from '../../components/Button.jsx';
import { readFileAsBase64, readFileAsText } from '../../utils/fileReader.js';

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MIN_WORDS = 100;
const MAX_CHARS = 50000;

function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0;
}

export default function OnboardingScreen2({ onNext, onBack }) {
  const [topic, setTopic] = useState('');
  const [fileName, setFileName] = useState('');
  const [materialText, setMaterialText] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileMediaType, setFileMediaType] = useState('');
  const [fileError, setFileError] = useState('');
  const [truncationNotice, setTruncationNotice] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const inputRef = useRef(null);

  function applyMaterialText(rawText) {
    if (rawText.length > MAX_CHARS) {
      setMaterialText(rawText.slice(0, MAX_CHARS));
      setTruncationNotice(true);
    } else {
      setMaterialText(rawText);
      setTruncationNotice(false);
    }
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError('');

    const isPdf = file.type === 'application/pdf';
    const isText = file.type.startsWith('text/') || /\.(txt|md)$/i.test(file.name);

    if (!isPdf && !isText) {
      setFileError('Bitte lade eine PDF- oder Textdatei hoch.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError('Die Datei ist zu groß (max. 25 MB).');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    try {
      if (isPdf) {
        const base64 = await readFileAsBase64(file);
        setFileBase64(base64);
        setFileMediaType('application/pdf');
        setMaterialText('');
        setTruncationNotice(false);
      } else {
        const text = await readFileAsText(file);
        applyMaterialText(text);
        setFileBase64('');
        setFileMediaType('');
      }
      setFileName(file.name);
    } catch {
      const message = isPdf
        ? 'Diese PDF konnte Lumo leider nicht lesen. Versuch es als Text einzufügen.'
        : 'Die Datei konnte nicht gelesen werden. Versuch es nochmal.';
      setFileError(message);
    }
  }

  function removeFile() {
    setFileName('');
    setMaterialText('');
    setFileBase64('');
    setFileMediaType('');
    setFileError('');
    setTruncationNotice(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  const hasPdf = Boolean(fileBase64 && fileMediaType === 'application/pdf');
  const trimmedMaterial = materialText.trim();
  const wordCount = countWords(materialText);
  const hasAnyMaterial = hasPdf || trimmedMaterial.length > 0;

  let materialError = null;
  if (!hasAnyMaterial) {
    materialError = 'Bitte gib erst dein Lernmaterial ein.';
  } else if (!hasPdf && wordCount < MIN_WORDS) {
    materialError = 'Das ist etwas wenig für Lumo. Füge mehr Material hinzu, damit ich dir wirklich helfen kann.';
  }

  function handleNext() {
    if (!topic.trim() || materialError) {
      setAttemptedSubmit(true);
      return;
    }
    onNext({ topic: topic.trim(), materialText, fileName, fileBase64, fileMediaType });
  }

  return (
    <div className="screen">
      <button className="back-link" onClick={onBack}>
        ← Zurück
      </button>
      <div className="screen-content">
        <LumoMascot state="idle" label="Lumo" />
        <h1>Was lernst du gerade?</h1>
        <input
          type="text"
          placeholder="z. B. Biologie – Zellbiologie"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          style={{ width: '100%' }}
          autoFocus
        />

        {!hasPdf && (
          <textarea
            rows={6}
            style={{ width: '100%' }}
            value={materialText}
            onChange={(e) => applyMaterialText(e.target.value)}
            placeholder="Füge hier dein Lernmaterial ein …"
          />
        )}
        {truncationNotice && (
          <p className="field-notice">
            Dein Material ist sehr umfangreich. Lumo nimmt die ersten 50.000 Zeichen – der Rest kommt später.
          </p>
        )}

        <div className="upload-row">
          <input
            ref={inputRef}
            id="file-upload"
            type="file"
            accept=".pdf,.txt,.md,text/plain,application/pdf"
            onChange={handleFile}
            className="visually-hidden"
          />
          {!fileName ? (
            <label htmlFor="file-upload" className="upload-label">
              Oder Datei hochladen (PDF oder Text)
            </label>
          ) : (
            <div className="upload-chip">
              <span>{fileName}</span>
              <button type="button" onClick={removeFile} aria-label="Datei entfernen">
                ×
              </button>
            </div>
          )}
        </div>
        {fileError && <p className="field-error">{fileError}</p>}
        {attemptedSubmit && materialError && <p className="field-error">{materialError}</p>}

        <Button onClick={handleNext} disabled={!topic.trim()}>
          Weiter
        </Button>
      </div>
    </div>
  );
}
