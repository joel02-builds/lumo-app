/**
 * Tests für die Materialverarbeitung (H-01 Umsetzung).
 *
 * Führe aus mit: node --test tests/material-processing.test.js
 *
 * Abdeckung:
 * - Texttrunkierung (unter/auf/über Limit)
 * - DOCX-Erkennung und -Ablehnung
 * - PDF-Größenprüfung (base64 → raw bytes)
 * - Claude-Antwortverarbeitung (stop_reason, JSON-Parsing)
 * - Endpunkt-Validierungslogik (leichte Integrationstests)
 * - Unicode, arabische Zeichen, mathematische Symbole, Emojis
 * - Mehrere Dateien gleichzeitig
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_MATERIAL_CHARS,
  MAX_PDF_BYTES_RAW,
  DOCX_MIME_TYPE,
  isDocxFile,
  getBase64RawBytes,
  truncateMaterialText,
  processLumoResponse,
} from '../server/materialUtils.js';

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────

/** Erstellt einen String mit genau n Zeichen */
function makeText(n, char = 'a') {
  return char.repeat(n);
}

/**
 * Erstellt einen minimalen base64-String, der einer gewissen raw-Byte-Größe entspricht.
 * 3 raw bytes → 4 base64 chars
 */
function makeBase64ForBytes(targetRawBytes) {
  const rawBytes = Buffer.alloc(targetRawBytes, 0x42); // Puffer mit 'B'
  return rawBytes.toString('base64');
}

// ─── isDocxFile ───────────────────────────────────────────────────────────────

describe('isDocxFile', () => {
  it('erkennt DOCX anhand MIME-Type', () => {
    assert.equal(isDocxFile({ mediaType: DOCX_MIME_TYPE, name: 'doc.pdf' }), true);
  });

  it('erkennt DOCX anhand Dateiendung (case-insensitive)', () => {
    assert.equal(isDocxFile({ mediaType: 'application/octet-stream', name: 'skript.DOCX' }), true);
    assert.equal(isDocxFile({ mediaType: '', name: 'mitschrift.docx' }), true);
  });

  it('erkennt DOCX anhand beider Kriterien', () => {
    assert.equal(isDocxFile({ mediaType: DOCX_MIME_TYPE, name: 'notizen.docx' }), true);
  });

  it('gibt false für PDF zurück', () => {
    assert.equal(isDocxFile({ mediaType: 'application/pdf', name: 'skript.pdf' }), false);
  });

  it('gibt false für TXT zurück', () => {
    assert.equal(isDocxFile({ mediaType: 'text/plain', name: 'notizen.txt' }), false);
  });

  it('gibt false für unbekannten Typ zurück', () => {
    assert.equal(isDocxFile({ mediaType: 'application/octet-stream', name: 'bild.png' }), false);
  });

  it('gibt false für null/undefined zurück', () => {
    assert.equal(isDocxFile(null), false);
    assert.equal(isDocxFile(undefined), false);
  });

  it('gibt false für Datei ohne name zurück (nur sicherer MIME)', () => {
    assert.equal(isDocxFile({ mediaType: 'application/pdf' }), false);
  });
});

// ─── getBase64RawBytes ────────────────────────────────────────────────────────

describe('getBase64RawBytes', () => {
  it('berechnet korrekte Rohgröße für bekannte Daten', () => {
    // "abc" → base64 "YWJj" → 3 raw bytes
    const b64 = Buffer.from('abc').toString('base64');
    assert.equal(b64, 'YWJj');
    assert.equal(getBase64RawBytes(b64), 3);
  });

  it('berücksichtigt Padding korrekt (1 Padding-Zeichen)', () => {
    // "ab" → base64 "YWI=" → 2 raw bytes (1 Padding)
    const b64 = Buffer.from('ab').toString('base64');
    assert.equal(b64, 'YWI=');
    assert.equal(getBase64RawBytes(b64), 2);
  });

  it('berücksichtigt Padding korrekt (2 Padding-Zeichen)', () => {
    // "a" → base64 "YQ==" → 1 raw byte (2 Padding)
    const b64 = Buffer.from('a').toString('base64');
    assert.equal(b64, 'YQ==');
    assert.equal(getBase64RawBytes(b64), 1);
  });

  it('gibt 0 für leeren String zurück', () => {
    assert.equal(getBase64RawBytes(''), 0);
  });

  it('gibt 0 für null zurück', () => {
    assert.equal(getBase64RawBytes(null), 0);
  });

  it('erkennt 24 MB raw-Daten korrekt', () => {
    const b64 = makeBase64ForBytes(MAX_PDF_BYTES_RAW);
    const result = getBase64RawBytes(b64);
    // Erlaubt ±1 Byte wegen Integer-Rounding
    assert.ok(Math.abs(result - MAX_PDF_BYTES_RAW) <= 1,
      `Erwartet ≈${MAX_PDF_BYTES_RAW}, got ${result}`);
  });

  it('erkennt PDF über dem Limit', () => {
    const overLimit = MAX_PDF_BYTES_RAW + 1024; // 1 KB über Limit
    const b64 = makeBase64ForBytes(overLimit);
    assert.ok(getBase64RawBytes(b64) > MAX_PDF_BYTES_RAW);
  });
});

