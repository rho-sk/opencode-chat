---
created: '2026-03-01'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
  - topic/workflow
---
# OpenCode Chat – Usage

This document covers best practices, recommended plugins, and workflows for effective use of OpenCode Chat.

> **Want a ready-made vault setup with templates, rules, and Bedrock configuration?**
> See **[opencode-obsidian-ai-workspace](https://github.com/rho-sk/opencode-obsidian-ai-workspace)** – a complete setup ready to use.

**Related docs:**
- [[00-introduction]] – Introduction and overview
- [[01-installation]] – Installation guide

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

```
Read the rules from system/opencode-rules.md and follow them for all vault operations
```

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

**Version:** 1.1
**Date:** 2026-03-01
**Plugin version:** 1.3.21
