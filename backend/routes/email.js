/**
 * email.js — E-Mail-Versand für Kauf-Bestätigungen
 *
 * Bietet:
 *  - sendPurchaseEmail(userEmail, purchaseDetails) – HTML-Bestätigung
 *  - generateDownloadToken(imageId, userId) – signierten Download-Link
 *  - Rechnungsnummer-Generierung
 *
 * Test-Modus: Wenn SMTP-Daten fehlen, wird der Mail-Inhalt geloggt
 * (kein echter Versand ohne explizites OK).
 */

const nodemailer = require('nodemailer');
const crypto = require('crypto');

// ── Konfiguration aus Umgebung ──
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'noreply@stock-photo-shop.de';
const APP_URL = process.env.APP_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

// Test-Modus aktiv, wenn keine SMTP-Anmeldedaten vorhanden sind
const TEST_MODE = !(SMTP_HOST && SMTP_USER && SMTP_PASS);

// ── Nodemailer Transporter ──
let transporter = null;
if (!TEST_MODE) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true für 465, false für andere Ports
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Fehlertoleranz bei instabilen SMTP-Verbindungen
    pool: true,
    maxConnections: 3,
  });

  // Verbindung beim Start verifizieren (nicht blockierend)
  transporter.verify((err) => {
    if (err) {
      console.warn('[EMAIL] SMTP-Verifizierung fehlgeschlagen:', err.message);
    } else {
      console.log('[EMAIL] SMTP-Transporter bereit.');
    }
  });
}

// ── Rechnungsnummer ──

/**
 * Erzeugt eine eindeutige Rechnungsnummer basierend auf Session-ID oder Timestamp.
 * Format: INV-YYYYMMDD-XXXX (X = 4-stellige zufällige Zeichenfolge)
 */
function generateInvoiceNumber(sessionId) {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  // Falls Session-ID vorhanden: letzte 4 Zeichen hashen, sonst Zufall
  const seed = sessionId || crypto.randomUUID();
  const short = crypto.createHash('sha256').update(seed + datePart).digest('hex').slice(0, 4).toUpperCase();
  return `INV-${datePart}-${short}`;
}

// ── Download-Token ──

/**
 * Erzeugt einen signierten Download-Token für ein Bild.
 * Der Token enthält imageId, userId und Ablaufzeit (24h).
 * Überprüfung erfolgt in /api/download/:token.
 */
function generateDownloadToken(imageId, userId) {
  const payload = {
    i: imageId,        // imageId (kurz für Token-Kompaktheit)
    u: userId,          // userId
    exp: Date.now() + 24 * 60 * 60 * 1000, // Ablauf: 24 Stunden
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

/**
 * Verifiziert einen Download-Token.
 * Gibt das geparste Payload zurück oder null bei Ungültigkeit.
 */
function verifyDownloadToken(token) {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return null;

    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadB64).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (payload.exp < Date.now()) return null; // Abgelaufen

    return { imageId: payload.i, userId: payload.u };
  } catch {
    return null;
  }
}

// ── HTML-Template ──

/**
 * Baut das HTML für die Kauf-Bestätigungsmail.
 * Inkl. Rechnungsnummer, gekaufte Bilder mit Download-Links und Preis.
 */