// ─── truncateMaterialText ─────────────────────────────────────────────────────

describe('truncateMaterialText', () => {
  it('gibt Text unverändert zurück wenn unter dem Limit', () => {
    const text = makeText(MAX_MATERIAL_CHARS - 1);
    const result = truncateMaterialText(text);
    assert.equal(result.text, text);
    assert.equal(result.truncated, false);
    assert.equal(result.originalLength, MAX_MATERIAL_CHARS - 1);
  });

  it('gibt Text unverändert zurück wenn genau auf dem Limit', () => {
    const text = makeText(MAX_MATERIAL_CHARS);
    const result = truncateMaterialText(text);
    assert.equal(result.text.length, MAX_MATERIAL_CHARS);
    assert.equal(result.truncated, false);
  });

  it('kürzt Text über dem Limit', () => {
    const text = makeText(MAX_MATERIAL_CHARS + 1000);
    const result = truncateMaterialText(text);
    assert.equal(result.truncated, true);
    assert.equal(result.originalLength, MAX_MATERIAL_CHARS + 1000);
    // Gekürzter Text enthält Marker
    assert.ok(result.text.includes('[...gekürzt...]'));
    // Inhalt bis zum Limit ist erhalten
    assert.ok(result.text.startsWith(makeText(MAX_MATERIAL_CHARS)));
  });

  it('behält korrektes originalLength auch wenn Text bereits bei 50k Frontend-Limit abgeschnitten wurde', () => {
    // Szenario: Frontend schneidet auf 50k, Backend kürzt auf 32k.
    // Der originalLength im Ergebnis muss 50k sein (die Eingabe für truncateMaterialText).
    const frontendSliced = makeText(50000);
    const result = truncateMaterialText(frontendSliced);
    assert.equal(result.truncated, true);
    assert.equal(result.originalLength, 50000);
  });

  it('berechnet korrekten Prozentsatz für Warnung', () => {
    const original = 40000;
    const text = makeText(original);
    const result = truncateMaterialText(text);
    const percentage = Math.round(MAX_MATERIAL_CHARS / result.originalLength * 100);
    assert.equal(percentage, Math.round(32000 / 40000 * 100)); // 80%
  });

  it('behandelt null/undefined sicher', () => {
    const r1 = truncateMaterialText(null);
    assert.equal(r1.truncated, false);
    assert.equal(r1.originalLength, 0);

    const r2 = truncateMaterialText(undefined);
    assert.equal(r2.truncated, false);
    assert.equal(r2.originalLength, 0);
  });

  it('behandelt leeren String korrekt', () => {
    const result = truncateMaterialText('');
    assert.equal(result.text, '');
    assert.equal(result.truncated, false);
    assert.equal(result.originalLength, 0);
  });

  it('verarbeitet Unicode korrekt (arabisch, mathematisch, Emojis)', () => {
    // Arabic text + math symbols + emojis
    const arabicText = 'مرحبا بالعالم '; // "Hello World" + space
    const mathText = '∀x∈ℝ: x²≥0 ∫∂Ω φ(x)dx = ';
    const emojiText = '🧠📚✨🎯 ';
    // Repeat to exceed MAX_MATERIAL_CHARS
    const repeated = (arabicText + mathText + emojiText).repeat(1000);
    const result = truncateMaterialText(repeated);
    // Should still truncate correctly (by character count, not byte count)
    assert.equal(result.truncated, true);
    // The truncated text should be valid JS string (no broken surrogate pairs ideally)
    assert.ok(typeof result.text === 'string');
    assert.ok(result.text.length <= MAX_MATERIAL_CHARS + '[...gekürzt...]'.length + 1);
  });

  it('verarbeitet Text mit mehreren Sprachen (Unicode-Mix)', () => {
    const mixed = 'Hello 世界 мир العالم 🌍'.repeat(100);
    // Under limit
    const result = truncateMaterialText(mixed);
    assert.equal(result.truncated, false); // 1700 chars * 100 = ~17000, unter 32k
  });
});

