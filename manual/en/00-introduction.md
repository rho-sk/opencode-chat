---
created: '2026-03-01'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
updated: '2026-03-01'
---
# OpenCode Chat – Introduction

## What is OpenCode Chat?

OpenCode Chat is an Obsidian plugin that lets you talk to an **AI agent directly from your vault**. The agent has access to your notes and can help you manage, organize, and create content.

The plugin is **provider-agnostic** – it works with any LLM provider supported by OpenCode (Amazon Bedrock, Ollama, Anthropic API, OpenAI, and more). The only mandatory component is **MCP vault access** via `mcp-obsidian`.

> **Want a specific setup with Amazon Bedrock + vault guidelines?**
> See **[opencode-obsidian-ai-workspace](https://github.com/rho-sk/opencode-obsidian-ai-workspace)** on GitHub – it includes a complete Bedrock setup, system rules, and templates.

---

## Why OpenCode Chat?

### Your vault stays local – always

Unlike traditional AI chatbots (ChatGPT, Claude web) where your data travels to external servers, **OpenCode Chat runs entirely on your machine**.

**What this means in practice:**

- Your vault files **never leave your PC**
- OpenCode runs on `localhost` — not the public internet
- You decide which notes the agent can read
- Full audit trail — every tool the agent used is visible in chat history

**What goes over the internet depends on the LLM provider you choose:**
- **Amazon Bedrock** – GDPR compliant, EU region, no logging *(recommended for privacy)*
- **Ollama** – fully offline, no internet required
- **Anthropic API / OpenAI** – data goes through their servers (check their terms)

### Comparison with alternatives

| Feature | OpenCode Chat | ChatGPT web | Claude web | BMO Chatbot |
|---|---|---|---|---|
| Direct vault access | Yes (via MCP) | No | No | Yes (via API) |
| Vault files stay local | Always | No (cloud) | No (cloud) | Yes |
| Choice of LLM provider | Any supported | OpenAI only | Anthropic only | Limited |
| Offline vault access | Yes | No | No | Yes |
| Streaming responses | Yes (SSE) | Yes | Yes | No |
| Native Obsidian plugin | Yes | No | No | Yes |
| Cost | Depends on provider | ~$20/month | ~$20/month | Varies |

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
│   ┌─────────────────────┐   │
│   │ OpenCode Chat Plugin│   │  ← Chat interface
│   └──────────┬──────────┘   │
└──────────────┼───────────────┘
               │ HTTP API (localhost:4096)
               ▼
┌──────────────────────────────┐
│  OpenCode Server (local)     │  ← AI agent engine
└──────────────┬───────────────┘
               │ LLM Provider API (configurable)
               ▼
┌──────────────────────────────┐
│  LLM Provider                │  ← e.g. Amazon Bedrock, Ollama,
│                              │      Anthropic API, OpenAI, ...
└──────────────┬───────────────┘
               │ MCP Protocol (required)
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
- Vault files never leave your PC
- The LLM provider is configurable – switch by changing OpenCode config

---

## Requirements

### Software

- **Obsidian** (desktop app) – https://obsidian.md
- **Node.js 20+**
- **OpenCode** – AI agent platform
- **LLM provider** – AWS account (Bedrock), Ollama for offline, or another provider

### Skills

**Minimum:**
- Terminal basics (running commands)
- Editing config files

### Installation time

- First setup: ~30–45 minutes
- Subsequent setups: ~10 minutes

---

## Cost

Depends on the LLM provider:

| Provider | Cost | Notes |
|---|---|---|
| Amazon Bedrock | ~$5–10/month | Recommended – privacy, GDPR, EU region |
| Ollama | Free | Fully offline, weaker models, higher HW requirements |
| Anthropic API | ~$5–15/month | Direct Anthropic account |
| OpenAI API | ~$5–20/month | GPT models |

---

## Privacy and security

### What stays local — always (regardless of provider)

- All vault files — never uploaded to the cloud
- OpenCode configuration — stored locally
- Chat history — stored in OpenCode's local session DB

### What goes over the internet

Depends on the LLM provider. **Recommended for maximum privacy: Amazon Bedrock**
- No logging, stateless API, GDPR compliant, EU region (`eu-central-1`)
- AWS Terms of Service prohibit using your data for model training
- Official docs: https://aws.amazon.com/bedrock/data-protection/

For a complete Bedrock setup, see: **[opencode-obsidian-ai-workspace](https://github.com/rho-sk/opencode-obsidian-ai-workspace)**

### Offline alternative (Ollama)

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
Vault files always stay on your PC. What goes over the internet depends on the LLM provider. For maximum privacy use Amazon Bedrock or Ollama.

**Do I need an AWS account?**
Only if using Amazon Bedrock. You can also use Ollama (offline), Anthropic API, OpenAI, or other providers.

**Does it work offline?**
Depends on the LLM provider. With Ollama – fully offline. With cloud providers (Bedrock, Anthropic, OpenAI) – internet required for LLM calls. OpenCode server and mcp-obsidian always run locally.

**Can I use a different LLM provider?**
Yes. OpenCode supports Amazon Bedrock, Anthropic API, OpenAI, Azure, Google Vertex AI, Ollama, and more.

**How much does it cost?**
Depends on the provider. Amazon Bedrock ~$5–10/month for typical usage. Ollama is free (but requires powerful hardware).

---

**Next:** [[01-installation]] – Step-by-step setup guide
