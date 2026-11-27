import { describe, expect, test } from "bun:test";

import {
  balanceFences,
  isParseError,
  markdownToTelegramHtml as md,
  sendFormatted,
} from "../format.ts";

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

describe("markdownToTelegramHtml, literal text", () => {
  test("file names and paths keep their underscores", () => {
    expect(md("edit __init__.py and snake_case, then __bold__ here")).toBe(
      "edit __init__.py and snake_case, then <b>bold</b> here",
    );
    expect(md("see https://x.com/__init__/a_b_c")).toBe("see https://x.com/__init__/a_b_c");
  });

  test("a backslash keeps the next mark literal", () => {
    expect(md("use \\*args\\* here")).toBe("use *args* here");
  });

  test("a one-line fence keeps its first word", () => {
    expect(md("```rm -rf build```")).toBe("<pre>rm -rf build</pre>");
  });

  test("a heading keeps a # that belongs to it, and a spaced rule is a rule", () => {
    expect(md("## Using C#")).toBe("<b>Using C#</b>");
    expect(md("- - -")).toBe("──────");
  });

  test("a link keeps balanced parentheses and a code label", () => {
    expect(md("[wiki](https://en.wikipedia.org/wiki/Foo_(bar)) ok")).toBe(
      '<a href="https://en.wikipedia.org/wiki/Foo_(bar)">wiki</a> ok',
    );
    expect(md("[`npm test`](https://x.y)")).toBe('<a href="https://x.y"><code>npm test</code></a>');
  });
});

describe("balanceFences", () => {
  test("closes a code block cut by a chunk boundary and reopens it", () => {
    expect(balanceFences(["a\n```py\nx=1", "y=2\n```\nend"])).toEqual([
      "a\n```py\nx=1\n```",
      "```py\ny=2\n```\nend",
    ]);
  });

  test("agrees with the converter on one-line and indented blocks", () => {
    expect(balanceFences(["run ```npm test``` now", "next"])).toEqual([
      "run ```npm test``` now",
      "next",
    ]);
    expect(balanceFences(["- step:\n  ```sh\n  make", "  ```\ndone"])).toEqual([
      "- step:\n  ```sh\n  make\n```",
      "```sh\n  ```\ndone",
    ]);
  });
});

describe("sendFormatted", () => {
  test("sends HTML, and the plain text when Telegram refuses the formatting", async () => {
    const calls: [string, string | undefined][] = [];
    const send = async (body: string, mode?: string) => {
      calls.push([body, mode]);
      if (mode === "HTML") throw new Error("400: Bad Request: can't parse entities");
      return 1;
    };
    expect(await sendFormatted("**hi**", "markdown", send)).toBe(1);
    expect(calls).toEqual([
      ["<b>hi</b>", "HTML"],
      ["**hi**", undefined],
    ]);
  });

  test("rethrows any other error", async () => {
    const send = async () => {
      throw new Error("403: Forbidden: bot was blocked by the user");
    };
    await expect(sendFormatted("hi", "markdown", send)).rejects.toThrow("403");
  });
});

describe("isParseError", () => {
  test("matches Telegram's formatting refusals only", () => {
    expect(isParseError(new Error("400: Bad Request: can't parse entities: x"))).toBe(true);
    expect(isParseError(new Error("403: Forbidden: bot was blocked by the user"))).toBe(false);
  });
});
