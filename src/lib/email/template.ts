import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

marked.setOptions({ gfm: true, breaks: true });

/**
 * Render the markdown body to email-safe HTML inside a styled email shell.
 * Returns BOTH html (rich, table-based) and text (plain fallback).
 */
export async function renderEmail(opts: {
  subject: string;
  bodyMd: string;
  preheader?: string | null;
  unsubscribeUrl: string;
  siteUrl: string;
}): Promise<{ html: string; text: string }> {
  const rawHtml = await marked.parse(opts.bodyMd, { async: true });
  const safeHtml = DOMPurify.sanitize(String(rawHtml), {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "a", "img", "strong", "em", "ul", "ol", "li", "blockquote",
      "br", "hr", "code", "pre", "span", "div",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "style"],
    ALLOWED_URI_REGEXP: /^(https?|mailto):/i,
  });

  // Inline-styled HTML email (safe across major email clients)
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(opts.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#060a0d;color:#e8d9bd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#060a0d;">${escapeHtml(opts.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#060a0d;">
  <tr>
    <td align="center" style="padding:48px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#0c1419;border:1px solid rgba(255,255,255,0.06);border-radius:4px;">

        <!-- Header -->
        <tr>
          <td style="padding:32px 32px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
            <a href="${escapeHtml(opts.siteUrl)}" style="text-decoration:none;color:#e8d9bd;font-family:Georgia,serif;font-size:22px;letter-spacing:-0.5px;">noah hill</a>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;color:#e8d9bd;font-size:16px;line-height:1.65;">
            <div style="color:#e8d9bd;">${styleEmailHtml(safeHtml)}</div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 32px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#9c8c70;line-height:1.6;">
            <p style="margin:0 0 8px;color:#9c8c70;">you're receiving this because you signed up at <a href="${escapeHtml(opts.siteUrl)}" style="color:#e8d9bd;">noahhillmusic.com</a>.</p>
            <p style="margin:0;color:#9c8c70;">
              <a href="${escapeHtml(opts.unsubscribeUrl)}" style="color:#9c8c70;text-decoration:underline;">unsubscribe</a>
              · noah hill · 2026
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  // Plain-text fallback
  const text = mdToPlainText(opts.bodyMd) +
    `\n\n──\nUnsubscribe: ${opts.unsubscribeUrl}`;

  return { html, text };
}

/**
 * Inject inline styles into the rendered HTML so it survives email clients that strip <style> tags.
 */
function styleEmailHtml(html: string): string {
  return html
    .replace(/<h1>/g,         '<h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;color:#e8d9bd;font-weight:600;">')
    .replace(/<h2>/g,         '<h2 style="margin:24px 0 12px;font-size:22px;line-height:1.3;color:#e8d9bd;font-weight:600;">')
    .replace(/<h3>/g,         '<h3 style="margin:20px 0 10px;font-size:18px;line-height:1.4;color:#e8d9bd;font-weight:600;">')
    .replace(/<p>/g,          '<p style="margin:0 0 16px;color:#e8d9bd;">')
    .replace(/<ul>/g,         '<ul style="margin:0 0 16px;padding-left:22px;color:#e8d9bd;">')
    .replace(/<ol>/g,         '<ol style="margin:0 0 16px;padding-left:22px;color:#e8d9bd;">')
    .replace(/<li>/g,         '<li style="margin:0 0 6px;">')
    .replace(/<a /g,          '<a style="color:#c8b27f;text-decoration:underline;" ')
    .replace(/<img /g,        '<img style="max-width:100%;height:auto;border-radius:4px;display:block;margin:16px 0;" ')
    .replace(/<blockquote>/g, '<blockquote style="margin:0 0 16px;padding:8px 16px;border-left:3px solid #4a7c85;color:#b5a586;">')
    .replace(/<hr>/g,         '<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:24px 0;">')
    .replace(/<code>/g,       '<code style="background:#16242c;padding:2px 6px;border-radius:3px;font-family:Menlo,Consolas,monospace;font-size:14px;color:#c8b27f;">')
    .replace(/<pre>/g,        '<pre style="background:#16242c;padding:12px;border-radius:4px;overflow-x:auto;margin:0 0 16px;color:#e8d9bd;font-family:Menlo,Consolas,monospace;font-size:13px;">');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mdToPlainText(md: string): string {
  return md
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "[image: $1]")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "• ")
    .trim();
}
