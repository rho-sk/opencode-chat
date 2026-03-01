---
created: '2026-03-01'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
  - topic/installation
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
- **AWS account** (for Amazon Bedrock) — or Ollama for offline mode

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

## Step 3: Configure Amazon Bedrock

### 3.1 Get an API key

1. Sign in to **AWS Console**: https://console.aws.amazon.com
2. Navigate to **Amazon Bedrock**
3. Go to **Settings → API keys**
4. Generate a new API key and save it

### 3.2 Add the API key to OpenCode

```bash
opencode auth login
```

OpenCode shows a list of providers — select **Amazon Bedrock** and enter the API key.

**Checkpoint:** OpenCode is configured for Amazon Bedrock.

---

## Step 4: Configure MCP (vault access)

OpenCode needs to know where your Obsidian vault is.

### 4.1 Find your vault path

**Linux/macOS:**
```bash
# Example: /home/yourname/Documents/obsidian/my-vault
```

**Windows PowerShell:**
```powershell
# Example: C:\Users\yourname\Documents\obsidian\my-vault
```

### 4.2 Add MCP configuration

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

### 4.3 Verify MCP

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

The plugin is distributed as a ZIP file. Get the latest release from the [GitHub releases page](../../releases).

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
| Default model | `amazon-bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0` |
| Default agent | `build` |
| Rules path | `system/opencode-rules.md` (optional) |
| Send shortcut | `Ctrl+Enter` |

Click **Test connection**. If everything is working, you'll see: `Connected! OpenCode v1.x.x`

---

## Step 8: Initialize vault structure

For the AI agent to work well with your vault, create a basic structure:

```bash
cd /PATH/TO/VAULT
mkdir -p system templates projects archive conversations
```

Create `system/opencode-rules.md` with your organizational rules (tag hierarchy, folder structure, naming conventions). See the [Slovak manual](../01-instalacia.md) for a full example.

Minimal `templates/project.md`:

```markdown
---
created: {{date}}
tags:
  - type/project
  - status/active
  - project/{{project-name}}
---

# {{title}}

## Overview

## Goals

- [ ] Goal 1

## Related notes

-
```

---

## Step 9: First test

Open the chat by clicking the **robot icon** in the left ribbon.

Send a test message:

```
Create a project note using templates/project.md for project 'test-project'
```

The AI should load the template, fill in the placeholders, and create `projects/test-project/overview.md`.

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
- Amazon Bedrock API key set via `opencode auth login`
- MCP configured with vault path
- OpenCode server running (port 4096)
- CORS set to `app://obsidian.md`
- Plugin extracted to `.obsidian/plugins/opencode-chat/`
- Plugin enabled in Obsidian
- Test connection successful
- Vault has `system/` and `templates/` structure
- First test working

---

**Next:** [[02-usage]] – Everyday usage and best practices

---

**Version:** 1.1
**Date:** 2026-03-01
**Plugin version:** 1.3.21