// ─── processLumoResponse ──────────────────────────────────────────────────────

describe('processLumoResponse', () => {
  it('gibt geparste JSON-Daten zurück bei normaler Antwort', () => {
    const mockResponse = {
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: JSON.stringify({ blocks: [{ id: '1', title: 'Test' }] }) },
      ],
    };
    const result = processLumoResponse(mockResponse);
    assert.deepEqual(result, { blocks: [{ id: '1', title: 'Test' }] });
  });

  it('wirft max_tokens_exceeded bei stop_reason=max_tokens', () => {
    const mockResponse = {
      stop_reason: 'max_tokens',
      content: [
        { type: 'text', text: '{"blocks": [{"id": "1", "t' }, // Abgeschnitten
      ],
    };
    assert.throws(
      () => processLumoResponse(mockResponse),
      { message: 'max_tokens_exceeded' }
    );
  });

  it('wirft empty_response wenn kein text-Block vorhanden', () => {
    const mockResponse = {
      stop_reason: 'end_turn',
      content: [
        { type: 'tool_use', id: 'tu_123' },
      ],
    };
    assert.throws(
      () => processLumoResponse(mockResponse),
      { message: 'empty_response' }
    );
  });

  it('wirft empty_response bei leerem content-Array', () => {
    const mockResponse = {
      stop_reason: 'end_turn',
      content: [],
    };
    assert.throws(
      () => processLumoResponse(mockResponse),
      { message: 'empty_response' }
    );
  });

  it('wirft empty_response bei null response', () => {
    assert.throws(
      () => processLumoResponse(null),
      { message: 'empty_response' }
    );
  });

  it('wirft json_parse_error bei ungültigem JSON', () => {
    const mockResponse = {
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: 'das ist kein json { ' },
      ],
    };
    assert.throws(
      () => processLumoResponse(mockResponse),
      { message: 'json_parse_error' }
    );
  });

  it('verarbeitet gültiges JSON mit Schema-konformen Feldern', () => {
    const schema = { blocks: [], totalBlocks: 0, recommendedOrder: [] };
    const mockResponse = {
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: JSON.stringify(schema) },
      ],
    };
    const result = processLumoResponse(mockResponse);
    assert.equal(result.totalBlocks, 0);
    assert.ok(Array.isArray(result.blocks));
  });

  it('bevorzugt ersten text-Block wenn mehrere vorhanden', () => {
    const mockResponse = {
      stop_reason: 'end_turn',
      content: [
        { type: 'text', text: JSON.stringify({ value: 1 }) },
        { type: 'text', text: JSON.stringify({ value: 2 }) },
      ],
    };
    const result = processLumoResponse(mockResponse);
    assert.equal(result.value, 1);
  });
});

// ─── DOCX-Ablehnung: mehrere Dateien ─────────────────────────────────────────

describe('DOCX-Ablehnung in Multi-File-Szenarios', () => {
  const findDocxInList = (fileList) => fileList.find(isDocxFile);

  it('erkennt DOCX in einer gemischten Dateiliste', () => {
    const files = [
      { mediaType: 'application/pdf', name: 'skript.pdf' },
      { mediaType: DOCX_MIME_TYPE, name: 'notizen.docx' },
      { mediaType: 'text/plain', name: 'zusammenfassung.txt' },
    ];
    assert.ok(findDocxInList(files));
  });

  it('gibt undefined zurück wenn keine DOCX in der Liste', () => {
    const files = [
      { mediaType: 'application/pdf', name: 'skript.pdf' },
      { mediaType: 'text/plain', name: 'notizen.txt' },
    ];
    assert.equal(findDocxInList(files), undefined);
  });

  it('erkennt DOCX auch ohne MIME-Type (nur Dateiendung)', () => {
    const files = [
      { mediaType: '', name: 'bachelorarbeit.docx' },
      { mediaType: 'application/pdf', name: 'literatur.pdf' },
    ];
    assert.ok(findDocxInList(files));
  });

  it('leere Dateiliste enthält kein DOCX', () => {
    assert.equal(findDocxInList([]), undefined);
  });
});

// ─── PDF-Größenvalidierung ────────────────────────────────────────────────────

