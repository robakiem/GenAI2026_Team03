// PreToolUse hook of the code-reviewer subagent (.claude/agents/code-reviewer.md).
// The reviewer may run only read-only git commands, so it cannot change the working tree, the
// index, refs or the remote, even by mistake. Exit code 2 blocks the command; stderr is shown
// to the subagent as the reason.
import process from "node:process";

const ALLOWED_GIT = new Set([
  "diff",
  "log",
  "show",
  "status",
  "rev-parse",
  "merge-base",
  "ls-files",
  "ls-tree",
  "blame",
  "grep",
  "shortlog",
  "branch",
]);
// "git branch" with a positional argument or -d/-m creates, deletes or renames a branch.
const BRANCH_LIST_FLAGS = new Set(["-a", "--all", "-r", "--remotes", "--list", "--show-current", "-v", "-vv", "--verbose"]);
// Options that make otherwise read-only subcommands write files or start external programs.
const FORBIDDEN_OPTIONS = [/^--output(=|$)/, /^-O/, /^--open-files-in-pager/, /^--ext-diff$/];
// Chaining, pipes, redirects and substitutions could smuggle in a second command.
const SHELL_OPERATORS = /[;&|<>`$()\r\n]/;

function deny(reason) {
  process.stderr.write(
    `Blocked by the read-only hook of code-reviewer: ${reason}\n` +
      `Allowed: a single "git <${[...ALLOWED_GIT].join("|")}> ..." command without pipes, redirects or chaining. ` +
      `Use Read, Grep or Glob for files.\n`,
  );
  process.exit(2);
}

function tokenize(command) {
  const tokens = [];
  let current = "";
  let quote = null;
  for (const char of command) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (/\s/.test(char)) {
      if (current) tokens.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (quote) deny("unbalanced quotes.");
  if (current) tokens.push(current);
  return tokens;
}

let raw = "";
for await (const chunk of process.stdin) raw += chunk;

let command;
try {
  command = JSON.parse(raw).tool_input?.command;
} catch {
  deny("the hook input is not valid JSON.");
}
if (typeof command !== "string" || command.trim() === "") deny("empty command.");
if (SHELL_OPERATORS.test(command)) deny("shell operators ; & | < > ` $ ( ) and line breaks are not allowed.");

const [program, subcommand, ...args] = tokenize(command.trim());
if (program !== "git") deny(`only git may be run, got "${program}".`);
if (!ALLOWED_GIT.has(subcommand)) deny(`"git ${subcommand ?? ""}" is not on the read-only list.`);
const forbidden = args.find((arg) => FORBIDDEN_OPTIONS.some((pattern) => pattern.test(arg)));
if (forbidden) deny(`option "${forbidden}" can write files or start programs.`);
if (subcommand === "branch" && args.some((arg) => !BRANCH_LIST_FLAGS.has(arg))) {
  deny("git branch may only list branches here.");
}
process.exit(0);
