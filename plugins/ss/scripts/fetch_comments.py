#!/usr/bin/env python3
"""
Fetch all PR conversation comments + reviews + review threads (inline threads)
for the PR associated with the current git branch, by shelling out to:

  gh api graphql

The PR number belongs to the base repository (the one the PR was opened against),
so owner and name are read from the PR's URL, never from the head repository: for
a PR from a fork the head repo has no such PR.

Requires:
  - `gh auth login` already set up
  - a PR URL or number as the first argument, or a current branch with an associated PR

Usage:
  python fetch_comments.py > pr_comments.json            # PR of the current branch
  python fetch_comments.py PR_URL > pr_comments.json     # any PR, by URL or number
"""

from __future__ import annotations

import json
import subprocess
import sys
from typing import Any
from urllib.parse import urlparse

QUERY = """\
query(
  $owner: String!,
  $repo: String!,
  $number: Int!,
  $commentsCursor: String,
  $reviewsCursor: String,
  $threadsCursor: String
) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $number) {
      number
      url
      title
      state

      # Top-level "Conversation" comments (issue comments on the PR)
      comments(first: 100, after: $commentsCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          body
          createdAt
          updatedAt
          author { login }
        }
      }

      # Review submissions (Approve / Request changes / Comment), with body if present
      reviews(first: 100, after: $reviewsCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          state
          body
          submittedAt
          author { login }
        }
      }

      # Inline review threads (grouped), includes resolved state
      reviewThreads(first: 100, after: $threadsCursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          isResolved
          isOutdated
          path
          line
          diffSide
          startLine
          startDiffSide
          originalLine
          originalStartLine
          resolvedBy { login }
          comments(first: 100) {
            nodes {
              id
              body
              createdAt
              updatedAt
              author { login }
            }
          }
        }
      }
    }
  }
}
"""


def _run(cmd: list[str], stdin: str | None = None) -> str:
    p = subprocess.run(cmd, input=stdin, capture_output=True, text=True)
    if p.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{p.stderr}")
    return p.stdout


def _run_json(cmd: list[str], stdin: str | None = None) -> dict[str, Any]:
    out = _run(cmd, stdin=stdin)
    try:
        return json.loads(out)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Failed to parse JSON from command output: {e}\nRaw:\n{out}") from e


def _ensure_gh_authenticated() -> None:
    try:
        _run(["gh", "auth", "status"])
    except RuntimeError:
        print("run `gh auth login` to authenticate the GitHub CLI", file=sys.stderr)
        raise RuntimeError("gh auth status failed; run `gh auth login` to authenticate the GitHub CLI") from None


def gh_pr_view_json(fields: str, pr: str | None = None) -> dict[str, Any]:
    # fields is a comma-separated list like: "number,url"; pr is a number or URL, or
    # None for the PR of the current branch.
    cmd = ["gh", "pr", "view"] + ([pr] if pr else []) + ["--json", fields]
    return _run_json(cmd)


def get_current_pr_ref(pr_arg: str | None = None) -> tuple[str, str, int, str | None]:
    """
    Resolve the PR given as a URL or number, else the PR for the current branch
    (whatever gh considers associated). Pass the URL to read a PR whose branch is not
    checked out here, such as one a /ss:babysit watcher follows.

    Host, owner and repo come from the PR URL (`https://HOST/OWNER/REPO/pull/N`), which
    always names the base repository the number belongs to, on its own host (a GitHub
    Enterprise URL must not be queried on github.com). For a PR from a fork,
    `headRepository` is the fork, where that number is some other PR or none.
    """
    pr = gh_pr_view_json("number,url", pr_arg)
    number = int(pr["number"])
    parsed = urlparse(pr["url"])
    parts = parsed.path.strip("/").split("/")
    if len(parts) < 4 or parts[2] != "pull":
        raise RuntimeError(f"Unexpected PR URL shape: {pr['url']}")
    owner, repo = parts[0], parts[1]
    return owner, repo, number, parsed.hostname


def gh_api_graphql(
    owner: str,
    repo: str,
    number: int,
    comments_cursor: str | None = None,
    reviews_cursor: str | None = None,
    threads_cursor: str | None = None,
    host: str | None = None,
) -> dict[str, Any]:
    """
    Call `gh api graphql` with one variable per flag, avoiding JSON blobs with nulls.
    Query is passed via stdin using query=@- to avoid shell newline/quoting issues.

    Strings go through `-f` (raw): `-F` reads an `@`-prefixed value from a file and
    converts `true`, `false`, `null` and digits. Only `query=@-` and the integer
    `number` use `-F`.
    """
    cmd = [
        "gh",
        "api",
        "graphql",
    ]
    if host:
        cmd += ["--hostname", host]
    cmd += [
        "-F",
        "query=@-",
        "-f",
        f"owner={owner}",
        "-f",
        f"repo={repo}",
        "-F",
        f"number={int(number)}",
    ]
    if comments_cursor:
        cmd += ["-f", f"commentsCursor={comments_cursor}"]
    if reviews_cursor:
        cmd += ["-f", f"reviewsCursor={reviews_cursor}"]
    if threads_cursor:
        cmd += ["-f", f"threadsCursor={threads_cursor}"]

    return _run_json(cmd, stdin=QUERY)


def fetch_all(owner: str, repo: str, number: int, host: str | None = None) -> dict[str, Any]:
    conversation_comments: list[dict[str, Any]] = []
    reviews: list[dict[str, Any]] = []
    review_threads: list[dict[str, Any]] = []

    comments_cursor: str | None = None
    reviews_cursor: str | None = None
    threads_cursor: str | None = None

    pr_meta: dict[str, Any] | None = None

    while True:
        payload = gh_api_graphql(
            owner=owner,
            repo=repo,
            number=number,
            comments_cursor=comments_cursor,
            reviews_cursor=reviews_cursor,
            threads_cursor=threads_cursor,
            host=host,
        )

        if "errors" in payload and payload["errors"]:
            raise RuntimeError(f"GitHub GraphQL errors:\n{json.dumps(payload['errors'], indent=2)}")

        pr = payload["data"]["repository"]["pullRequest"]
        if pr_meta is None:
            pr_meta = {
                "number": pr["number"],
                "url": pr["url"],
                "title": pr["title"],
                "state": pr["state"],
                "owner": owner,
                "repo": repo,
            }

        c = pr["comments"]
        r = pr["reviews"]
        t = pr["reviewThreads"]

        conversation_comments.extend(c.get("nodes") or [])
        reviews.extend(r.get("nodes") or [])
        review_threads.extend(t.get("nodes") or [])

        comments_cursor = c["pageInfo"]["endCursor"] if c["pageInfo"]["hasNextPage"] else None
        reviews_cursor = r["pageInfo"]["endCursor"] if r["pageInfo"]["hasNextPage"] else None
        threads_cursor = t["pageInfo"]["endCursor"] if t["pageInfo"]["hasNextPage"] else None

        if not (comments_cursor or reviews_cursor or threads_cursor):
            break

    assert pr_meta is not None
    return {
        "pull_request": pr_meta,
        "conversation_comments": conversation_comments,
        "reviews": reviews,
        "review_threads": review_threads,
    }


def main() -> None:
    _ensure_gh_authenticated()
    owner, repo, number, host = get_current_pr_ref(sys.argv[1] if len(sys.argv) > 1 else None)
    result = fetch_all(owner, repo, number, host)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
