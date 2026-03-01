---
created: '2026-02-28'
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
- ✅ **AWS účet** (pre Amazon Bedrock) – alebo Ollama pre offline režim

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

### Automatická inštalácia (všetky platformy)

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

## Krok 3: Konfigurácia Amazon Bedrock

### 3.1 Získanie API kľúča

1. Prihlás sa do **AWS Console**: https://console.aws.amazon.com
2. Prejdi na **Amazon Bedrock**
3. V ľavom menu klikni **API keys** (alebo **Settings → API keys**)
4. Vygeneruj nový API kľúč a ulož si ho

### 3.2 Pridanie API kľúča do OpenCode

Spusti OpenCode a prihlás sa interaktívne:

```bash
opencode auth login
```

OpenCode zobrazí zoznam providerov — vyber **Amazon Bedrock** a zadaj API kľúč.

**✅ Checkpoint:** OpenCode je nakonfigurovaný pre Amazon Bedrock.

---

## Krok 4: Konfigurácia MCP (prístup k vaultu)

OpenCode potrebuje vedieť, kde je tvoj Obsidian vault.

### 5.1 Zisti cestu k tvojmu vaultu

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

### 5.2 Pridaj MCP konfiguráciu

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

### 5.3 Overenie MCP

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
WorkingDirectory=/home/rho/work/obsidian
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

### 7.1 Stiahni plugin

Plugin je dostupný ako ZIP:
- **Umiestnenie:** `bedrock/attachments/opencode-chat-v1.3.18.zip`
- Alebo stiahni z interného repozitára

### 7.2 Rozbaľ do vault plugins priečinka

**Linux/macOS:**
```bash
unzip opencode-chat-v1.3.18.zip -d /CESTA/K/VAULTU/.obsidian/plugins/
```

**Windows PowerShell:**
```powershell
Expand-Archive -Path opencode-chat-v1.3.18.zip -DestinationPath C:\CESTA\K\VAULTU\.obsidian\plugins\
```

**Výsledná štruktúra:**
```
/VAULT/.obsidian/plugins/opencode-chat/
  ├── manifest.json
  ├── main.js
  └── styles.css
```

### 7.3 Zapni plugin v Obsidian

1. Otvor Obsidian
2. **Settings** (⚙️) → **Community plugins**
3. Ak je zapnutý **Safe mode**, vypni ho
4. V zozname **Installed plugins** nájdi **OpenCode Chat**
5. Zapni toggle

**✅ Checkpoint:** Plugin je viditeľný v zozname a zapnutý.

---

## Krok 7: Konfigurácia pluginu

### 8.1 Otvor plugin settings

**Settings** → **OpenCode Chat**

### 8.2 Nastav server URL

**Server URL:** `http://localhost:4096`

### 8.3 (Voliteľné) Nastav default model

**Default model:** `amazon-bedrock/anthropic.claude-3-5-sonnet-20241022-v2:0`

### 8.4 Test connection

Klikni na tlačidlo **Test connection**.

Ak všetko funguje, uvidíš: ✅ `Connected! OpenCode v1.x.x`

**✅ Checkpoint:** Plugin sa úspešne pripojil k OpenCode serveru.

---

## Krok 8: Inicializácia vault štruktúry

Aby AI agent vedel, ako pracovať s tvojim vaultom, potrebuje:
1. **System rules** – pravidlá organizácie poznámok
2. **Templates** – šablóny pre rôzne typy poznámok

### 9.1 Vytvorenie štruktúry

Spusti v termináli (v adresári vaultu):

**Linux/macOS:**
```bash
cd /CESTA/K/VAULTU

# Vytvor priečinky
mkdir -p system templates projects archive conversations

# Stiahni starter files
curl -o system/opencode-rules.md https://raw.githubusercontent.com/.../opencode-rules.md
curl -o templates/project.md https://raw.githubusercontent.com/.../project.md
curl -o templates/task.md https://raw.githubusercontent.com/.../task.md
curl -o templates/note.md https://raw.githubusercontent.com/.../note.md
curl -o templates/reference.md https://raw.githubusercontent.com/.../reference.md
```

**Alternatívne: Manuálne vytvorenie**

Vytvor tieto súbory v tvojom vaulte:

#### `system/opencode-rules.md`

```markdown
# Pravidlá pre OpenCode agenta

## Organizácia poznámok

### Priečinková štruktúra

- `projects/` – aktívne projekty
- `archive/` – archivované poznámky
- `conversations/` – AI konverzácie
- `templates/` – šablóny
- `system/` – systémové súbory

### Tag hierarchia

**Povinné tagy:**
- `#type/project` – projektová poznámka
- `#type/task` – úloha
- `#type/note` – voľná poznámka
- `#type/reference` – referencia, tutorial
- `#type/conversation` – AI chat

**Status tagy:**
- `#status/draft` – rozpracované
- `#status/active` – aktívne
- `#status/done` – hotové
- `#status/archived` – archivované

**Témy:**
- `#topic/ai`, `#topic/development`, `#topic/obsidian`, atď.

**Projekty:**
- `#project/[meno-projektu]`

