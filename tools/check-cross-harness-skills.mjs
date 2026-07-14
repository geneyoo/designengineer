import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import yaml from "js-yaml";

const repoRoot = process.cwd();
const canonicalRoot = path.join(repoRoot, ".agent-skills");
const allowedFrontmatter = new Set(["name", "description"]);
const errors = [];

function fail(message) {
  errors.push(message);
}

function parseFrontmatter(file) {
  const content = fs.readFileSync(file, "utf8");
  const match = /^---\n([\s\S]*?)\n---\n/.exec(content);
  if (!match) {
    fail(`${path.relative(repoRoot, file)}: missing YAML frontmatter`);
    return null;
  }
  try {
    return yaml.load(match[1]);
  } catch (error) {
    fail(`${path.relative(repoRoot, file)}: invalid YAML (${error.message})`);
    return null;
  }
}

if (!fs.existsSync(canonicalRoot)) {
  fail(".agent-skills: canonical cross-harness skill directory is missing");
} else {
  const skills = fs
    .readdirSync(canonicalRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  if (!skills.length) fail(".agent-skills: no skills found");

  for (const skillName of skills) {
    const canonical = path.join(canonicalRoot, skillName);
    const skillFile = path.join(canonical, "SKILL.md");
    if (!fs.existsSync(skillFile)) {
      fail(`.agent-skills/${skillName}: SKILL.md is missing`);
      continue;
    }

    const frontmatter = parseFrontmatter(skillFile);
    if (frontmatter) {
      const keys = Object.keys(frontmatter);
      const unsupported = keys.filter((key) => !allowedFrontmatter.has(key));
      if (unsupported.length) {
        fail(
          `.agent-skills/${skillName}/SKILL.md: non-portable frontmatter: ${unsupported.join(", ")}`,
        );
      }
      if (frontmatter.name !== skillName) {
        fail(`.agent-skills/${skillName}/SKILL.md: name must match its directory`);
      }
      if (typeof frontmatter.description !== "string" || !frontmatter.description.trim()) {
        fail(`.agent-skills/${skillName}/SKILL.md: description must be a non-empty string`);
      }
    }

    for (const harness of [".agents", ".claude"]) {
      const entry = path.join(repoRoot, harness, "skills", skillName);
      if (!fs.existsSync(entry)) {
        fail(`${path.relative(repoRoot, entry)}: discovery entry is missing`);
        continue;
      }
      const stat = fs.lstatSync(entry);
      if (!stat.isSymbolicLink()) {
        fail(`${path.relative(repoRoot, entry)}: must be a symlink to the canonical skill`);
        continue;
      }
      if (fs.realpathSync(entry) !== fs.realpathSync(canonical)) {
        fail(`${path.relative(repoRoot, entry)}: does not resolve to .agent-skills/${skillName}`);
      }
    }
  }
}

if (errors.length) {
  console.error("cross-harness skill check failed:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log("cross-harness skill check passed");
