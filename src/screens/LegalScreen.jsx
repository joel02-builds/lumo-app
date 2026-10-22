/**
 * LegalScreen — Impressum + Datenschutzerklärung + Nutzungsbedingungen
 *
 * Erreichbar über:
 * – Footer-Link im Onboarding (OnboardingScreen1)
 * – Settings-Menü
 *
 * Rechtliche Grundlagen:
 * – Impressumspflicht: § 5 TMG (Telemediengesetz)
 * – Datenschutz: DSGVO Art. 13 (Informationspflicht bei Erhebung)
 * – Cookie: ePrivacy Directive 2002/58/EC
 * – Nutzungsbedingungen: §§ 305 ff. BGB
 *
 * ADHS-Design:
 * – Kein Modal, eigener Screen mit Back-Button
 * – Klare Struktur, keine Wand aus Juristen-Deutsch
 * – Kurze, verständliche Sprache wo rechtlich vertretbar
 *
 * Änderungshistorie:
 * – Oktober 2026: Datenschutz aktualisiert für Server-Sync + lumo_uid Cookie
 *   + Google Fonts + ToS ergänzt
 */

import { useState } from 'react';

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

const TAB_STYLE_ACTIVE = {
  padding: '8px 18px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: '700',
  cursor: 'pointer',
  background: 'var(--gold)',
  color: '#1a1206',
  border: 'none',
};

const TAB_STYLE_INACTIVE = {
  padding: '8px 18px',
  borderRadius: '999px',
  fontSize: '13px',
  fontWeight: '500',
  cursor: 'pointer',
  background: 'var(--bg-card)',
  color: 'var(--text-secondary)',
  border: '1px solid var(--border)',
};

