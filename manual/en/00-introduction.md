---
created: '2026-03-01'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
---
# OpenCode Chat – Introduction

## What is OpenCode Chat?

OpenCode Chat is an Obsidian plugin that lets you talk to an **AI agent directly from your vault**. The agent has access to your notes and can help you manage, organize, and create content.

---

## Why OpenCode Chat?

### Privacy-first design

Unlike traditional AI chatbots (ChatGPT, Claude web) where your data travels to external servers, **OpenCode Chat runs entirely on your machine**.

**What this means in practice:**

- Your vault files **never leave your PC**
- OpenCode runs on `localhost` — not the public internet
- You decide which notes the agent can read
- Amazon Bedrock EU region (`eu-central-1`) — GDPR compliant
- AWS Bedrock does **not log or store** your prompts or responses
- Full audit trail — every tool the agent used is visible in chat history

### Comparison with alternatives

| Feature | OpenCode Chat | ChatGPT web | Claude web | BMO Chatbot |
|---|---|---|---|---|
| Direct vault access | Yes (via MCP) | No | No | Yes (via API) |
| Data privacy | Local server | Cloud | Cloud | Depends on LLM |
| Offline vault access | Yes | No | No | Yes |
| Streaming responses | Yes (SSE) | Yes | Yes | No |
| Native Obsidian plugin | Yes | No | No | Yes |
| Cost | ~$5-10/month | ~$20/month | ~$20/month | Varies |

---

## What can it do?

### Intelligent vault assistant

```
You: "Find all notes about AI I created this month"
AI:  *Searches vault and lists relevant notes*
```

### Automate repetitive tasks

```
You: "Create a project note from the template for project 'mobile app'"
AI:  *Loads template, fills metadata, creates the note*
```

### Batch tagging and organization

```
You: "Add #status/done to all completed tasks in project XYZ"
AI:  *Finds tasks, adds tags*
```

### Generate reports

```
You: "Based on notes in the project, write a progress summary"
AI:  *Reads notes, creates a markdown report*
```

---

## How it works (architecture)

```
┌─────────────────────────────┐
│   Obsidian Desktop          │  ← You write notes
│   ┌─────────────────────┐  │
│   │ OpenCode Chat Plugin│  │  ← Chat interface
│   └──────────┬──────────┘  │
└──────────────┼──────────────┘
               │ HTTP API (localhost:4096)
               ▼
┌──────────────────────────────┐
│  OpenCode Server (local)     │  ← AI agent engine
└──────────────┬───────────────┘
               │ AWS Bedrock API
               ▼
┌──────────────────────────────┐
│  Amazon Bedrock (EU)         │  ← Claude 3.5 Sonnet/Haiku
│  (GDPR, no data storage)     │
└──────────────┬───────────────┘
               │ MCP Protocol
               ▼
┌──────────────────────────────┐
│  mcp-obsidian                │  ← Vault file access
│  (reads from filesystem)     │
└──────────────┬───────────────┘
               │ Filesystem I/O
               ▼
┌──────────────────────────────┐
│  Your Obsidian Vault         │  ← Notes stay local
└──────────────────────────────┘
```

**Key points:**

- OpenCode runs on your machine (not a cloud service)
- mcp-obsidian reads the vault directly from the filesystem (no HTTP server)
- Amazon Bedrock is only the LLM provider (stateless API, no logging)
- Vault files never leave your PC

---

## Requirements

### Software

- **Obsidian** (desktop app) – https://obsidian.md
- **Node.js 20+**
- **OpenCode** – AI agent platform
- **AWS account** – for Amazon Bedrock (or Ollama for offline)

### Skills

**Minimum:**
- Terminal basics (running commands)
- Editing config files

### Installation time

- First setup: ~30–45 minutes
- Subsequent setups: ~10 minutes

---

## Cost

| Model | Input ($/1M tokens) | Output ($/1M tokens) | Best for |
|---|---|---|---|
| Claude 3.5 Sonnet v2 | $3 | $15 | Complex tasks, code, analysis |
| Claude 3.5 Haiku | $1 | $5 | Simple queries, search |

**Real-world usage:**

- 100–200 messages/day (mix of Sonnet + Haiku): **~$5–10 / month**
- Power user (500+ messages/day): **~$20–30 / month**

**Tip:** Use Haiku for simple tasks (search, tagging) and Sonnet for complex ones (content generation, refactoring).

---

## Privacy and security

### What stays local

- All vault files — never uploaded to the cloud
- OpenCode configuration — stored locally
- Chat history — stored in OpenCode's local session DB
- AWS credentials — stored in `~/.aws/credentials` (file permissions 600)

### What goes over the internet

- Your prompts and responses — sent via AWS Bedrock API
- Note contents — only if you explicitly ask the agent to read them

### How AWS Bedrock handles data

- No logging — Bedrock does not store your prompts or responses
- Stateless API — no data persistence on the AWS side
- GDPR compliant — EU region (`eu-central-1`)
- AWS Terms of Service prohibit using your data for model training

Official docs: https://aws.amazon.com/bedrock/data-protection/

---

## Offline alternative (Ollama)

If you want 100% offline operation:

```bash
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

OpenCode config for Ollama:

```json
{
  "provider": {
    "ollama": {
      "baseUrl": "http://localhost:11434",
      "model": "llama3.2"
    }
  }
}
```

Note: local models are weaker than Claude 3.5 and require a powerful GPU/CPU.

---

## FAQ

**Is this secure?**
Yes. OpenCode runs locally, vault files stay on your PC. Only prompts go via AWS Bedrock (GDPR-compliant, no logging).

**Do I need an AWS account?**
Yes, for Amazon Bedrock. Alternatively use Ollama (local models, offline).

**Does it work offline?**
Partially. OpenCode + mcp-obsidian work offline; the LLM (Bedrock) requires internet. For full offline use Ollama.

**Can I use a different LLM provider?**
Yes. OpenCode supports Anthropic API, OpenAI, Azure, Google Vertex AI, Ollama.

**How much does it cost?**
AWS Bedrock: ~$5–10/month for typical usage. Ollama: free (but requires powerful hardware).

---

**Next:** [[01-installation]] – Step-by-step setup guide
