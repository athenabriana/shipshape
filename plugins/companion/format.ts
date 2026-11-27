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
  // Code, escapes, links and bare URLs go into placeholders first, so nothing inside them
  // is read as Markdown. A stray NUL in the input could pose as one, so it is dropped.
  const slots: string[] = [];
  const hold = (html: string): string => `\u0000${slots.push(html) - 1}\u0000`;

  // A language name counts only when a newline follows it, so ```rm -rf x``` keeps "rm".
  let s = md
    .replace(/\u0000/g, "")
    .replace(
      /```(?:([\w+-]+)[^\S\n]*\n|\n?)([\s\S]*?)```/g,
      (_, lang: string | undefined, body: string) => {
        const code = escapeHtml(body.replace(/\n$/, ""));
        return hold(
          lang
            ? `<pre><code class="language-${escapeAttr(lang)}">${code}</code></pre>`
            : `<pre>${code}</pre>`,
        );
      },
    );
  s = s.replace(/`([^`\n]+)`/g, (_, code: string) => hold(`<code>${escapeHtml(code)}</code>`));
  // A backslash keeps the next punctuation mark literal, as in Markdown.
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!>~|])/g, (_, ch: string) => hold(escapeHtml(ch)));

  s = escapeHtml(s);

  // One level of balanced parentheses in a URL, as in Wikipedia links.
  const url = "https?:\\/\\/(?:[^\\s()]|\\([^\\s()]*\\))+";
  s = s.replace(
    new RegExp(`\\[([^\\]\\n]+)\\]\\((${url})\\)`, "g"),
    (_, text: string, href: string) =>
      hold(`<a href="${escapeAttr(href.replace(/&amp;/g, "&"))}">${text}</a>`),
  );
  // A bare URL stays as written: Telegram links it, and underscores in it are not emphasis.
  s = s.replace(/https?:\/\/[^\s<]+/g, (href) => hold(href));

  const lines = s.split("\n").map((line) => {
    // A closing run of "#" counts only after a space, so "C#" keeps its "#".
    const heading = /^#{1,6}\s+(.+?)(?:\s+#+)?\s*$/.exec(line);
    if (heading) return `<b>${heading[1]}</b>`;
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) return "──────";
    const bullet = /^(\s*)[-*+]\s+(.*)$/.exec(line);
    if (bullet) return `${bullet[1]}• ${bullet[2]}`;
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

  // Underscore emphasis needs a space or punctuation on both sides, so __init__.py and
  // snake_case stay as written.
  const open = "(^|[\\s(\\[{\"'])";
  const close = "(?=$|[\\s,;:!?)\\]}\"']|\\.(?:\\s|$))";
  s = s
    .replace(/\*\*(?=\S)([^\n]*?\S)\*\*/g, "<b>$1</b>")
    .replace(new RegExp(`${open}__(?=\\S)((?:(?!__)[^\\n])*?\\S)__${close}`, "g"), "$1<b>$2</b>")
    .replace(/~~(?=\S)([^\n]*?\S)~~/g, "<s>$1</s>")
    .replace(/(^|[^\w*])\*(?=[^\s*])([^\n*]*?[^\s*])\*(?![\w*])/g, "$1<i>$2</i>")
    .replace(new RegExp(`${open}_(?=[^\\s_])([^\\n_]*?[^\\s_])_${close}`, "g"), "$1<i>$2</i>");

  // Expand until none is left: a link label can hold a code placeholder.
  for (let i = 0; i < 4 && s.includes("\u0000"); i++) {
    s = s.replace(/\u0000(\d+)\u0000/g, (_, n: string) => slots[Number(n)] ?? "");
  }
  return s;
}

/**
 * Sends Markdown as Telegram HTML, and the same text plain when Telegram refuses the
 * formatting. Telegram counts its 4096-character limit after parsing, so tags and escapes
 * do not count against it. Other formats go through unchanged.
 */
export async function sendFormatted<T>(
  text: string,
  format: string,
  send: (body: string, parseMode?: "HTML" | "MarkdownV2") => Promise<T>,
): Promise<T> {
  if (format === "markdown") {
    try {
      return await send(markdownToTelegramHtml(text), "HTML");
    } catch (err) {
      if (!isParseError(err)) throw err;
      return send(text);
    }
  }
  return send(text, format === "markdownv2" ? "MarkdownV2" : undefined);
}

/** The code blocks markdownToTelegramHtml() recognizes, so both agree on what is open. */
const FENCE = /```(?:([\w+-]+)[^\S\n]*\n|\n?)([\s\S]*?)```/g;

/**
 * Makes each Markdown chunk render on its own: a code block cut by a chunk boundary is
 * closed at the end of one chunk and reopened, with its language, at the start of the next.
 */
export function balanceFences(chunks: string[]): string[] {
  const out: string[] = [];
  let reopen = "";
  for (const raw of chunks) {
    const text = reopen + raw;
    const open = /```(?:([\w+-]+)[^\S\n]*\n)?/.exec(text.replace(FENCE, ""));
    if (open) {
      out.push(`${text}\n\`\`\``);
      reopen = `\`\`\`${open[1] ?? ""}\n`;
    } else {
      out.push(text);
      reopen = "";
    }
  }
  return out;
}

/** True when Telegram refused the message because of its formatting, not for another reason. */
export function isParseError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /can't parse entities|unsupported start tag|can't find end tag|unclosed/i.test(msg);
}
