/**
 * LegalScreen — Impressum + Datenschutzerklärung
 *
 * Erreichbar über:
 * – Footer-Link im Onboarding (OnboardingScreen1)
 * – Settings-Menü
 *
 * Rechtliche Grundlagen:
 * – Impressumspflicht: § 5 TMG (Telemediengesetz)
 * – Datenschutz: DSGVO Art. 13 (Informationspflicht bei Erhebung)
 *
 * ADHS-Design:
 * – Kein Modal, eigener Screen mit Back-Button
 * – Klare Struktur, keine Wand aus Juristen-Deutsch
 * – Kurze, verständliche Sprache wo rechtlich vertretbar
 */

// ── Shared styles — VOR der Funktion, damit Vite keine TDZ erzeugt ──────────
const headingStyle = {
  fontSize: '18px',
  fontWeight: '700',
  color: 'var(--text-primary)',
  margin: '0 0 16px',
};

const subHeadingStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: 'var(--gold)',
  margin: '24px 0 8px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const textStyle = {
  fontSize: '14px',
  color: 'var(--text-secondary)',
  lineHeight: '1.7',
  margin: '0',
};

export default function LegalScreen({ onBack }) {
  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '60px', paddingBottom: '40px' }}>
      <div className="screen-content" style={{ maxWidth: '600px', gap: '0', alignItems: 'flex-start' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', marginBottom: '28px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', padding: '0' }}
          >
            ← Zurück
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0' }}>Impressum & Datenschutz</h2>
        </div>

        {/* ── IMPRESSUM ── */}
        <section style={{ width: '100%', marginBottom: '40px' }}>
          <h3 style={headingStyle}>Impressum</h3>
          <p style={textStyle}>
            Angaben gemäß § 5 TMG:
          </p>
          <p style={{ ...textStyle, marginTop: '12px', lineHeight: '1.9' }}>
            Joel Heiden<br />
            Borgloher Senke 1<br />
            49176 Hilter am Teutoburger Wald<br />
            Deutschland
          </p>
          <p style={{ ...textStyle, marginTop: '12px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>E-Mail:</strong>{' '}
            <a href="mailto:heidenjoel@web.de" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
              heidenjoel@web.de
            </a>
          </p>
          <p style={{ ...textStyle, marginTop: '16px', color: 'var(--text-secondary)', fontSize: '13px' }}>
            Lumo ist ein privates Forschungs- und Beta-Projekt. Es handelt sich um kein kommerzielles Angebot.
            Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV: Joel Heiden, Anschrift wie oben.
          </p>
        </section>

        <div style={{ width: '100%', height: '1px', background: 'var(--border)', marginBottom: '40px' }} />

        {/* ── DATENSCHUTZ ── */}
        <section style={{ width: '100%' }}>
          <h3 style={headingStyle}>Datenschutzerklärung</h3>

          <h4 style={subHeadingStyle}>1. Wer ist verantwortlich?</h4>
          <p style={textStyle}>
            Joel Heiden, Borgloher Senke 1, 49176 Hilter am Teutoburger Wald.
            E-Mail: heidenjoel@web.de
          </p>

          <h4 style={subHeadingStyle}>2. Was speichert Lumo?</h4>
          <p style={textStyle}>
            Lumo speichert deine Lernfortschritte <strong style={{ color: 'var(--text-primary)' }}>ausschließlich lokal auf deinem Gerät</strong> —
            im Browserspeicher (localStorage und IndexedDB). Diese Daten verlassen dein Gerät nicht,
            werden nicht auf unseren Servern gespeichert und nicht an Dritte weitergegeben.
          </p>
          <p style={{ ...textStyle, marginTop: '8px' }}>
            Konkret gespeichert wird: dein Lernthema, dein Lernmaterial (das du eingibst), dein Lernfortschritt,
            erstellte Karteikarten und dein Streak. All das liegt nur auf deinem Gerät.
          </p>

          <h4 style={subHeadingStyle}>3. Werden Daten an externe Dienste gesendet?</h4>
          <p style={textStyle}>
            Ja — wenn du eine Lernsession startest, sendet Lumo deinen Lerninhalt an die API von
            Anthropic (anthropic.com), um KI-gestützte Lernmaterialien zu generieren.
            Diese Daten werden für die Verarbeitung an Anthropic übertragen.
          </p>
          <p style={{ ...textStyle, marginTop: '8px' }}>
            Anthropic verarbeitet die Inhalte gemäß ihrer eigenen Datenschutzrichtlinie:{' '}
            <a
              href="https://www.anthropic.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--gold)', textDecoration: 'none' }}
            >
              anthropic.com/privacy
            </a>
          </p>
          <p style={{ ...textStyle, marginTop: '8px' }}>
            Wir senden keine personenbezogenen Daten wie Namen, E-Mail-Adressen oder Standort an Anthropic.
            Nur der Lerninhalt, den du explizit eingibst, wird übertragen.
          </p>

          <h4 style={subHeadingStyle}>4. Server-Logs</h4>
          <p style={textStyle}>
            Unser Server (gehostet bei Render, render.com) speichert automatisch technische Zugriffsdaten
            (IP-Adresse, Zeitstempel, aufgerufene URL) für max. 7 Tage. Diese Daten dienen ausschließlich
            der technischen Fehleranalyse und werden nicht ausgewertet oder weitergegeben.
          </p>

          <h4 style={subHeadingStyle}>5. Deine Rechte (DSGVO)</h4>
          <p style={textStyle}>
            Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
            deiner Daten (Art. 15–18 DSGVO). Da Lumo keine personenbezogenen Daten auf unseren Servern
            speichert, kannst du deine lokalen Daten jederzeit selbst löschen — über Einstellungen → Backup,
            oder direkt in deinen Browser-Einstellungen unter „Websitedaten löschen".
          </p>
          <p style={{ ...textStyle, marginTop: '8px' }}>
            Bei Fragen zum Datenschutz: heidenjoel@web.de
          </p>

          <h4 style={subHeadingStyle}>6. Änderungen dieser Erklärung</h4>
          <p style={textStyle}>
            Diese Datenschutzerklärung kann sich ändern. Die aktuelle Version ist immer in der App abrufbar.
            Stand: Oktober 2026.
          </p>
        </section>

        {/* Footer */}
        <div style={{ width: '100%', marginTop: '48px', textAlign: 'center' }}>
          <button
            onClick={onBack}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '14px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            ← Zurück zu Lumo
          </button>
        </div>

      </div>
    </div>
  );
}

