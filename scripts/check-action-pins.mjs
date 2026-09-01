import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const suppliedFiles = process.argv.slice(2);
const files = suppliedFiles.length > 0
  ? suppliedFiles.map((file) => path.resolve(file))
  : await workflowFiles(path.join(projectRoot, ".github", "workflows"));
const findings = [];

for (const file of files) {
  const contents = await readFile(file, "utf8");
  const displayPath = path.relative(projectRoot, file).replaceAll(path.sep, "/");

  contents.split(/\r?\n/u).forEach((line, index) => {
    const match = line.trim().match(/^(?:-\s*)?uses\s*:\s*(.+)$/u);
    if (match === null) return;

    const [rawReference, ...commentParts] = match[1].split(/\s+#\s*/u);
    const reference = rawReference.trim().replace(/^(['"])(.*)\1$/u, "$2");
    if (reference.startsWith("./")) return;

    const separator = reference.lastIndexOf("@");
    const revision = separator === -1 ? "" : reference.slice(separator + 1);
    const comment = commentParts.join(" # ").trim();

    if (!/^[a-f0-9]{40}$/u.test(revision)) {
      findings.push(`${displayPath}:${index + 1} ${reference} must use a full 40-character commit SHA.`);
    }
    if (!/\bv\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?\b/u.test(comment)) {
      findings.push(`${displayPath}:${index + 1} ${reference} needs an inline release-version comment.`);
    }
  });
}

if (findings.length > 0) {
  console.error("Mutable or undocumented GitHub Action references:");
  findings.forEach((finding) => console.error(finding));
  process.exitCode = 1;
} else {
  console.log(`GitHub Action pin check passed (${files.length} workflow file${files.length === 1 ? "" : "s"} checked).`);
}

async function workflowFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await workflowFiles(entryPath));
    } else if (/\.ya?ml$/iu.test(entry.name)) {
      files.push(entryPath);
    }
  }

  return files.toSorted();
}
