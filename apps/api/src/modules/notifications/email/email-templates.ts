/**
 * Brands & Creators — Production Email Templates Engine
 * Clean, Gemini-inspired responsive HTML & plain-text templates with strict XSS escaping.
 */

export function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface RenderTemplateParams {
  recipientName?: string;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  badge?: string;
  metadata?: Record<string, any>;
  appUrl?: string;
}

export function renderEmailTemplate(params: RenderTemplateParams): { html: string; text: string } {
  const name = escapeHtml(params.recipientName || 'Creator / Brand Partner');
  const title = escapeHtml(params.title);
  const message = escapeHtml(params.message);
  const badge = params.badge ? escapeHtml(params.badge) : 'Brands & Creators';
  const actionText = params.actionText ? escapeHtml(params.actionText) : 'View Details';
  const appUrl = params.appUrl || 'http://localhost:3000';
  const fullActionUrl = params.actionUrl
    ? params.actionUrl.startsWith('http')
      ? params.actionUrl
      : `${appUrl}${params.actionUrl.startsWith('/') ? params.actionUrl : `/${params.actionUrl}`}`
    : appUrl;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }
    table { border-collapse: collapse; width: 100%; }
    .container { max-width: 580px; margin: 0 auto; padding: 40px 20px; }
    .card { background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.04); }
    .header { padding: 32px 32px 24px; border-bottom: 1px solid #f1f5f9; }
    .badge { display: inline-block; padding: 4px 12px; background-color: #f0f4ff; color: #4355e7; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .body { padding: 32px; }
    .title { margin: 0 0 16px; font-size: 20px; font-weight: 700; color: #0f172a; line-height: 1.3; }
    .text { margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #475569; }
    .btn-container { margin: 28px 0 16px; }
    .btn { display: inline-block; background-color: #5c73f2; color: #ffffff !important; padding: 12px 28px; border-radius: 10px; font-size: 14px; font-weight: 600; text-decoration: none; text-align: center; }
    .footer { padding: 24px 32px; background-color: #fbfcfd; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
    .footer a { color: #64748b; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <span class="badge">${badge}</span>
      </div>
      <div class="body">
        <h1 class="title">${title}</h1>
        <p class="text">Hi ${name},</p>
        <p class="text">${message}</p>
        ${
          params.actionUrl
            ? `<div class="btn-container">
                 <a href="${fullActionUrl}" class="btn" target="_blank">${actionText} &rarr;</a>
               </div>`
            : ''
        }
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} Brands &amp; Creators. India's Dedicated B2B Creative Marketplace.</p>
        <p>You received this transactional notice based on your platform activity. <a href="${appUrl}/settings/notifications">Manage Notification Preferences</a>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `[Brands & Creators - ${badge}]

${title}

Hi ${params.recipientName || 'Creator / Brand Partner'},

${params.message}

${params.actionUrl ? `Action Link: ${fullActionUrl}` : ''}

---
Manage notification preferences: ${appUrl}/settings/notifications
© ${new Date().getFullYear()} Brands & Creators`;

  return { html, text };
}
