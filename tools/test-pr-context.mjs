import assert from "node:assert/strict";

import {
  formatPacket,
  parseRepositoryFromURL,
} from "../.agent-skills/critique-pr/scripts/collect-pr-context.mjs";

assert.equal(
  parseRepositoryFromURL("https://github.com/geneyoo/shaba/pull/24"),
  "geneyoo/shaba",
);
assert.equal(parseRepositoryFromURL("https://example.com/nope"), null);

const packet = formatPacket(
  {
    number: 24,
    title: "Add subject-aware filters",
    url: "https://github.com/geneyoo/shaba/pull/24",
    state: "OPEN",
    isDraft: false,
    author: { login: "author" },
    baseRefName: "main",
    headRefName: "feature",
    headRefOid: "0123456789abcdef",
    body: "## Goal\nPreserve identity.",
    commits: [{ oid: "0123456789abcdef", messageHeadline: "feat: add filters", messageBody: "" }],
    files: [{ path: "Sources/Filter.swift", additions: 12, deletions: 2 }],
    labels: [{ name: "review" }],
    reviewDecision: "",
    reviews: [],
    comments: [],
    statusCheckRollup: [{ name: "tests", status: "COMPLETED", conclusion: "SUCCESS" }],
    additions: 12,
    deletions: 2,
    changedFiles: 1,
  },
  {
    root: "/work/designengineer",
    branch: "main",
    repository: "geneyoo/designengineer",
    dirty: " M unrelated.md",
  },
);

assert.match(packet, /Repository mismatch/);
assert.match(packet, /uncommitted changes/);
assert.match(packet, /Preserve identity/);
assert.match(packet, /Sources\/Filter\.swift/);
assert.match(packet, /tests: SUCCESS/);
assert.match(packet, /untrusted review data/);

console.log("pr context packet tests passed");