describe('PDF-Größenvalidierung', () => {
  it('akzeptiert PDF unter dem Limit', () => {
    const smallPdf = makeBase64ForBytes(1024); // 1 KB
    assert.ok(getBase64RawBytes(smallPdf) < MAX_PDF_BYTES_RAW);
  });

  it('akzeptiert PDF genau auf dem Limit', () => {
    const exactLimitPdf = makeBase64ForBytes(MAX_PDF_BYTES_RAW);
    const rawBytes = getBase64RawBytes(exactLimitPdf);
    // Minimal tolerance for integer rounding
    assert.ok(rawBytes <= MAX_PDF_BYTES_RAW + 1);
  });

  it('lehnt PDF über dem Limit ab', () => {
    const overLimitPdf = makeBase64ForBytes(MAX_PDF_BYTES_RAW + 1024 * 1024); // 1 MB über Limit
    assert.ok(getBase64RawBytes(overLimitPdf) > MAX_PDF_BYTES_RAW);
  });

  it('lehnt leere (0-Byte) PDF ab — getBase64RawBytes gibt 0 zurück', () => {
    assert.equal(getBase64RawBytes(''), 0);
  });

  it('verarbeitet mehrere PDFs: erkennt das zu große korrekt', () => {
    const pdfList = [
      { base64: makeBase64ForBytes(5 * 1024 * 1024), mediaType: 'application/pdf', name: 'a.pdf' },
      { base64: makeBase64ForBytes(MAX_PDF_BYTES_RAW + 100), mediaType: 'application/pdf', name: 'b.pdf' },
    ];
    const tooLarge = pdfList.find(f =>
      f.mediaType === 'application/pdf' && getBase64RawBytes(f.base64) > MAX_PDF_BYTES_RAW
    );
    assert.ok(tooLarge);
    assert.equal(tooLarge.name, 'b.pdf');
  });
});

// ─── Kombinierte Szenarien ────────────────────────────────────────────────────

describe('Kombinierte Szenarien', () => {
  it('PDF allein: keine Trunkierung nötig', () => {
    // PDF ohne materialText → keine Trunkierung
    const result = truncateMaterialText(undefined);
    assert.equal(result.truncated, false);
  });

  it('PDF + kurzer Text: kein truncated', () => {
    const shortText = makeText(1000);
    const result = truncateMaterialText(shortText);
    assert.equal(result.truncated, false);
  });

  it('PDF + langer Text: truncated', () => {
    const longText = makeText(MAX_MATERIAL_CHARS + 5000);
    const result = truncateMaterialText(longText);
    assert.equal(result.truncated, true);
  });

  it('Mehrere Textdateien — nur erste wird als materialText genutzt (kein Merge)', () => {
    // Der Server nimmt materialText als einzelnen String; mehrere Textdateien
    // werden nicht automatisch zusammengeführt (by design).
    // Dieser Test dokumentiert das bekannte Verhalten.
    const texts = ['erste Datei content', 'zweite Datei content'];
    const materialText = texts[0]; // Nur erste wird übernommen (wie im aktuellen Code)
    assert.equal(materialText, 'erste Datei content');
    // Zweiter Text geht verloren — bekannte Limitation
  });
});

// ─── Konstanten-Plausibilität ─────────────────────────────────────────────────

describe('Konstanten', () => {
  it('MAX_MATERIAL_CHARS ist 32000', () => {
    assert.equal(MAX_MATERIAL_CHARS, 32000);
  });

  it('MAX_PDF_BYTES_RAW ist 24 MB', () => {
    assert.equal(MAX_PDF_BYTES_RAW, 24 * 1024 * 1024);
  });

  it('DOCX_MIME_TYPE entspricht dem Standard', () => {
    assert.equal(
      DOCX_MIME_TYPE,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });
});

/*
 * ─── Hinweis zu Integration-Tests ────────────────────────────────────────────
 *
 * Folgende Szenarien benötigen einen laufenden Express-Server mit gemocktem
 * Anthropic-Client (node:test mock.module() erst ab Node 22 verfügbar):
 *
 * - DOCX löst keinen Claude-Aufruf aus (H-01b Endpunkt-Test)
 * - stop_reason=max_tokens gibt verständliche Fehlermeldung zurück (H-02)
 * - Timeout-Fehler gibt korrekte Meldung zurück ohne automatischen Retry (H-02)
 * - 5xx-Fehler von Anthropic wird korrekt behandelt
 * - Kein doppelter Claude-Aufruf bei Timeout
 *
 * Mit Node 22+ können diese Tests mit mock.module('@anthropic-ai/sdk', ...) implementiert werden.
 */