export default function LegalScreen({ onBack }) {
  const [tab, setTab] = useState('privacy');

  return (
    <div className="screen" style={{ justifyContent: 'flex-start', paddingTop: '60px', paddingBottom: '40px' }}>
      <div className="screen-content" style={{ maxWidth: '600px', gap: '0', alignItems: 'flex-start' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', marginBottom: '20px' }}>
          <button
            onClick={onBack}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '14px', cursor: 'pointer', padding: '0' }}
          >
            ← Zurück
          </button>
          <h2 style={{ fontSize: '20px', fontWeight: '700', margin: '0' }}>Rechtliches</h2>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <button style={tab === 'privacy' ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE} onClick={() => setTab('privacy')}>
            Datenschutz
          </button>
          <button style={tab === 'tos' ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE} onClick={() => setTab('tos')}>
            Nutzungsbedingungen
          </button>
          <button style={tab === 'impressum' ? TAB_STYLE_ACTIVE : TAB_STYLE_INACTIVE} onClick={() => setTab('impressum')}>
            Impressum
          </button>
        </div>

        {/* ── TAB: IMPRESSUM ── */}
        {tab === 'impressum' && (
          <section style={{ width: '100%' }}>
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
        )}

        {/* ── TAB: NUTZUNGSBEDINGUNGEN ── */}
        {tab === 'tos' && (
          <section style={{ width: '100%' }}>
            <h3 style={headingStyle}>Nutzungsbedingungen</h3>
            <p style={{ ...textStyle, marginBottom: '16px' }}>
              Stand: Oktober 2026 · Diese Nutzungsbedingungen gelten für die Verwendung der Webanwendung Lumo
              (nachfolgend „Dienst").
            </p>

            <h4 style={subHeadingStyle}>1. Beschreibung des Dienstes</h4>
            <p style={textStyle}>
              Lumo ist eine KI-gestützte Lernanwendung, die es Nutzern ermöglicht, eigene Lernmaterialien hochzuladen
              und mithilfe von Künstlicher Intelligenz aufzubereiten. Die Anwendung befindet sich in einer öffentlichen
              Beta-Phase. Es handelt sich um kein kommerzielles Angebot.
            </p>

            <h4 style={subHeadingStyle}>2. Nutzungsvoraussetzungen</h4>
            <p style={textStyle}>
              Die Nutzung von Lumo setzt voraus, dass du mindestens 16 Jahre alt bist. Mit der Nutzung bestätigst du,
              diese Altersanforderung zu erfüllen. Für Nutzer unter 18 Jahren ist die Zustimmung eines
              Erziehungsberechtigten erforderlich.
            </p>

            <h4 style={subHeadingStyle}>3. Erlaubte Nutzung</h4>
            <p style={textStyle}>
              Lumo darf ausschließlich für rechtmäßige Zwecke genutzt werden. Es ist insbesondere untersagt:
            </p>
            <ul style={{ ...textStyle, marginTop: '8px', paddingLeft: '20px', lineHeight: '2' }}>
              <li>Urheberrechtlich geschütztes Material ohne Berechtigung hochzuladen</li>
              <li>Den Dienst zur Generierung von illegalem, schädlichem oder irreführendem Inhalt zu verwenden</li>
              <li>Den Dienst automatisiert (z. B. durch Bots oder Scraping) zu nutzen</li>
              <li>Sicherheitsmechanismen zu umgehen oder den Dienst zu manipulieren</li>
            </ul>

            <h4 style={subHeadingStyle}>4. Deine Inhalte</h4>
            <p style={textStyle}>
              Du behältst alle Rechte an deinen hochgeladenen Materialien. Indem du Inhalte hochlädst, räumst du uns
              das Recht ein, diese zur Erbringung des Dienstes zu verarbeiten — insbesondere durch Weitergabe an
              Anthropic (Claude API) zur Generierung von Lerninhalten. Diese Verarbeitung erfolgt ausschließlich
              zur Bereitstellung der Lumo-Funktionen.
            </p>
            <p style={{ ...textStyle, marginTop: '8px' }}>
              Du bist dafür verantwortlich sicherzustellen, dass du das Recht hast, die von dir hochgeladenen
              Inhalte zu verwenden und zu übertragen.
            </p>

            <h4 style={subHeadingStyle}>5. KI-generierte Inhalte</h4>
            <p style={textStyle}>
              Die von Lumo generierten Erklärungen, Zusammenfassungen und Fragen werden durch KI erstellt.
              Diese Inhalte können Fehler enthalten und ersetzen keine professionelle Beratung oder
              geprüfte Lernmaterialien. Wir übernehmen keine Gewähr für die inhaltliche Richtigkeit der
              generierten Inhalte.
            </p>

            <h4 style={subHeadingStyle}>6. Verfügbarkeit</h4>
            <p style={textStyle}>
              Da sich Lumo in der Beta-Phase befindet, können wir keine dauerhaft störungsfreie Verfügbarkeit
              garantieren. Wir behalten uns vor, den Dienst jederzeit zu ändern, einzuschränken oder einzustellen.
              Es besteht kein Anspruch auf dauerhafte Verfügbarkeit.
            </p>

            <h4 style={subHeadingStyle}>7. Haftungsbeschränkung</h4>
            <p style={textStyle}>
              Lumo wird als kostenloses Beta-Projekt ohne Gewährleistung zur Verfügung gestellt.
              Wir haften nicht für Schäden, die durch die Nutzung des Dienstes entstehen,
              soweit dies gesetzlich zulässig ist. Insbesondere haften wir nicht für
              den Verlust von Lernmaterialien oder -fortschritten.
            </p>

            <h4 style={subHeadingStyle}>8. Änderungen</h4>
            <p style={textStyle}>
              Wir behalten uns vor, diese Nutzungsbedingungen jederzeit zu ändern.
              Änderungen werden in der App bekanntgegeben. Durch die weitere Nutzung
              des Dienstes nach einer solchen Benachrichtigung stimmst du den
              geänderten Bedingungen zu.
            </p>

            <h4 style={subHeadingStyle}>9. Anwendbares Recht</h4>
            <p style={textStyle}>
              Es gilt deutsches Recht. Gerichtsstand ist, soweit gesetzlich zulässig,
              Osnabrück, Deutschland.
            </p>
          </section>
        )}

        {/* ── TAB: DATENSCHUTZ ── */}
        {tab === 'privacy' && (
          <section style={{ width: '100%' }}>
            <h3 style={headingStyle}>Datenschutzerklärung</h3>

            <h4 style={subHeadingStyle}>1. Wer ist verantwortlich?</h4>
            <p style={textStyle}>
              Joel Heiden, Borgloher Senke 1, 49176 Hilter am Teutoburger Wald.
              E-Mail: heidenjoel@web.de
            </p>

            <h4 style={subHeadingStyle}>2. Was speichert Lumo?</h4>
            <p style={textStyle}>
              Lumo speichert deine Lernfortschritte in zwei Bereichen:
            </p>
            <p style={{ ...textStyle, marginTop: '10px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>a) Lokal auf deinem Gerät</strong> (IndexedDB/localStorage):
              Dein Lernthema, Lernmaterial, Lernfortschritt, Karteikarten und Streak.
              Diese Daten bleiben auf deinem Gerät.
            </p>
            <p style={{ ...textStyle, marginTop: '10px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>b) Auf unserem Server</strong> (wenn du dem zustimmst):
              Um deinen Lernfortschritt geräteübergreifend zu synchronisieren, speichern wir
              einen anonymisierten Lernstand auf unserem Server. Dazu wird ein anonymer Cookie
              (<code style={{ background: 'var(--bg-card)', borderRadius: '4px', padding: '1px 5px', fontSize: '12px' }}>lumo_uid</code>)
              gesetzt, der einen zufällig generierten Code enthält — keine personenbezogenen Daten.
              Wir speichern dabei <em>keine</em> deiner Lernmaterialien auf dem Server, nur
              Fortschrittsdaten (abgeschlossene Blöcke, Karteikarten-Status, Streak).
            </p>

            <h4 style={subHeadingStyle}>3. Cookie — lumo_uid</h4>
            <p style={textStyle}>
              Wenn du der Server-Synchronisation zustimmst, setzen wir den Cookie <code style={{ background: 'var(--bg-card)', borderRadius: '4px', padding: '1px 5px', fontSize: '12px' }}>lumo_uid</code>.
            </p>
            <div style={{
              marginTop: '10px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
              padding: '14px 16px',
            }}>
              {[
                ['Name', 'lumo_uid'],
                ['Zweck', 'Anonyme Nutzeridentifikation für Server-Synchronisation'],
                ['Inhalt', 'UUID (zufällig generierter Code, keine personenbezogenen Daten)'],
                ['Gültigkeit', '1 Jahr'],
                ['Anbieter', 'lumo-app.de (First-Party)'],
                ['Übertragung', 'Nur an unseren Server (render.com)'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)', minWidth: '80px', flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ ...textStyle, marginTop: '10px' }}>
              Du kannst die Synchronisation jederzeit in den Einstellungen deaktivieren und
              gespeicherte Server-Daten löschen.
            </p>

            <h4 style={subHeadingStyle}>4. Werden Daten an externe Dienste gesendet?</h4>
            <p style={textStyle}>
              Ja — beim Start einer Lernsession sendet Lumo deinen Lerninhalt an die API von
              Anthropic (anthropic.com), um KI-gestützte Lernmaterialien zu generieren.
              Die Verarbeitung erfolgt gemäß der Datenschutzrichtlinie von Anthropic:{' '}
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

            <h4 style={subHeadingStyle}>5. Google Fonts</h4>
            <p style={textStyle}>
              Lumo lädt Schriftarten über Google Fonts (fonts.googleapis.com). Dabei wird deine IP-Adresse
              an Google (USA) übertragen. Die Übertragung basiert auf dem berechtigten Interesse (Art. 6 Abs. 1 lit. f DSGVO)
              an einer einheitlichen Darstellung. Datenschutzrichtlinie von Google:{' '}
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none' }}
              >
                policies.google.com/privacy
              </a>
            </p>

            <h4 style={subHeadingStyle}>6. Server-Logs</h4>
            <p style={textStyle}>
              Unser Server (gehostet bei Render, render.com) speichert automatisch technische Zugriffsdaten
              (IP-Adresse, Zeitstempel, aufgerufene URL) für max. 7 Tage. Diese Daten dienen ausschließlich
              der technischen Fehleranalyse und werden nicht ausgewertet oder weitergegeben.
            </p>

            <h4 style={subHeadingStyle}>7. Deine Rechte (DSGVO)</h4>
            <p style={textStyle}>
              Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung
              deiner Daten (Art. 15–18 DSGVO).
            </p>
            <p style={{ ...textStyle, marginTop: '8px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Lokale Daten löschen:</strong> Einstellungen → Backup → Daten zurücksetzen,
              oder direkt in deinen Browser-Einstellungen unter „Websitedaten löschen".
            </p>
            <p style={{ ...textStyle, marginTop: '8px' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Server-Daten löschen:</strong> Einstellungen → „Serverdaten löschen".
            </p>
            <p style={{ ...textStyle, marginTop: '8px' }}>
              Bei weiteren Fragen zum Datenschutz: heidenjoel@web.de
            </p>

            <h4 style={subHeadingStyle}>8. Änderungen dieser Erklärung</h4>
            <p style={textStyle}>
              Diese Datenschutzerklärung kann sich ändern. Die aktuelle Version ist immer in der App abrufbar.
              Stand: Oktober 2026.
            </p>
          </section>
        )}

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
