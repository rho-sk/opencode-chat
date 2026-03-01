---
created: '2026-02-28'
updated: '2026-03-01'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
  - topic/installation
---
# OpenCode Chat – Inštalácia

Tento dokument ťa prevedie kompletnou inštaláciou OpenCode Chat od nuly až po funkčný systém.

**Predpokladaný čas:** 30-45 minút

**Súvisiace dokumenty:**
- [[00-uvod]] – Úvod a prehľad
- [[02-pouzivanie]] – Používanie a best practices

---

## Požiadavky

Pred začatím overiť, že máš:

- ✅ **Obsidian desktop** (https://obsidian.md) – verzia 1.0.0+
- ✅ **Prístup k terminálu** (Linux/macOS: Terminal, Windows: PowerShell)
- ✅ **Admin práva** (pre inštaláciu Node.js)
- ✅ **LLM provider** – AWS účet (Bedrock), Ollama, Anthropic API alebo iný

---

## Krok 1: Inštalácia Node.js

Node.js je potrebný pre OpenCode a mcp-obsidian.

### Linux (Debian/Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Overenie
node --version   # v20.x.x
npm --version    # 10.x.x
```

### macOS

```bash
# Cez Homebrew
brew install node@20

# Overenie
node --version
npm --version
```

### Windows

1. Stiahni inštalátor z [nodejs.org](https://nodejs.org/en/download/)
2. Spusti inštalátor (vyber "LTS" verziu)
3. Potvrď všetky predvolené nastavenia
4. Po inštalácii reštartuj PowerShell a over:

```powershell
node --version
npm --version
```

**✅ Checkpoint:** Ak vidíš verzie (napr. `v20.11.0`), Node.js je nainštalovaný správne.

---

## Krok 2: Inštalácia OpenCode

OpenCode je AI agent platforma, ktorá beží ako lokálny server.

```bash
npm install -g opencode-ai
```

### Overenie

```bash
opencode --version
# opencode version 1.x.x
```

**✅ Checkpoint:** Príkaz `opencode` by mal fungovať a vrátiť verziu.

---

## Krok 3: Konfigurácia LLM providera

OpenCode podporuje viacero LLM providerov. Vyber si podľa svojich požiadaviek:

| Provider | Vhodné pre | Náklady |
|---|---|---|
| **Amazon Bedrock** | Maximálne súkromie, GDPR | ~$5-10/mesiac |
| **Ollama** | Plne offline, bez cloud | Zadarmo (vyšší HW nárok) |
| **Anthropic API** | Priamy Claude prístup | ~$5-15/mesiac |
| **OpenAI** | GPT modely | ~$5-20/mesiac |

### 3.1 Konfigurácia cez `opencode auth login` (Bedrock, Anthropic, OpenAI)

```bash
opencode auth login
```

OpenCode zobrazí zoznam providerov – vyber požadovaný a zadaj API kľúč.

**Pre Amazon Bedrock:** Potrebuješ AWS účet s povoleným Bedrock prístupom.
> Kompletný Bedrock setup vrátane IAM, región a GDPR: pozri projekt **opencode-obsidian-ai-workspace** – `manual/sk/02-bedrock-nastavenie.md`

**Pre Anthropic API / OpenAI:** Zadaj API kľúč priamo v `opencode auth login`.

### 3.2 Konfigurácia Ollama (offline)

```bash
# Inštalácia Ollama
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

OpenCode konfigurácia (`~/.config/opencode/config.json`):

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

**✅ Checkpoint:** OpenCode je nakonfigurovaný pre zvolený LLM provider.

---

## Krok 4: Konfigurácia MCP (prístup k vaultu)

OpenCode potrebuje vedieť, kde je tvoj Obsidian vault.

### 4.1 Zisti cestu k tvojmu vaultu

**Linux/macOS:**
```bash
# Príklad
pwd  # Ak si v adresári vaultu
# /home/meno/Documents/obsidian/moj-vault
```

**Windows PowerShell:**
```powershell
Get-Location
# C:\Users\meno\Documents\obsidian\moj-vault
```

### 4.2 Pridaj MCP konfiguráciu

Uprav súbor `~/.config/opencode/config.json`:

**Linux/macOS:**
```bash
nano ~/.config/opencode/config.json
```

**Windows:**
```powershell
notepad $env:USERPROFILE\.config\opencode\config.json
```

**Pridaj sekciu `"mcp"`:**

```json
{
  "mcp": {
    "obsidian": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@mauricio.wolff/mcp-obsidian@latest",
        "/CESTA/K/TVOJMU/VAULTU"
      ]
    }
  }
}
```

**Nahraď `/CESTA/K/TVOJMU/VAULTU`** skutočnou cestou!

**Príklady:**
- Linux: `/home/jan/Documents/obsidian/work`
- macOS: `/Users/jan/Documents/obsidian/work`
- Windows: `C:/Users/jan/Documents/obsidian/work` (použi `/`, nie `\`)

### 4.3 Overenie MCP

Test, či mcp-obsidian funguje:

```bash
npx -y @mauricio.wolff/mcp-obsidian@latest /CESTA/K/VAULTU
```

Proces by mal bežať bez chýb. Ukonči ho: `Ctrl+C`

**✅ Checkpoint:** MCP je nakonfigurovaný a funkčný.

---

## Krok 5: Spustenie OpenCode servera

OpenCode musí bežať na pozadí ako služba.

### Linux (systemd)

#### 5.1 Vytvor service súbor

```bash
mkdir -p ~/.config/systemd/user
nano ~/.config/systemd/user/opencode-web.service
```

**Obsah:**

```ini
[Unit]
Description=OpenCode Web Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/CESTA/K/VAULTU
ExecStart=/usr/bin/opencode web --port 4096 --hostname 0.0.0.0 --cors app://obsidian.md --cors capacitor://localhost --cors http://localhost
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

**Poznámka:** Over cestu k `opencode`:
```bash
which opencode
# /usr/bin/opencode alebo /usr/local/bin/opencode
```
Ak je iná cesta, uprav `ExecStart=/usr/local/bin/opencode ...`

#### 5.2 Spusti službu

```bash
loginctl enable-linger $USER
systemctl --user daemon-reload
systemctl --user enable opencode-web
systemctl --user start opencode-web
```

#### 5.3 Overenie

```bash
systemctl --user status opencode-web
# ● opencode-web.service - OpenCode Web Server
#    Active: active (running) ...

curl http://localhost:4096/global/health
# {"healthy":true,"version":"1.x.x"}
```

### macOS (launchd)

#### 5.1 Vytvor plist súbor

```bash
nano ~/Library/LaunchAgents/com.opencode.web.plist
```

**Obsah:**

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

#### 5.2 Spusti službu

```bash
launchctl load ~/Library/LaunchAgents/com.opencode.web.plist
launchctl start com.opencode.web
```

#### 5.3 Overenie

```bash
curl http://localhost:4096/global/health
# {"healthy":true,"version":"1.x.x"}
```

### Windows (manuálne spustenie)

Vytvor `.bat` script:

**`start-opencode.bat`:**
```bat
@echo off
opencode web --port 4096 --hostname 0.0.0.0 --cors app://obsidian.md
pause
```

Umiestni ho do **Startup** priečinka:
- Stlač `Win+R`
- Napíš `shell:startup`
- Skopíruj tam `start-opencode.bat`

Alebo spusti manuálne v PowerShell:
```powershell
opencode web --port 4096 --hostname 0.0.0.0 --cors app://obsidian.md
```

**✅ Checkpoint:** OpenCode server beží a reaguje na `http://localhost:4096/global/health`

---

## Krok 6: Inštalácia OpenCode Chat pluginu

### 6.1 Stiahni plugin

Plugin je dostupný ako ZIP – stiahni najnovší release z GitHub releases page.

### 6.2 Rozbaľ do vault plugins priečinka

**Linux/macOS:**
```bash
unzip opencode-chat-v*.zip -d /CESTA/K/VAULTU/.obsidian/plugins/
```

**Windows PowerShell:**
```powershell
Expand-Archive -Path opencode-chat-v*.zip -DestinationPath C:\CESTA\K\VAULTU\.obsidian\plugins\
```

**Výsledná štruktúra:**
```
/VAULT/.obsidian/plugins/opencode-chat/
  ├── manifest.json
  ├── main.js
  └── styles.css
```

### 6.3 Zapni plugin v Obsidian

1. Otvor Obsidian
2. **Settings** (⚙️) → **Community plugins**
3. Ak je zapnutý **Safe mode**, vypni ho
4. V zozname **Installed plugins** nájdi **OpenCode Chat**
5. Zapni toggle

**✅ Checkpoint:** Plugin je viditeľný v zozname a zapnutý.

---

## Krok 7: Konfigurácia pluginu

**Settings** → **OpenCode Chat**

| Nastavenie | Hodnota |
|---|---|
| Server URL | `http://localhost:4096` |
| Default model | závisí od LLM providera (napr. `amazon-bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0`) |

Klikni na tlačidlo **Test connection**.

Ak všetko funguje, uvidíš: ✅ `Connected! OpenCode v1.x.x`

**✅ Checkpoint:** Plugin sa úspešne pripojil k OpenCode serveru.

---

## Krok 8: Prvý test

### 8.1 Otvor OpenCode Chat

Klikni na **ikonu robota** v ribbon (ľavý sidebar).

Chat sa otvorí v pravom sidebari.

### 8.2 Odošli prvú správu

```
Zisti, aké súbory a priečinky existujú v mojom vaulte
```

AI by mala vypísať štruktúru vaultu cez mcp-obsidian.

**✅ Checkpoint:** OpenCode Chat funguje a vie čítať vault!

> **Tip:** Pre kompletné system rules a templates (vault guidelines) pozri projekt **[[../../../projects/opencode-obsidian-ai-workspace/README|opencode-obsidian-ai-workspace]]**.

---

## Riešenie problémov

### "Failed to fetch" v plugine

**Príčina:** CORS nie je správne nastavený.

**Riešenie:**

1. Over, že OpenCode beží:
   ```bash
   curl http://localhost:4096/global/health
   ```

2. Over CORS header:
   ```bash
   curl -sv http://localhost:4096/session -H "Origin: app://obsidian.md" 2>&1 | grep "Access-Control"
   ```
   Musí vrátiť: `Access-Control-Allow-Origin: app://obsidian.md`

3. Reštartuj službu:
   ```bash
   systemctl --user restart opencode-web  # Linux
   launchctl restart com.opencode.web     # macOS
   ```

### "Connection failed" v settings

- Over URL: `http://localhost:4096` (bez trailing `/`)
- Over, že OpenCode beží: `curl http://localhost:4096/global/health`

### AI nevidí vault súbory

- Over MCP config v `~/.config/opencode/config.json`
- Over cestu k vaultu (musí byť absolútna)
- Otestuj: `npx -y @mauricio.wolff/mcp-obsidian@latest /CESTA`
- Reštartuj OpenCode službu

---

## Zhrnutie – Checklist

Po dokončení inštalácie by si mal mať:

- ✅ Node.js 20+ nainštalovaný
- ✅ OpenCode nainštalovaný (`opencode --version`)
- ✅ LLM provider nakonfigurovaný cez `opencode auth login` (alebo Ollama)
- ✅ MCP konfigurácia s cestou k vaultu
- ✅ OpenCode server beží (port 4096)
- ✅ CORS nastavený na `app://obsidian.md`
- ✅ Plugin rozbalený v `.obsidian/plugins/opencode-chat/`
- ✅ Plugin zapnutý v Obsidian
- ✅ Test connection úspešný
- ✅ Prvý test funguje

---

## Ďalšie kroky

Teraz si pripravený používať OpenCode Chat naplno!

👉 **[[02-pouzivanie]]** – Návod na bežné používanie a best practices

---

**Verzia:** 1.1
**Dátum:** 2026-03-01
**Plugin verzia:** 1.3.23