function buildEmailHtml(details) {
  const { userEmail, images, totalCents, invoiceNumber, purchasedAt } = details;

  const formattedDate = new Date(purchasedAt).toLocaleString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalEur = (totalCents / 100).toFixed(2);

  // Download-Links für jedes Bild erzeugen
  const imageRows = images.map((img) => {
    const token = generateDownloadToken(img.id, details.userId);
    const downloadUrl = `${APP_URL}/api/download/${encodeURIComponent(token)}`;
    const priceEur = (img.price_cents / 100).toFixed(2);
    return `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
          <strong>${img.title || `Bild #${img.id}`}</strong><br/>
          <span style="color:#6b7280;font-size:13px;">ID: ${img.id}</span>
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:right;">
          ${priceEur} €
        </td>
        <td style="padding:12px;border-bottom:1px solid #e5e7eb;text-align:center;">
          <a href="${downloadUrl}"
             style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;">
            ⬇ Download
          </a>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Link gültig für 24h</div>
        </td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kauf-Bestätigung</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center" style="padding:24px 0;">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:32px 24px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;">🎉 Danke für deinen Einkauf!</h1>
              <p style="color:#dbeafe;margin:8px 0 0;font-size:14px;">Deine Stock-Fotos sind zum Download bereit.</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px;">
              <p style="color:#374151;font-size:15px;line-height:1.6;">
                Hallo,<br/>
                dein Kauf wurde erfolgreich abgeschlossen. Hier findest du alle Details:
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background:#f9fafb;border-radius:8px;padding:16px;">
                <tr>
                  <td style="padding:8px 16px;color:#6b7280;font-size:13px;">Rechnungsnummer</td>
                  <td style="padding:8px 16px;text-align:right;font-weight:600;color:#111827;">${invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;color:#6b7280;font-size:13px;">Kaufdatum</td>
                  <td style="padding:8px 16px;text-align:right;color:#111827;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding:8px 16px;color:#6b7280;font-size:13px;">E-Mail</td>
                  <td style="padding:8px 16px;text-align:right;color:#111827;">${userEmail}</td>
                </tr>
              </table>

              <h3 style="color:#111827;font-size:16px;margin:24px 0 12px;">Gekaufte Bilder</h3>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="background:#f3f4f6;">
                    <th style="padding:10px 12px;text-align:left;font-size:13px;color:#4b5563;">Bild</th>
                    <th style="padding:10px 12px;text-align:right;font-size:13px;color:#4b5563;">Preis</th>
                    <th style="padding:10px 12px;text-align:center;font-size:13px;color:#4b5563;">Download</th>
                  </tr>
                </thead>
                <tbody>
                  ${imageRows}
                </tbody>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-top:2px solid #e5e7eb;">
                <tr>
                  <td style="padding:12px 0;text-align:right;font-size:18px;font-weight:700;color:#111827;">
                    Gesamt: ${totalEur} €
                  </td>
                </tr>
              </table>

              <p style="color:#6b7280;font-size:13px;margin-top:24px;line-height:1.5;">
                <strong>Hinweis:</strong> Die Download-Links sind 24 Stunden gültig. Falls ein Link abläuft,
                kannst du deine gekauften Bilder jederzeit in deinem <a href="${APP_URL}/profile.html" style="color:#2563eb;">Profil</a> erneut herunterladen.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 24px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                Stock Photo Shop v2 · <a href="${APP_URL}" style="color:#6b7280;text-decoration:none;">${APP_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ── Öffentliche API ──

/**
 * Sendet eine Kauf-Bestätigungsmail an den Nutzer.
 *
 * @param {string} userEmail — Empfänger-E-Mail
 * @param {object} purchaseDetails — Details zum Kauf
 *   - userId {string}
 *   - images {Array<{id, title, price_cents}>}
 *   - totalCents {number}
 *   - sessionId {string} — für Rechnungsnummer
 *   - purchasedAt {string} — ISO-Datum
 *
 * @returns {Promise<{success: boolean, testMode: boolean, info?: object, error?: string}>}
 */
async function sendPurchaseEmail(userEmail, purchaseDetails) {
  try {
    const invoiceNumber = generateInvoiceNumber(purchaseDetails.sessionId);
    const html = buildEmailHtml({
      ...purchaseDetails,
      userEmail,
      invoiceNumber,
    });

    const mailOptions = {
      from: `"Stock Photo Shop" <${SMTP_FROM}>`,
      to: userEmail,
      subject: `🎉 Kauf-Bestätigung — ${invoiceNumber}`,
      html,
      text: `Danke für deinen Einkauf!\n\nRechnungsnummer: ${invoiceNumber}\nGesamtbetrag: ${(purchaseDetails.totalCents / 100).toFixed(2)} €\n\nDeine Download-Links findest du in dieser E-Mail (HTML-Version).`,
    };

    if (TEST_MODE) {
      // ── Test-Modus: Kein echter Versand ──
      console.log('\n══════════════════════════════════════════════════');
      console.log('[EMAIL] TEST-MODUS — E-Mail wird NICHT versendet');
      console.log('══════════════════════════════════════════════════');
      console.log('An:', mailOptions.to);
      console.log('Betreff:', mailOptions.subject);
      console.log('Text:', mailOptions.text);
      console.log('HTML-Länge:', html.length, 'Zeichen');
      console.log('Rechnungsnummer:', invoiceNumber);
      console.log('Download-Links:', purchaseDetails.images.length);
      console.log('══════════════════════════════════════════════════\n');
      return { success: true, testMode: true, info: { invoiceNumber, to: userEmail } };
    }

    // ── Echter Versand ──
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EMAIL] Bestätigung gesendet an ${userEmail} — MessageId: ${info.messageId}`);
    return { success: true, testMode: false, info: { messageId: info.messageId, invoiceNumber } };

  } catch (err) {
    console.error('[EMAIL] Fehler beim Senden der Kauf-Bestätigung:', err.message);
    return { success: false, testMode: TEST_MODE, error: err.message };
  }
}

module.exports = {
  sendPurchaseEmail,
  generateDownloadToken,
  verifyDownloadToken,
  generateInvoiceNumber,
  TEST_MODE,
};
