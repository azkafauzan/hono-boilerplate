---

name: agents-md
description: Create or update an AGENTS.md file (instructions for AI coding agents) from the user's free-text description of a project's tech stack, rules, conventions, architecture, or folder structure. Use this whenever the user asks to create, generate, write, or update an "agents.md" / "AGENTS.md" file, mentions @AGENTS.md alongside a change request (e.g. change the architecture, add or replace a stack item, add a rule), asks for "instructions for AI agents", or describes project rules and wants them turned into an agent-instructions file, even if they don't say the filename explicitly (e.g. "buatkan aturan buat AI coding assistant", "update agents.md, stack backend ganti ke Hono", "bikin file instruksi untuk Claude Code/Cursor"). Always trigger on explicit mentions of AGENTS.md, agents.md, or CLAUDE.md-style agent instruction files.
---

# AGENTS.md

Turns what the user tells you about their project into a clean, structured
`AGENTS.md` written in English, and keeps it up to date when the project
changes. The skill has two modes (create and update) and two delivery
channels (agent environment and chat). Pick both before doing anything.

## Step 1: Pick the mode

- **Create mode**: no existing AGENTS.md is involved. The user describes a
  project and wants a new file.
- **Update mode**: an existing AGENTS.md is involved. Signals are an
  `@AGENTS.md` mention, an attached or pasted AGENTS.md, a file named
  AGENTS.md already present in the repo, or wording like "update", "ganti",
  "tambah", "ubah" aimed at the file. The user's message is the _change
  instruction_ (e.g. switch architecture, add or replace a stack item, add a
  rule, drop a rule).

If it is unclear which mode applies, ask one short question.

## Step 2: Pick the delivery channel

- **Agent environment** (Claude Code, Cursor, or any setup where you can read
  and edit files in the user's repo): write the result **directly into the
  file**. Do not print the whole file as a code block. After editing, reply
  with a short summary of what changed (a few bullets at most).
  - Create mode: create `AGENTS.md` at the repo root (or the path the user
    gave).
  - Update mode: edit the mentioned/existing file in place, using targeted
    edits rather than rewriting the whole file.
- **Generative chat** (no file access): return the result as a **single
  markdown code block** (` ```markdown ... ``` `). Never produce an HTML page,
  artifact, or downloadable file unless the user explicitly asks for one.
  - Update mode: return the **full updated file** in the code block, then
    add a brief "what changed" list below it. If the user pasted the old
    file, work from the pasted text; if they did not provide it, ask them to
    paste it.

## Step 3a: Create mode

### Interview or generate directly

- If the message already has concrete detail (a stack and at least one or two
  rules or conventions), generate directly with no questions.
- If it is thin or vague, do one **short** interview (max 3-4 questions in a
  single message) covering:
  1. Tech stack / framework(s)
  2. Key rules or conventions the agent must follow
  3. Anything else worth telling an agent (folder structure, env setup,
     things to avoid, deployment notes)
- If the user answers partially or says to skip, generate with what you have
  and state any assumption in one line outside the file content.
- One round of questions is the ceiling unless the answer exposes a real new
  ambiguity.

### Structure

```markdown
## Overview

<1-3 sentences: what the project is and that this file instructs AI coding
agents working in this repo>

## <Section Title, e.g. Tech Stack>

...

## <Section Title, e.g. Rules>

...
```

- `## Overview` is **mandatory** and always first.
- There is no fixed list of other sections. Derive section titles and count
  from what the user actually said. Typical ones (only when the user gave
  content for them) are Tech Stack, Rules / Conventions, Project Structure,
  Setup / Environment, Testing, Commit / Workflow, Things to Avoid. Never
  invent a section with no real content, and never force the user to choose
  from a preset list.
- Use concise bullets for discrete rules and short prose for Overview.

## Step 3b: Update mode

1. **Read the whole existing file first.** Understand its sections before
   changing anything.
2. **Interpret the user's instruction** as one or more changes: replace,
   add, remove, or restructure.
3. **Ask before guessing** if the instruction is too ambiguous to apply
   safely (e.g. "ganti architecture" with no target, or a change that would
   delete a lot of content). One short question, then proceed.
4. **Apply the change with minimal blast radius:**
   - Keep every untouched section and line exactly as it was (wording,
     order, formatting).
   - Propagate the change everywhere it matters. If a stack item is
     replaced, also fix rules, folder structure, setup commands, and testing
     notes that refer to the old item so the file does not contradict itself.
   - Update `## Overview` if the change alters what the project is or how
     it is built. Overview stays first.
   - Add a new section only when the change introduces a topic with no home
     yet. Remove content that the change makes obsolete.
   - If the new instruction conflicts with an existing rule, follow the
     user's new instruction, replace the old rule, and mention it in the
     change summary.
5. **Deliver** through the channel from Step 2, with a short list of what
   changed.

## Writing rules (both modes)

- Write the file content in **English**, even when the user speaks
  Indonesian or another language. Translate and rephrase into clear,
  unambiguous instructions.
- Phrase instructions as direct directives an agent must follow ("Always use
  TypeScript strict mode.", "Never use `any`.", "Run `bun test` before
  committing.") rather than passive descriptions.
- Do not paste the user's wording verbatim. Organize and sharpen it.
- Conversation around the file (questions, change summaries, assumptions)
  follows the user's language; the file itself stays English.
