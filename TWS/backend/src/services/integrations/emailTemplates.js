const { getSanitizedBaseDomain } = require('../../utils/baseDomain');

// Hosted alongside the frontend SPA at frontend/public/email/logo.png — same
// navy/orange mark as the product's BrandMark component, exported to a flat
// PNG because most email clients (Outlook, Gmail app) render SVG poorly or
// not at all.
const LOGO_URL = `https://${getSanitizedBaseDomain()}/email/logo.png`;

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const COLORS = {
  navy: '#103D67',
  navyDark: '#0A2746',
  orange: '#F04E25',
  ink: '#1F2937',
  muted: '#6B7280',
  faint: '#8A93A6',
  border: '#E5E9F0',
  panel: '#F7F8FA',
  page: '#F1F3F6',
  danger: '#DC2626',
  dangerBg: '#FEF2F2',
  warning: '#B45309',
  warningBg: '#FFFBEB',
  success: '#047857',
  successBg: '#ECFDF5'
};

const ALERT_VARIANTS = {
  info: { fg: COLORS.navy, bg: '#EEF3F9', border: '#D7E3F0' },
  success: { fg: COLORS.success, bg: COLORS.successBg, border: '#BBEAD4' },
  warning: { fg: COLORS.warning, bg: COLORS.warningBg, border: '#FCE3B2' },
  danger: { fg: COLORS.danger, bg: COLORS.dangerBg, border: '#F8CDCD' }
};

/**
 * Solid-color CTA button, table-wrapped for Outlook (which ignores <a> padding
 * and border-radius on plain anchors).
 */
function renderButton({ href, label, variant = 'primary' }) {
  const bg = variant === 'danger' ? COLORS.danger : COLORS.navy;
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
      <tr>
        <td style="border-radius:8px;background-color:${bg};">
          <a href="${href}" target="_blank"
             style="display:inline-block;padding:14px 28px;font-family:${FONT_STACK};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">
            ${label}
          </a>
        </td>
      </tr>
    </table>`;
}

/** Light gray panel for grouped key/value details. */
function renderCard(innerHtml) {
  return `
    <div style="background:${COLORS.panel};border:1px solid ${COLORS.border};border-radius:8px;padding:20px 24px;margin:20px 0;">
      ${innerHtml}
    </div>`;
}

/** A single "Label: value" row inside a card. */
function renderRow(label, value) {
  return `<p style="margin:8px 0;font-size:14px;color:${COLORS.ink};"><strong>${label}:</strong> ${value}</p>`;
}

/** Small colored status pill — used instead of a full-width colored banner. */
function renderBadge(text, variant = 'info') {
  const { fg, bg } = ALERT_VARIANTS[variant] || ALERT_VARIANTS.info;
  return `<span style="display:inline-block;background:${bg};color:${fg};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;padding:5px 11px;border-radius:999px;">${text}</span>`;
}

/** Callout box for warnings/security notices — a bordered panel, not a loud gradient block. */
function renderNotice(text, variant = 'warning') {
  const { fg, bg, border } = ALERT_VARIANTS[variant] || ALERT_VARIANTS.warning;
  return `
    <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:16px 20px;margin:20px 0;">
      <p style="margin:0;font-size:13px;line-height:1.6;color:${fg};">${text}</p>
    </div>`;
}

/**
 * Wraps body content in the shared HousesBase email shell: branded header
 * (logo + wordmark on a plain light background — no gradients), a white
 * content card, and a muted footer. Table-based layout throughout for
 * Outlook/Gmail-app compatibility.
 */
function renderEmailShell({ preheader = '', bodyHtml }) {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.page};font-family:${FONT_STACK};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ''}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${COLORS.page};padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:12px;border:1px solid ${COLORS.border};">
            <tr>
              <td style="padding:26px 40px;border-bottom:1px solid ${COLORS.border};">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;padding-right:10px;">
                      <img src="${LOGO_URL}" width="34" height="26" alt="HousesBase" style="display:block;border:0;" />
                    </td>
                    <td style="vertical-align:middle;">
                      <span style="font-family:${FONT_STACK};font-size:18px;font-weight:700;color:${COLORS.navy};letter-spacing:-0.01em;">HousesBase</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:36px 40px;font-family:${FONT_STACK};">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px;background-color:${COLORS.panel};border-top:1px solid ${COLORS.border};border-radius:0 0 12px 12px;">
                <p style="margin:0;font-family:${FONT_STACK};font-size:12px;line-height:1.6;color:${COLORS.faint};">
                  © ${year} HousesBase · <a href="mailto:hello@housesbase.com" style="color:${COLORS.faint};">hello@housesbase.com</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = {
  LOGO_URL,
  FONT_STACK,
  COLORS,
  renderButton,
  renderCard,
  renderRow,
  renderBadge,
  renderNotice,
  renderEmailShell
};
