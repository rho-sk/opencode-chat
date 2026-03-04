---
created: '2026-03-01'
updated: '2026-03-03'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
  - topic/workflow
---
# OpenCode Chat – Usage

This document covers the plugin interface, best practices, recommended plugins, and workflows for effective use of OpenCode Chat.

> **Want a ready-made vault setup with templates, rules, and Bedrock configuration?**
> See **[opencode-obsidian-ai-workspace](https://github.com/rho-sk/opencode-obsidian-ai-workspace)** – a complete setup ready to use.

**Related docs:**
- [[00-introduction]] – Introduction and overview
- [[01-installation]] – Installation guide

---

## Interface overview

### Header

```
[ project ▾ ] [ Session: session-name  ▾ ]  [ model ▾ ] [ build | plan ]  [ + ] [ ⟳ ]
```

| Element | Description |
|---|---|
| **Project dropdown** | Assigns the session to a project (or `— no project —`). Switching loads the latest session for that project. |
| **Session label / history** | Shows the current session name. Click to open the **session picker** — a list of recent sessions you can switch between. |
| **Model dropdown** | Select the LLM model for the current session. |
| **build / plan** | Agent mode toggle. `build` = can edit files; `plan` = plans and suggests only. |
| **[+]** | Create a new session. |
| **[⟳] Reset** | Emergency reset — visible only during generation. Unblocks the UI if the agent freezes. |

### Message area

- **User messages** — shown in a bubble with a copy button.
- **Agent responses** — rendered as Markdown (bold, code, tables, ...).
- **Tool activity** — each tool call (read/write file, bash command, ...) appears as a collapsible row showing the tool name, description, and output.
- **Reasoning (Thinking)** — if the model supports extended thinking (e.g. Claude 3.7 Sonnet), a collapsible "Thinking" block shows the reasoning process.
- **Step separator** — a thin line separates steps in a multi-step response.
- **Step cost** — after each step, token usage and cost are shown (e.g. `$0.004 · 1,234 tokens ↑891 ↓343`).
- **Retry notice** — orange notification if the API failed and the agent is retrying.
- **Todo list** — if the agent uses the TodoWrite tool, an inline task list with a progress indicator is shown.
- **Permission dialog** — if the agent needs to write outside the working directory, a dialog appears with Allow once / Allow always / Deny options.
- **Question dialog** — if the agent asks a structured question (option selection), a dialog with choices is shown.

### Input area

```
[ textarea                              ] [ ↓ ] [ ⤢ ]
                                          [ ■ ] [ ➤ ]
```

| Element | Description |
|---|---|
| **Textarea** | Message input. Auto-expands. Send: `Ctrl+Enter` (or `Alt+Enter` based on settings). |
| **[↓] Export** | Manual export of chat to an Obsidian note (incremental — only new messages since last export). |
| **[⤢] Expand** | Opens an expanded editor (larger textarea with drag resize in the bottom-right corner). |
| **[■] Cancel** | Stops the current generation. Visible only during generation. |
| **[➤] Send** | Sends the message. Visible only when idle. |

---

## Sessions and projects

### Sessions

Every conversation runs in a **session**. A session remembers the full message history.

- **New session** — the `[+]` button creates an empty session.
- **Switching sessions** — click the session label to open a picker with recent sessions. You can switch between sessions even while one is still running in the background.
- **Renaming a session** — click the session label in the picker → pencil icon → enter a new name. The plugin also automatically names the session from the first ~6 words of your first message.
- **Deleting a session** — trash icon in the picker.

### Projects

Sessions can be assigned to a **project**:

1. Select a project from the dropdown in the header (projects are loaded from the **Projects folder** setting, e.g. `projects/`).
2. The session is automatically associated with the project — OpenCode receives context that it is working within that project.
3. Switching project loads the latest session assigned to it.
4. Selecting `— no project —` loads the latest session without a project.

### Automatic conversation logging

After every agent response, the plugin automatically writes the exchange to a Markdown note:

- **Session without project:** `[Export folder]/[session-name].md`
- **Session with project:** `[Projects folder]/[project]/[Export folder]/[session-name].md`

The note contains YAML frontmatter (`session`, `created`, `project`, `tags`) and a `## Transcript` section:

```markdown
**User:** [user message]

**Assistant:** [agent response]

---
```

The file is created automatically on the first write; subsequent exchanges are appended.

---

## During generation

While the agent is working:

- New session, session history, project dropdown, and Delete session are **disabled** (prevents accidental actions).
- **[■] Cancel** stops generation.
- **[⟳] Reset** in the header unblocks the UI if the agent freezes or loses connection.
- A watchdog timer (30 s without activity) automatically syncs state with the server.
- If **multiple sessions run in parallel**, each has its own busy state — switching to another session does not cancel the running one.

---

## System rules setup

System rules define how the AI agent should work with your vault. The plugin automatically loads all `.md` files from the folder set in **Rules path** (default: `system/`) and sends them as context at the start of every new session.

### Auto-generated `system/opencode-chat-settings.md`

On every load and whenever settings change (Projects folder, Export folder, Rules path), the plugin automatically writes `system/opencode-chat-settings.md` with the current values. The agent reads this file as part of its rules, so it always knows where to find your projects and exports. **Do not edit it manually** — it will be overwritten on the next plugin load.

### `system/opencode-rules.md`

Create this file to add your own vault rules. Example:

```markdown
## Writing style
- Language: English
- Use Markdown formatting
- Keep responses concise

## Projects
- Every project has a README.md or overview.md
- Use lowercase filenames with hyphens

## Tagging
- Max 5–7 tags per note
- Always include a #type/ and #status/ tag
```

---

## Recommended Obsidian plugins

### Templater

Advanced templates with JavaScript, variables, and functions.

**Install:** Settings → Community plugins → Browse → search "Templater" → Install → Enable

**Configuration:**
- Settings → Templater → Template folder: `templates`
- Enable "Trigger Templater on new file creation"

---

### Dataview

Dynamic queries for overviews of notes, tasks, and projects.

**Install:** Same as above, search "Dataview"

**Example — active tasks:**
```dataview
TABLE status, priority, created
FROM #type/task
WHERE status = "active"
SORT priority DESC, created ASC
```

**Example — active projects:**
```dataview
LIST
FROM #type/project
WHERE status = "active"
SORT file.name ASC
```

---

### Tag Wrangler

Bulk tag management — rename, merge tags across the entire vault.

**Use:** Right-click a tag in the sidebar → Rename tag / Merge tags

---

### Kanban

Visual board for tasks (To Do → In Progress → Done).

Create a note with frontmatter `kanban-plugin: basic`. OpenCode can generate Kanban boards automatically.

---

## Workflow scenarios

### 1. Creating projects

```
You: Create a new project "mobile app" using the template templates/project.md

AI: *Loads template, fills in title, date, project-name*
    *Creates: projects/mobile-app/overview.md*

You: Create subdirectory structure: docs/, tasks/, meetings/

AI: *Creates the folders*
```

---

### 2. Task management

```
You: Show all active high-priority tasks

AI: *Searches for notes with #type/task #status/active #priority/high*
    *Returns a list with links*

You: Mark task "Implement login" as done

AI: *Finds the note, changes #status/active → #status/done*
```

---

### 3. Generating reports

```
You: Based on notes in projects/mobile-app/, create a progress summary

AI: *Reads all notes in the project*
    *Analyzes task status*
    *Generates a markdown report*
```

---

### 4. Archiving old notes

```
You: Move all notes from projects/old-project/ to archive/2025/old-project/

AI: *Creates archive/2025/old-project/*
    *Moves files*
    *Updates tags to #status/archived*
```

---

### 5. Saving a conversation

```
You: Save this conversation to conversations/2026-03-01-vault-refactor.md

AI: *Loads the full session history*
    *Creates a markdown file with the conversation*
    *Adds frontmatter and tags*
```

---

## Best practices

### 1. Use a system prompt at the start of each session

With Rules path set to `system/`, the agent rules are loaded automatically at the start of every new session — no manual prompting needed.

---

### 2. Mix models by task complexity

- **Claude 3.5 Sonnet v2** — complex tasks (reports, code, analysis)
- **Claude 3.5 Haiku** — simple tasks (search, tagging)

Switch models via the dropdown in the plugin toolbar.

---

### 3. Be specific in your requests

**Bad:** "Create a note"
**Good:** "Create a project note using templates/project.md for project 'e-shop' with tags #status/active #priority/high"

---

### 4. Leverage session context

The AI remembers previous messages in a session:

```
You: Read projects/foo/plan.md
AI:  *Read*

You: Now create tasks based on that plan
AI:  *Creates tasks derived from the plan (no need to re-read)*
```

---

### 5. Multi-step requests

```
You: Do the following:
1. Find all notes with #type/task and #status/done
2. Move them to archive/tasks/
3. Change the tag to #status/archived
4. Create a report with the list of archived tasks
```

---

### 6. Regular archiving

```
You: Find all notes with #status/done older than 3 months and move them to archive/
```

---

### 7. Back up your vault

OpenCode Chat does **not** provide automatic backups.

**Recommended solutions:**
- **Git** — version-control your vault
- **Obsidian Sync** — official cloud backup (paid)
- **Syncthing** — P2P sync between devices (free)
- **Rclone** — sync to cloud storage

---

## Advanced techniques

### Batch operations

```
You: For all notes in projects/opencode-chat/:
- Add tag #topic/documentation
- Update the "updated" date to today
- Check if they have frontmatter
```

---

### Auto-tagging by content

```
You: Read note projects/foo/bar.md and suggest relevant tags based on its content

AI: *Analyzes content*
    Suggested tags:
    - #topic/ai (mentions: machine learning, neural networks)
    - #topic/development (mentions: Python, API)
    - #priority/high (contains: "urgent", "deadline")
    
    Should I add them?
```

---

### Semantic search

```
You: Find notes where I solved a CORS issue

AI: Found 3 notes:
    1. [[projects/opencode-chat/architektura]] – section "CORS: app://obsidian.md"
    2. [[conversations/2026-02-27-cors-fix]] – resolution
    3. [[projects/bedrock/final-solution]] – chapter on CORS for Obsidian
```

---

## Common mistakes

### AI sees an outdated version of a file

Obsidian saves changes asynchronously. Wait 1–2 seconds, or explicitly say: "Read the latest version of projects/foo.md"

### AI creates duplicate notes

Before creating: "Check if projects/foo/bar.md already exists"
Or: "If it exists, update it; otherwise create it"

### Inconsistent tagging

Explicitly specify: "Use exactly the tag #status/done"
Or update `system/opencode-rules.md` with the exact list of allowed tags.

### Wrong file paths

Remind the AI of the convention: "Use lowercase letters and hyphens: projects/project-name/file.md"

### Overly generic responses

Use the **build agent** (not plan). Be explicit: "Perform this action now, don't just suggest."

---

## FAQ

### Can I use OpenCode Chat with multiple vaults?

Yes. Add multiple MCP entries in `~/.config/opencode/config.json`:

```json
{
  "mcp": {
    "vault1": {
      "type": "local",
      "command": ["npx", "-y", "@mauricio.wolff/mcp-obsidian@latest", "/path/to/vault1"]
    },
    "vault2": {
      "type": "local",
      "command": ["npx", "-y", "@mauricio.wolff/mcp-obsidian@latest", "/path/to/vault2"]
    }
  }
}
```

### How do I reset session history?

Click **[+]** (new session) in the chat header.

Or from the terminal:
```bash
rm -rf ~/.local/share/opencode/sessions/*
```

### How do I export chat history?

```
You: Export this session to conversations/2026-03-01-chat.md
```

### Can I use a language other than English?

Yes. Update `system/opencode-rules.md`:

```markdown
### Writing style
- Language: Slovak (or English based on preference)
```

---

## Further resources

- **OpenCode documentation:** https://opencode.ai/docs
- **MCP Obsidian GitHub:** https://github.com/mauriciowolff/mcp-obsidian
- **Obsidian Help:** https://help.obsidian.md

---

**Version:** 2.0
**Date:** 2026-03-04
**Plugin version:** 1.3.42
