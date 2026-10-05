// Legacy npm can ignore devEngines; reject it before a repository command runs.
const npmMajor = Number(/^npm\/(\d+)/u.exec(process.env.npm_config_user_agent ?? "")?.[1]);

if (!Number.isInteger(npmMajor) || npmMajor < 11) {
  console.error("Open Prep requires Node.js 24.19.0+ within Node 24 and npm 11.17.0+ within npm 11. Install the versions pinned in .node-version and package.json, then reopen the terminal.");
  process.exitCode = 1;
}
