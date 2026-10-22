/**
 * useSpeechInput — Web Speech API wrapper
 *
 * Gibt { isListening, isSupported, startListening, stopListening } zurück.
 * onResult(text) wird mit dem transkribierten Text aufgerufen.
 *
 * Browser-Support:
 *   Chrome (Desktop + Android): ✅
 *   Safari iOS 14.5+: ✅ (webkit prefix)
 *   Firefox: ❌ (kein SpeechRecognition)
 *
 * ADHS-Designprinzip:
 *   – Keine Permission-Anfrage ohne klaren User-Intent (erst beim Klick)
 *   – Visuelles Feedback während Aufnahme (isListening)
 *   – Fehler werden lautlos ignoriert (kein Alert, nur stop)
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export function useSpeechInput({ onResult, lang = 'de-DE' }) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  // Einmalig prüfen ob Web Speech API verfügbar ist
  const SpeechRecognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;

  const isSupported = Boolean(SpeechRecognition);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    if (!SpeechRecognition || isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.continuous = false;        // stoppt nach einer Pause
    recognition.interimResults = false;    // nur finale Ergebnisse
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join(' ')
        .trim();
      if (transcript) onResult(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setIsListening(false);
      recognitionRef.current = null;
    }
  }, [SpeechRecognition, isListening, lang, onResult]);

  // Cleanup bei Unmount
  useEffect(() => () => stopListening(), [stopListening]);

  return { isListening, isSupported, startListening, stopListening };
}