### Frontmatter

Každá poznámka musí mať:

\`\`\`yaml
---
created: YYYY-MM-DD
tags:
  - type/[typ]
  - status/[status]
---
\`\`\`

### Šablóny

Pri vytváraní poznámok **VŽDY použiť šablónu** z `templates/`:
- `templates/project.md`
- `templates/task.md`
- `templates/note.md`
- `templates/reference.md`

### Pomenovanie súborov

- Malé písmená
- Pomlčky namiesto medzier
- Stručné ale výstižné názvy

**Príklad:** `projects/moj-projekt/plan-implementacie.md`

## Workflow

### Pri vytváraní poznámky:
1. Načítaj šablónu z `templates/`
2. Nahraď placeholdery (`{{title}}`, `{{date}}`, atď.)
3. Doplň frontmatter
4. Pridaj relevantné tagy
5. Ulož do správneho priečinka

### Pri aktualizácii:
1. Zachovaj existujúce tagy
2. Aktualizuj `updated` pole vo frontmatter
3. Aktualizuj status ak sa zmenil
```

#### `templates/project.md`

```markdown
---
created: {{date}}
tags:
  - type/project
  - status/active
  - project/{{project-name}}
---

# {{title}}

## Prehľad

*Stručný popis projektu a jeho cieľa.*

## Ciele

- [ ] Cieľ 1
- [ ] Cieľ 2

## Súvisiace poznámky

- 

## Status

**Aktuálny stav:** 

**Posledná aktualizácia:** {{date}}
```

#### `templates/task.md`

```markdown
---
created: {{date}}
tags:
  - type/task
  - status/active
  - project/{{project-name}}
  - priority/medium
---

# {{title}}

## Popis

*Popis úlohy.*

## Kroky

- [ ] Krok 1
- [ ] Krok 2

## Súvisiace poznámky

- 
```

#### `templates/note.md`

```markdown
---
created: {{date}}
tags:
  - type/note
---

# {{title}}

## Obsah

*Tvoja poznámka...*

## Súvisiace poznámky

- 
```

#### `templates/reference.md`

```markdown
---
created: {{date}}
tags:
  - type/reference
  - topic/{{topic}}
---

# {{title}}

## Prehľad

*Stručný úvod.*

## Hlavné koncepty

### Koncept 1

*Vysvetlenie.*

## Príklady

\`\`\`
// Ukážkový kód
\`\`\`

## Zdroje

- 
```

### 9.2 Overenie štruktúry

V Obsidian by si mal vidieť:

```
📁 system/
  └── opencode-rules.md
📁 templates/
  ├── project.md
  ├── task.md
  ├── note.md
  └── reference.md
📁 projects/
📁 archive/
📁 conversations/
```

**✅ Checkpoint:** Vault má základnú štruktúru a šablóny.

---

## Krok 9: Prvý test

### 10.1 Otvor OpenCode Chat

Klikni na **🤖 ikonu robota** v ribbon (ľavý sidebar).

Chat sa otvorí v pravom sidebari.

### 10.2 Odošli prvú správu

```
Prečítaj pravidlá z system/opencode-rules.md a povedz mi, ako mám organizovať poznámky
```

AI by mala odpovedať so zhrnutím pravidiel.

### 10.3 Vytvor testovaciu poznámku

```
Vytvor projektovú poznámku podľa šablóny templates/project.md pre projekt "test-projektu"
```

AI načíta šablónu, vyplní placeholdery a vytvorí súbor `projects/test-projektu/prehľad.md`.

**✅ Checkpoint:** OpenCode Chat funguje a vie pracovať s vaultom!

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

**Riešenie:**

- Over URL: `http://localhost:4096` (bez trailing `/`)
- Over, že OpenCode beží: `curl http://localhost:4096/global/health`

### AI nevidí vault súbory

**Riešenie:**

- Over MCP config v `~/.config/opencode/config.json`
- Over cestu k vaultu (musí byť absolútna)
- Otestuj: `npx -y @mauricio.wolff/mcp-obsidian@latest /CESTA`
- Reštartuj OpenCode službu

---

## Zhrnutie – Checklist

Po dokončení inštalácie by si mal mať:

- ✅ Node.js 20+ nainštalovaný
- ✅ OpenCode nainštalovaný (`opencode --version`)
- ✅ Amazon Bedrock API kľúč nastavený cez `opencode auth login`
- ✅ MCP konfigurácia s cestou k vaultu
- ✅ OpenCode server beží (port 4096)
- ✅ CORS nastavený na `app://obsidian.md`
- ✅ Plugin rozbalený v `.obsidian/plugins/opencode-chat/`
- ✅ Plugin zapnutý v Obsidian
- ✅ Test connection úspešný
- ✅ Vault má `system/` a `templates/` štruktúru
- ✅ Prvý test funguje

---

## Ďalšie kroky

Teraz si pripravený používať OpenCode Chat naplno!

👉 **[[02-pouzivanie]]** – Návod na bežné používanie a best practices

---

**Verzia:** 1.0  
**Dátum:** 2026-02-28  
**Plugin verzia:** 1.3.18
