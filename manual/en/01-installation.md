---
created: '2026-03-01'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
  - topic/installation
updated: '2026-03-01'
---
# OpenCode Chat – Installation

This guide walks you through a complete installation of OpenCode Chat from scratch to a working system.

**Estimated time:** 30–45 minutes

**Related docs:**
- [[00-introduction]] – Introduction and overview
- [[02-usage]] – Usage and best practices

---

## Prerequisites

Before starting, verify you have:

- **Obsidian desktop** (https://obsidian.md) – version 1.0.0+
- **Terminal access** (Linux/macOS: Terminal, Windows: PowerShell)
- **Admin rights** (for installing Node.js)
- **LLM provider** – AWS account (Bedrock), Ollama for offline, Anthropic API, or other

---

## Step 1: Install Node.js

Node.js is required for OpenCode and mcp-obsidian.

### Linux (Debian/Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version   # v20.x.x
npm --version    # 10.x.x
```

### macOS

```bash
brew install node@20

# Verify
node --version
npm --version
```

### Windows

1. Download the installer from [nodejs.org](https://nodejs.org/en/download/) (choose LTS)
2. Run the installer, confirm all default settings
3. Restart PowerShell and verify:

```powershell
node --version
npm --version
```

**Checkpoint:** You should see version numbers like `v20.11.0`.

---

## Step 2: Install OpenCode

```bash
npm install -g opencode-ai
```

Verify:

```bash
opencode --version
# opencode version 1.x.x
```

---

## Step 3: Configure LLM provider

OpenCode supports multiple LLM providers. Choose based on your requirements:

| Provider | Best for | Cost |
|---|---|---|
| **Amazon Bedrock** | Maximum privacy, GDPR | ~$5–10/month |
| **Ollama** | Fully offline, no cloud | Free (higher HW requirements) |
| **Anthropic API** | Direct Claude access | ~$5–15/month |
| **OpenAI** | GPT models | ~$5–20/month |

### 3.1 Configure via `opencode auth login` (Bedrock, Anthropic, OpenAI)

```bash
opencode auth login
```

OpenCode shows a list of providers — select yours and enter the API key.

**For Amazon Bedrock:** You need an AWS account with Bedrock access enabled.
> Complete Bedrock setup including IAM, region, and GDPR: see **opencode-obsidian-ai-workspace** – `manual/en/02-bedrock-setup.md`

**For Anthropic API / OpenAI:** Enter the API key directly in `opencode auth login`.

### 3.2 Configure Ollama (offline)

```bash
# Install Ollama
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

OpenCode config (`~/.config/opencode/config.json`):

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

**Checkpoint:** OpenCode is configured for your chosen LLM provider.

---

## Step 4: Install and configure MCP (vault access)

MCP (Model Context Protocol) allows OpenCode to read and write files in your Obsidian vault. We use the `@mauricio.wolff/mcp-obsidian` package.

### 4.1 Install mcp-obsidian

```bash
npm install -g @mauricio.wolff/mcp-obsidian
```

Verify:

```bash
npx @mauricio.wolff/mcp-obsidian --version
```

> **Alternative without global install:** You can use `npx -y @mauricio.wolff/mcp-obsidian@latest` directly in the config — `npx` downloads the package automatically each time OpenCode starts. A global install is faster (no download on startup).

### 4.2 Find your vault path

**Linux/macOS:**
```bash
# Example: /home/yourname/Documents/obsidian/my-vault
```

**Windows PowerShell:**
```powershell
# Example: C:\Users\yourname\Documents\obsidian\my-vault
```

### 4.3 Add MCP configuration

Edit `~/.config/opencode/config.json`:

```json
{
  "mcp": {
    "obsidian": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@mauricio.wolff/mcp-obsidian@latest",
        "/PATH/TO/YOUR/VAULT"
      ]
    }
  }
}
```

Replace `/PATH/TO/YOUR/VAULT` with your actual vault path:
- Linux: `/home/jan/Documents/obsidian/work`
- macOS: `/Users/jan/Documents/obsidian/work`
- Windows: `C:/Users/jan/Documents/obsidian/work` (use `/`, not `\`)

### 4.4 Verify MCP

```bash
npx -y @mauricio.wolff/mcp-obsidian@latest /PATH/TO/VAULT
```

The process should run without errors. Stop it with `Ctrl+C`.

**Checkpoint:** MCP is configured and functional.

---

## Step 5: Run OpenCode as a background service

### Linux (systemd)

Create a service file:

```bash
mkdir -p ~/.config/systemd/user
nano ~/.config/systemd/user/opencode-web.service
```

Content:

```ini
[Unit]
Description=OpenCode Web Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/PATH/TO/YOUR/VAULT
ExecStart=/usr/bin/opencode web --port 4096 --hostname 0.0.0.0 --cors app://obsidian.md --cors capacitor://localhost --cors http://localhost
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Check the OpenCode path first:
```bash
which opencode
# /usr/bin/opencode or /usr/local/bin/opencode
```

Enable and start:

```bash
loginctl enable-linger $USER
systemctl --user daemon-reload
systemctl --user enable opencode-web
systemctl --user start opencode-web
```

Verify:

```bash
systemctl --user status opencode-web
curl http://localhost:4096/global/health
# {"healthy":true,"version":"1.x.x"}
```

### macOS (launchd)

Create a plist file:

```bash
nano ~/Library/LaunchAgents/com.opencode.web.plist
```

Content:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.opencode.web</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/opencode</string>
        <string>web</string>
        <string>--port</string>
        <string>4096</string>
        <string>--hostname</string>
        <string>0.0.0.0</string>
        <string>--cors</string>
        <string>app://obsidian.md</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/opencode-web.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/opencode-web-error.log</string>
</dict>
</plist>
```

Load the service:

```bash
launchctl load ~/Library/LaunchAgents/com.opencode.web.plist
launchctl start com.opencode.web
```

Verify:
```bash
curl http://localhost:4096/global/health
```

### Windows (manual start)

Create `start-opencode.bat`:

```bat
@echo off
opencode web --port 4096 --hostname 0.0.0.0 --cors app://obsidian.md
pause
```

Place it in the **Startup** folder:
- Press `Win+R`, type `shell:startup`, copy the file there

Or run manually in PowerShell:
```powershell
opencode web --port 4096 --hostname 0.0.0.0 --cors app://obsidian.md
```

**Checkpoint:** OpenCode server is running and responding at `http://localhost:4096/global/health`.

---

## Step 6: Install the OpenCode Chat plugin

### 6.1 Download the plugin

The plugin is distributed as a ZIP file. Get the latest release from the GitHub releases page.

### 6.2 Extract to vault plugins folder

**Linux/macOS:**
```bash
unzip opencode-chat-v*.zip -d /PATH/TO/VAULT/.obsidian/plugins/
```

**Windows PowerShell:**
```powershell
Expand-Archive -Path opencode-chat-v*.zip -DestinationPath C:\PATH\TO\VAULT\.obsidian\plugins\
```

Result:
```
/VAULT/.obsidian/plugins/opencode-chat/
  ├── manifest.json
  ├── main.js
  └── styles.css
```

### 6.3 Enable the plugin in Obsidian

1. Open Obsidian
2. **Settings** (⚙️) → **Community plugins**
3. If **Safe mode** is on, turn it off
4. Find **OpenCode Chat** in the installed plugins list
5. Toggle it on

**Checkpoint:** Plugin is visible in the list and enabled.

---

## Step 7: Configure the plugin

Go to **Settings → OpenCode Chat**.

| Setting | Value |
|---|---|
| Server URL | `http://localhost:4096` |
| Default model | Depends on provider (e.g. `amazon-bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0`) |

Click **Test connection**. If everything is working, you'll see: `Connected! OpenCode v1.x.x`

---

## Step 8: First test

Open the chat by clicking the **robot icon** in the left ribbon.

Send a test message:

```
List the files and folders in my vault
```

The AI should list the vault structure via mcp-obsidian.

> **Tip:** For complete system rules and templates (vault guidelines), see the **[[../../../projects/opencode-obsidian-ai-workspace/README|opencode-obsidian-ai-workspace]]** project.

---

## Troubleshooting

### "Failed to fetch" in the plugin

**Cause:** CORS is not configured correctly.

**Fix:**

1. Check OpenCode is running: `curl http://localhost:4096/global/health`
2. Check CORS header:
   ```bash
   curl -sv http://localhost:4096/session -H "Origin: app://obsidian.md" 2>&1 | grep "Access-Control"
   ```
   Must return: `Access-Control-Allow-Origin: app://obsidian.md`
3. Restart the service:
   ```bash
   systemctl --user restart opencode-web   # Linux
   launchctl restart com.opencode.web      # macOS
   ```

### "Connection failed" in settings

- Check URL: `http://localhost:4096` (no trailing `/`)
- Check OpenCode is running: `curl http://localhost:4096/global/health`

### AI cannot see vault files

- Check MCP config in `~/.config/opencode/config.json`
- Verify the vault path is absolute
- Test: `npx -y @mauricio.wolff/mcp-obsidian@latest /PATH/TO/VAULT`
- Restart the OpenCode service

---

## Installation checklist

- Node.js 20+ installed
- OpenCode installed (`opencode --version`)
- LLM provider configured via `opencode auth login` (or Ollama)
- `mcp-obsidian` installed globally (`npm install -g @mauricio.wolff/mcp-obsidian`)
- MCP configured with vault path
- OpenCode server running (port 4096)
- CORS set to `app://obsidian.md`
- Plugin extracted to `.obsidian/plugins/opencode-chat/`
- Plugin enabled in Obsidian
- Test connection successful
- First test working

---

**Next:** [[02-usage]] – Everyday usage and best practices

---

**Version:** 1.2
**Date:** 2026-03-01
**Plugin version:** 1.3.23
