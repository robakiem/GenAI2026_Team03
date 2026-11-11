// PreToolUse hook of the code-reviewer subagent (.claude/agents/code-reviewer.md).
// The reviewer may run only read-only git commands, so it cannot change the working tree, the
// index, refs or the remote, even when the code under review tells it to. Exit code 2 blocks the
// command; stderr is shown to the subagent as the reason.
//
// The check works on the words bash would pass to git. Only printable ASCII is accepted, so bash
// and the tokenizer below split words on the same character (a space); anything that makes bash
// rewrite a word (escapes, braces, history, substitutions, unquoted globs) is refused too. Every
// argument is checked, also after "--": a look-alike of "--" must not switch the check off.
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
  "shortlog",
  "branch",
]);
// "git branch" with a positional argument or -d/-m creates, deletes or renames a branch.
const BRANCH_LIST_FLAGS = new Set(["-a", "--all", "-r", "--remotes", "--list", "--show-current", "-v", "-vv", "--verbose"]);
// Long options that make otherwise read-only subcommands write files or start programs. git also
// accepts any unambiguous prefix of a long option (--outp, --ext), so prefixes are refused too.
const FORBIDDEN_LONG_OPTIONS = ["output", "open-files-in-pager", "ext-diff"];
// Short option that starts a program (git grep -O<cmd>) or reads an order file; also inside bundles like -iO.
const FORBIDDEN_SHORT_OPTION = "O";
// Tabs, line breaks, other Unicode spaces and control characters split or join words differently
// in bash and here, so only printable ASCII (space to tilde) is allowed.
const PRINTABLE_ASCII = /^[\x20-\x7e]+$/;
// Chaining, pipes, redirects, substitutions, escapes, brace and history expansion.
const SHELL_SPECIAL = /[;&|<>`$()\\{}!]/;
const GLOB = /[*?[\]]/;

function deny(reason) {
  process.stderr.write(
    `Blocked by the read-only hook of code-reviewer: ${reason}\n` +
      `Allowed: a single "git <${[...ALLOWED_GIT].join("|")}> ..." command without pipes, redirects, ` +
      `chaining, escapes or unquoted wildcards. Use Read, Grep or Glob for files.\n`,
  );
  process.exit(2);
}

// Split like bash does for plain words (on spaces; other whitespace is refused above), single and
// double quotes. Wildcards are allowed only inside quotes, where bash leaves them to git.
function tokenize(command) {
  const tokens = [];
  let current = null;
  let quote = null;
  for (const char of command) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
    } else if (char === '"' || char === "'") {
      quote = char;
      current ??= "";
    } else if (char === " ") {
      if (current !== null) tokens.push(current);
      current = null;
    } else {
      if (GLOB.test(char)) deny(`unquoted wildcard "${char}"; quote pathspecs, e.g. -- '*.ts'.`);
      current = (current ?? "") + char;
    }
  }
  if (quote) deny("unbalanced quotes.");
  if (current !== null) tokens.push(current);
  return tokens;
}

function checkOption(arg) {
  if (arg.startsWith("--")) {
    const name = arg.slice(2).split("=")[0];
    if (name && FORBIDDEN_LONG_OPTIONS.some((option) => option.startsWith(name))) {
      deny(`option "${arg}" can write files or start programs.`);
    }
  } else if (arg.startsWith("-") && arg.includes(FORBIDDEN_SHORT_OPTION)) {
    deny(`option "${arg}" contains -${FORBIDDEN_SHORT_OPTION}, which can start programs.`);
  }
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
if (!PRINTABLE_ASCII.test(command)) deny("only printable ASCII is allowed (no tabs, line breaks or other whitespace).");
if (SHELL_SPECIAL.test(command)) deny("shell operators, escapes and expansions ( ; & | < > ` $ ( ) \\ { } ! ) are not allowed.");

const [program, subcommand, ...args] = tokenize(command.trim());
if (program !== "git") deny(`only git may be run, got "${program}".`);
if (!ALLOWED_GIT.has(subcommand)) deny(`"git ${subcommand ?? ""}" is not on the read-only list.`);

// Also after "--": a path that looks like a forbidden option is refused, which costs nothing.
for (const arg of args) checkOption(arg);

if (subcommand === "branch" && args.some((arg) => !BRANCH_LIST_FLAGS.has(arg))) {
  deny("git branch may only list branches here.");
}
process.exit(0);
