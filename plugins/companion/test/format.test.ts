import { describe, expect, test } from "bun:test";

import { isParseError, markdownToTelegramHtml as md } from "../format.ts";

describe("markdownToTelegramHtml", () => {
  test("escapes the three characters Telegram's HTML mode reserves", () => {
    expect(md("a < b && c > d")).toBe("a &lt; b &amp;&amp; c &gt; d");
  });

  test("bold, italic, strike and inline code", () => {
    expect(md("**ship** it *now* ~~later~~ `x<y`")).toBe(
      "<b>ship</b> it <i>now</i> <s>later</s> <code>x&lt;y</code>",
    );
  });

  test("leaves underscores and asterisks inside words alone", () => {
    expect(md("snake_case_name and 2*3*4")).toBe("snake_case_name and 2*3*4");
  });

  test("code blocks keep their content verbatim and escaped", () => {
    expect(md("```ts\nconst a = **b** < 1\n```")).toBe(
      '<pre><code class="language-ts">const a = **b** &lt; 1</code></pre>',
    );
    expect(md("```\n# not a heading\n```")).toBe("<pre># not a heading</pre>");
  });

  test("links keep the URL and escape the text", () => {
    expect(md("[PR 37](https://github.com/a/b/pull/37?x=1&y=2)")).toBe(
      '<a href="https://github.com/a/b/pull/37?x=1&amp;y=2">PR 37</a>',
    );
  });

  test("leaves a non-http link as text", () => {
    expect(md("[x](javascript:alert(1))")).toBe("[x](javascript:alert(1))");
  });

  test("headings, lists, rules and quotes", () => {
    expect(md("## Status\n- one\n  * two\n---\n> quoted\n> more")).toBe(
      "<b>Status</b>\n• one\n  • two\n──────\n<blockquote>quoted\nmore</blockquote>",
    );
  });

  test("raw HTML from the model is escaped, never passed through", () => {
    expect(md('<a href="x">hi</a>')).toBe('&lt;a href="x"&gt;hi&lt;/a&gt;');
  });
});

describe("isParseError", () => {
  test("matches Telegram's formatting refusals only", () => {
    expect(isParseError(new Error("400: Bad Request: can't parse entities: x"))).toBe(true);
    expect(isParseError(new Error("403: Forbidden: bot was blocked by the user"))).toBe(false);
  });
});
