/**
 * Markdown to the HTML subset Telegram renders.
 *
 * Part of the companion plugin, Apache License, Version 2.0 (see LICENSE and NOTICE).
 *
 * Models write Markdown by habit, and Telegram's MarkdownV2 rejects a message over one
 * unescaped character. Telegram's HTML mode only needs `&`, `<` and `>` escaped, so the
 * reply tool converts the common Markdown forms to it and falls back to plain text when
 * Telegram still refuses the result.
 */

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const escapeAttr = (s: string): string => escapeHtml(s).replace(/"/g, "&quot;");

/** Converts one Markdown message to Telegram HTML (b, i, s, code, pre, a, blockquote). */
export function markdownToTelegramHtml(md: string): string {
  // Code goes into placeholders first, so nothing inside it is read as Markdown.
  const slots: string[] = [];
  const hold = (html: string): string => `\u0000${slots.push(html) - 1}\u0000`;

  let s = md.replace(/```([\w+-]*)[^\S\n]*\n?([\s\S]*?)```/g, (_, lang: string, body: string) => {
    const code = escapeHtml(body.replace(/\n$/, ""));
    return hold(
      lang
        ? `<pre><code class="language-${escapeAttr(lang)}">${code}</code></pre>`
        : `<pre>${code}</pre>`,
    );
  });
  s = s.replace(/`([^`\n]+)`/g, (_, code: string) => hold(`<code>${escapeHtml(code)}</code>`));

  s = escapeHtml(s);

  s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, text: string, url: string) =>
    hold(`<a href="${escapeAttr(url.replace(/&amp;/g, "&"))}">${text}</a>`),
  );

  const lines = s.split("\n").map((line) => {
    const heading = /^#{1,6}\s+(.+?)\s*#*$/.exec(line);
    if (heading) return `<b>${heading[1]}</b>`;
    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (bullet) return `${bullet[1]}• ${bullet[2]}`;
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return "──────";
    return line;
  });

  // Consecutive "> " lines become one blockquote (">" is already escaped to "&gt;").
  const out: string[] = [];
  let quote: string[] = [];
  const flushQuote = () => {
    if (quote.length) out.push(`<blockquote>${quote.join("\n")}</blockquote>`);
    quote = [];
  };
  for (const line of lines) {
    const q = /^&gt;\s?(.*)$/.exec(line);
    if (q) quote.push(q[1]);
    else {
      flushQuote();
      out.push(line);
    }
  }
  flushQuote();
  s = out.join("\n");

  s = s
    .replace(/\*\*(?=\S)([^\n]*?\S)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^\w])__(?=\S)([^\n]*?\S)__(?!\w)/g, "$1<b>$2</b>")
    .replace(/~~(?=\S)([^\n]*?\S)~~/g, "<s>$1</s>")
    .replace(/(^|[^\w*])\*(?=[^\s*])([^\n*]*?[^\s*])\*(?![\w*])/g, "$1<i>$2</i>")
    .replace(/(^|[^\w])_(?=[^\s_])([^\n_]*?[^\s_])_(?!\w)/g, "$1<i>$2</i>");

  return s.replace(/\u0000(\d+)\u0000/g, (_, i: string) => slots[Number(i)]);
}

/** True when Telegram refused the message because of its formatting, not for another reason. */
export function isParseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /can't parse entities|unsupported start tag|can't find end tag|unclosed/i.test(msg);
}
