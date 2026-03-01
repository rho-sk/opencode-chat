---
created: '2026-02-28'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
  - topic/workflow
---
# OpenCode Chat – Bežné používanie

Tento dokument popisuje best practices, odporúčané pluginy a workflow pre efektívnu prácu s OpenCode Chat.

> **Chceš hotový vault setup s templates, rules a Bedrock konfiguráciou?**
> Pozri **[opencode-obsidian-ai-workspace](https://github.com/rho-sk/opencode-obsidian-ai-workspace)** – obsahuje kompletný setup pripravený na použitie.

**Súvisiace dokumenty:**
- [[00-uvod]] – Úvod a prehľad
- [[01-instalacia]] – Inštalačný návod

---

## Odporúčané Obsidian pluginy

Pre optimálnu prácu s OpenCode Chat odporúčame nainštalovať tieto pluginy:

### 1. **Templater** (Community plugin)

**Prečo:** Pokročilé šablóny s JavaScriptom, premennými a funkciami.

**Inštalácia:**
1. **Settings → Community plugins → Browse**
2. Hľadaj "Templater"
3. **Install** → **Enable**

**Konfigurácia:**
- **Settings → Templater → Template folder location:** `templates`
- Zapni **Trigger Templater on new file creation**

**Použitie:**
```markdown
---
created: <% tp.date.now("YYYY-MM-DD") %>
tags:
  - type/note
---

# <% tp.file.title %>

Created by: <% tp.user.name %>
```

---

### 2. **Dataview** (Community plugin)

**Prečo:** Dynamické queries pre prehľad poznámok, úloh, projektov.

**Inštalácia:**
1. **Settings → Community plugins → Browse**
2. Hľadaj "Dataview"
3. **Install** → **Enable**

**Použitie – zobrazenie úloh:**
```dataview
TABLE status, priority, created
FROM #type/task
WHERE status = "active"
SORT priority DESC, created ASC
```

**Použitie – projekty:**
```dataview
LIST
FROM #type/project
WHERE status = "active"
SORT file.name ASC
```

---

### 3. **Tag Wrangler** (Community plugin)

**Prečo:** Hromadná správa tagov, premenovanie, zlučovanie.

**Inštalácia:**
1. **Settings → Community plugins → Browse**
2. Hľadaj "Tag Wrangler"
3. **Install** → **Enable**

**Použitie:**
- Klikni pravým tlačidlom na tag v sidebari
- **Rename tag** – premenuje všade
- **Merge tags** – spojí dva tagy

---

### 4. **Natural Language Dates** (Community plugin)

**Prečo:** Rýchle vkladanie dátumov ("today", "tomorrow", "next week").

**Inštalácia:**
1. **Settings → Community plugins → Browse**
2. Hľadaj "Natural Language Dates"
3. **Install** → **Enable**

**Použitie:**
- Napíš `@today` a stlač Tab → `2026-02-28`
- Napíš `@next monday` → `2026-03-03`

---

### 5. **Calendar** (Community plugin)

**Prečo:** Vizuálny kalendár pre daily notes a časové plánovanie.

**Inštalácia:**
1. **Settings → Community plugins → Browse**
2. Hľadaj "Calendar"
3. **Install** → **Enable**

**Použitie:**
- Ikona kalendára v ribbon
- Klikni na dátum → vytvorí daily note

---

### 6. **Kanban** (Community plugin)

**Prečo:** Vizuálna board pre úlohy (To Do → In Progress → Done).

**Inštalácia:**
1. **Settings → Community plugins → Browse**
2. Hľadaj "Kanban"
3. **Install** → **Enable**

**Použitie:**
- Vytvor poznámku s frontmatter: `kanban-plugin: basic`
- OpenCode môže generovať Kanban boards

---

## Nastavenie Templates

Templates sú kľúčové pre konzistentnú organizáciu poznámok.

### Štruktúra templates priečinka

```
templates/
├── project.md          # Projektová poznámka
├── task.md             # Úloha
├── note.md             # Voľná poznámka
├── reference.md        # Referencia/tutorial
├── conversation.md     # AI konverzácia
├── decision.md         # Rozhodnutie (ADR)
├── daily.md            # Daily note
└── meeting.md          # Zápis z meetingu
```

### Rozšírené šablóny

#### `templates/conversation.md`

```markdown
---
created: {{date}}
tags:
  - type/conversation
  - topic/{{topic}}
---

# Konverzácia: {{title}}

**Dátum:** {{date}}  
**Účastníci:** AI agent  
**Téma:** {{topic}}

---

## Context

*Prečo táto konverzácia vznikla?*

## Zhrnutie

*Hlavné pointy z konverzácie.*

## Akčné body

- [ ] Úloha 1
- [ ] Úloha 2

## Súvisiace poznámky

- 
```

#### `templates/decision.md`

```markdown
---
created: {{date}}
tags:
  - type/decision
  - project/{{project-name}}
---

# Rozhodnutie: {{title}}

**Dátum:** {{date}}  
**Status:** Proposed / Accepted / Deprecated

---

## Kontext

*Aký problém riešime?*

## Rozhodnutie

*Čo sme sa rozhodli urobiť?*

## Alternatívy

### Alternatíva 1
*Popis + dôvod zamietnutia*

### Alternatíva 2
*Popis + dôvod zamietnutia*

## Dôsledky

**Pozitívne:**
- 

**Negatívne:**
- 

## Súvisiace poznámky

- 
```

#### `templates/daily.md`

```markdown
---
created: {{date}}
tags:
  - type/note
  - daily
---

# {{date}}

## Dnešné úlohy

- [ ] Úloha 1
- [ ] Úloha 2

## Poznámky

*Čo sa dnes udialo?*

## Akčné body na zajtra

- [ ] 

## Súvisiace poznámky

- [[{{yesterday}}]] | [[{{tomorrow}}]]
```

---

## Nastavenie System Rules

System rules definujú, ako má AI agent pracovať s tvojim vaultom.

### Základný `system/opencode-rules.md`

Tento súbor už máš vytvorený z inštalácie. Môžeš ho rozšíriť o vlastné pravidlá:

#### Pridanie vlastných pravidiel

```markdown
## Vlastné pravidlá

### Štýl písania

- Písať v slovenčine (alebo angličtine podľa preferencie)
- Používať **Markdown formátovanie**
- Krátke, stručné odpovede
- Vyhýbať sa emoji (ak nie sú potrebné)

### Projekty

- Každý projekt má `README.md` alebo `prehľad.md`
- Projekty majú podpriečinky: `docs/`, `tasks/`, `meetings/`
- Archivované projekty presunúť do `archive/[rok]/[projekt-meno]/`

### Úlohy

- Úlohy majú priority: `#priority/high`, `#priority/medium`, `#priority/low`
- Hotové úlohy označiť `#status/done`
- Úlohy s deadline mať `due: YYYY-MM-DD` vo frontmatter

### Tagovanie

- Max 5-7 tagov na poznámku
- Používať existujúce tagy pred vytváraním nových
- Tag hierarchy: `#parent/child` (napr. `#project/opencode-chat`)

### Linkovanie

- Vždy linkuj súvisiace poznámky
- Používaj aliases pre lepšiu čitateľnosť: `[[long-note-name|Short]]`
- Projektové poznámky majú sekciu "Súvisiace dokumenty"
```

### Ako používať rules v chate

Pred prvým použitím v novej session:

```
Prečítaj pravidlá z system/opencode-rules.md a dodržuj ich pri všetkých operáciách s poznámkami
```

AI si prečíta pravidlá a bude ich aplikovať počas celej session.

**Tip:** Môžeš vytvoriť skratku alebo alias v Templater:

```markdown
<!-- V templates/conversation.md -->

**System prompt:** Prečítaj `system/opencode-rules.md` a dodržuj pravidlá.
```

---

## Workflow scenáre

### 1. Vytváranie projektov

```
👤: Vytvor nový projekt "mobilná aplikácia" podľa šablóny templates/project.md

🤖: *Načíta šablónu, vyplní:*
   - title: Mobilná aplikácia
   - date: 2026-02-28
   - project-name: mobilna-aplikacia

   *Vytvorí: projects/mobilna-aplikacia/prehľad.md*

👤: Vytvor štruktúru podpriečinkov pre tento projekt: docs/, tasks/, meetings/

🤖: *Vytvorí priečinky*
```

---

### 2. Správa úloh

```
👤: Zobraz všetky aktívne úlohy s vysokou prioritou

🤖: *Vyhľadá poznámky s:*
   - #type/task
   - #status/active
   - #priority/high

   *Zobrazí zoznam s linkmi*

👤: Označ úlohu "Implementovať login" ako hotovú

🤖: *Nájde poznámku, zmení tag #status/active → #status/done*
```

---

### 3. Generovanie reportov

```
👤: Na základe poznámok v projects/mobilna-aplikacia/ vytvor zhrnutie pokroku

🤖: *Prečíta všetky poznámky v projekte*
   *Analyzuje status úloh*
   *Vytvorí markdown report*

## Zhrnutie projektu: Mobilná aplikácia

**Status:** Aktívny
**Hotové úlohy:** 5/10
**Zostávajúce úlohy:** 5

### Completed:
- ✅ Navrhnúť UI
- ✅ Implementovať login

### In Progress:
- 🔄 Backend API
- 🔄 Testovanie

### To Do:
- ⏳ Deployment
```

---

### 4. Organizácia tagov

```
👤: Nájdi všetky poznámky s tagom #topic/ai a pridaj im aj #status/draft ak nemajú žiaden status tag

🤖: *Vyhľadá poznámky*
   *Skontroluje, ktoré nemajú #status/*
   *Pridá #status/draft*
```

---

### 5. Refaktoring štruktúry

```
👤: Presuň všetky poznámky z projects/starý-projekt/ do archive/2025/starý-projekt/

🤖: *Vytvorí priečinok archive/2025/starý-projekt/*
   *Presunie súbory*
   *Aktualizuje tagy na #status/archived*
```

---

### 6. Automatizované daily notes

```
👤: Vytvor daily note pre dnes podľa templates/daily.md

🤖: *Načíta šablónu*
   *Vyplní {{date}}, {{yesterday}}, {{tomorrow}}*
   *Vytvorí notes/daily/2026-02-28.md*
```

---

### 7. Zápisy z konverzácií

```
👤: Ulož túto konverzáciu do conversations/2026-02-28-refaktoring-vaultu.md

🤖: *Načíta celú históriu session*
   *Vytvorí markdown súbor s konverzáciou*
   *Pridá frontmatter a tagy*
```

---

## Best Practices

### 1. Používaj System Prompt v každej novej session

```
Prečítaj system/opencode-rules.md a dodržuj pravidlá
```

Alebo vytvor skratkový alias v Templater.

---

### 2. Kombinuj viacero modelov

- **Claude 3.5 Sonnet v2** – pre komplexné úlohy (generovanie reportov, kódu, analýza)
- **Claude 3.5 Haiku** – pre jednoduché úlohy (vyhľadávanie, tagovanie)

**Prepínanie modelu:** Dropdown v toolbar pluginu

---

### 3. Pravidelne archivuj staré poznámky

```
👤: Nájdi všetky poznámky s #status/done staršie ako 3 mesiace a presuň ich do archive/

🤖: *Vyhľadá poznámky*
   *Skontroluje created/updated date*
   *Presunie do archive/*
```

---

### 4. Používaj Dataview pre prehľady

Vytvor dashboard poznámku `projects/dashboard.md`:

```markdown
# Dashboard

## Aktívne projekty

\`\`\`dataview
TABLE status, file.ctime as "Created"
FROM #type/project
WHERE status = "active"
\`\`\`

## Dnešné úlohy

\`\`\`dataview
TASK
FROM #type/task
WHERE status = "active" AND due = date(today)
\`\`\`

## Posledné konverzácie

\`\`\`dataview
LIST
FROM #type/conversation
SORT file.ctime DESC
LIMIT 5
\`\`\`
```

AI môže aktualizovať tento dashboard automaticky.

---

### 5. Linkuj súvisiace poznámky

Pri každej poznámke pridaj sekciu:

```markdown
## Súvisiace poznámky

- [[Related Note 1]]
- [[Related Note 2]]
```

AI môže automaticky nájsť súvisiace poznámky:

```
👤: Nájdi poznámky súvisiace s "AI" a pridaj ich do sekcie "Súvisiace poznámky" v projects/opencode-chat/prehľad.md

🤖: *Vyhľadá poznámky*
   *Aktualizuje sekciu s wikilinks*
```

---

### 6. Verzionuj dôležité rozhodnutia

Pre dôležité rozhodnutia používaj `templates/decision.md` (ADR štýl).

```
👤: Vytvor decision record pre rozhodnutie použiť Amazon Bedrock namiesto OpenAI

🤖: *Načíta templates/decision.md*
   *Vyplní kontext, alternatívy, dôsledky*
   *Uloží do projects/opencode-chat/decisions/bedrock-vs-openai.md*
```

---

### 7. Backupuj vault pravidelne

OpenCode Chat **neposkytuje automatický backup**.

**Odporúčané riešenia:**
- **Git** – verzionuj vault (`git init`, `git commit`, `git push`)
- **Obsidian Sync** – oficiálny cloud backup (platený)
- **Syncthing** – P2P sync medzi zariadeniami (zadarmo)
- **Rclone** – sync do cloudu (Google Drive, Dropbox, atď.)

---

## Pokročilé techniky

### 1. Batch operácie

```
👤: Pre všetky poznámky v projects/opencode-chat/:
- Pridaj tag #topic/documentation
- Aktualizuj updated date na dnes
- Skontroluj, či majú frontmatter

🤖: *Iteruje cez poznámky*
   *Aplikuje zmeny*
   *Reportuje výsledky*
```

---

### 2. Generovanie Kanban boards

```
👤: Vytvor Kanban board pre úlohy v projekte "mobilná aplikácia"

🤖: *Vyhľadá úlohy*
   *Vytvorí markdown s Kanban formátom:*

## To Do
- [ ] Úloha 1

## In Progress
- [ ] Úloha 2

## Done
- [x] Úloha 3
```

---

### 3. Export do rôznych formátov

```
👤: Exportuj projekt "mobilná aplikácia" do PDF formátu

🤖: Sorry, nemôžem priamo vytvoriť PDF, ale môžem:
1. Vytvoriť konsolidovaný markdown súbor
2. Ty ho otvoríš v Pandoc alebo Obsidian PDF export plugine
```

---

### 4. Automatické tagovanie podľa obsahu

```
👤: Prečítaj poznámku projects/foo/bar.md a na základe obsahu navrhni relevantné tagy

🤖: *Analyzuje obsah*

Navrhujem tieto tagy:
- #topic/ai (spomenuté: machine learning, neural networks)
- #topic/development (spomenuté: Python, API)
- #priority/high (obsahuje: "urgent", "deadline")

Mám ich pridať?
```

---

### 5. Vyhľadávanie s kontextom

```
👤: Nájdi poznámky, kde som riešil problém s CORS

🤖: *Fulltext search + sémantická analýza*

Našiel som 3 poznámky:
1. [[projects/opencode-chat/architektura]] – sekcia "CORS: app://obsidian.md"
2. [[conversations/2026-02-27-cors-fix]] – riešenie problému
3. [[projects/bedrock/riesenie-finalne]] – kapitola "CORS pre Obsidian"
```

---

## Tipy na efektívne používanie

### 1. **Buď špecifický**

❌ "Vytvor poznámku"  
✅ "Vytvor projektovú poznámku podľa templates/project.md pre projekt 'e-shop' s tagmi #status/active #priority/high"

---

### 2. **Využívaj kontext session**

AI si pamätá predchádzajúce správy v session:

```
👤: Prečítaj projects/foo/plan.md
🤖: *Prečítané*

👤: Teraz vytvor úlohy na základe toho plánu
🤖: *Vytvorí úlohy odvodené z plánu (bez potreby znova čítať)*
```

---

### 3. **Používaj multi-step requesty**

```
👤: Urob nasledovné:
1. Nájdi všetky poznámky s #type/task a #status/done
2. Presuň ich do archive/tasks/
3. Zmeň tag na #status/archived
4. Vytvor report so zoznamom archivovaných úloh
```

---

### 4. **Kombinuj nástroje**

```
👤: Použi Dataview query na nájdenie aktívnych úloh, potom vytvor Kanban board z nich
```

---

### 5. **Iteratívne zlepšovanie**

```
👤: Vytvor projektovú poznámku pre "web app"
🤖: *Vytvorené*

👤: Teraz pridaj sekciu "Tech stack" s Markdown tabuľkou
🤖: *Aktualizované*

👤: Pridaj linky na súvisiace dokumenty
🤖: *Aktualizované*
```

---

## Časté chyby a ich riešenie

### 1. **AI nečíta najnovšiu verziu súboru**

**Problém:** Upravil si súbor v Obsidian, ale AI vidí starú verziu.

**Riešenie:**
- Obsidian ukladá zmeny asynchrónne
- Počkaj 1-2 sekundy pred poslaním požiadavky
- Alebo explicitne: "Prečítaj najnovšiu verziu projects/foo.md"

---

### 2. **AI vytvára duplicitné poznámky**

**Problém:** AI vytvorila `project-name.md` aj `project-name 1.md`.

**Riešenie:**
- Pred vytvorením: "Skontroluj, či projects/foo/bar.md už existuje"
- Alebo: "Ak existuje, aktualizuj, inak vytvor"

---

### 3. **Nekonzistentné tagovanie**

**Problém:** AI používa `#status/finished` namiesto `#status/done`.

**Riešenie:**
- Explicitne špecifikuj: "Použi presne tag #status/done"
- Alebo aktualizuj `system/opencode-rules.md` s presným zoznamom povolených tagov

---

### 4. **AI vytvára nesprávne cesty**

**Problém:** AI vytvorila `projects/Project Name/file.md` (medzery, veľké písmená).

**Riešenie:**
- Pripomeň pravidlá: "Dodržuj naming convention: malé písmená, pomlčky"
- Alebo: "Použi cestu: projects/project-name/file.md"

---

### 5. **Príliš všeobecné odpovede**

**Problém:** AI odpovedá všeobecne namiesto akcie.

**Riešenie:**
- Použi **build agent** (nie plan)
- Buď explicitný: "Vykonaj túto akciu teraz, nenavrhuj len"

---

## FAQ

### Môžem používať OpenCode Chat pre viacero vaultov?

Áno. Vytvor viacero MCP konfigurácií v `~/.config/opencode/config.json`:

```json
{
  "mcp": {
    "vault1": {
      "type": "local",
      "command": ["npx", "-y", "@mauricio.wolff/mcp-obsidian@latest", "/cesta/k/vault1"]
    },
    "vault2": {
      "type": "local",
      "command": ["npx", "-y", "@mauricio.wolff/mcp-obsidian@latest", "/cesta/k/vault2"]
    }
  }
}
```

AI môže pristupovať k obom.

---

### Ako resetovať session históriu?

Klikni na **[+]** (nová session) v chat headeri.

Alebo:
```bash
# Vymazať všetky sessions (Linux/macOS)
rm -rf ~/.local/share/opencode/sessions/*
```

---

### Môžem upraviť šablóny?

Áno! Šablóny v `templates/` sú plne editovateľné.

Tip: Použi **Templater plugin** pre pokročilé šablóny s JavaScript logikou.

---

### Ako exportovať chat históriu?

```
👤: Exportuj túto session do conversations/2026-02-28-chat.md
```

AI vytvorí markdown súbor s celou konverzáciou.

---

### Môžem používať iné jazyky okrem slovenčiny?

Áno. Aktualizuj `system/opencode-rules.md`:

```markdown
### Štýl písania

- Jazyk: angličtina (alebo slovenčina podľa preferencie)
```

---

### Koľko sessions môžem mať aktívnych?

OpenCode nepobehá limit na sessions. História zobrazuje posledných 20.

---

## Ďalšie zdroje

- **OpenCode dokumentácia:** https://opencode.ai/docs
- **MCP Obsidian GitHub:** https://github.com/mauriciowolff/mcp-obsidian
- **Obsidian Help:** https://help.obsidian.md
- **Projektová dokumentácia:** [[../architektura]]

---

**Verzia:** 1.0  
**Dátum:** 2026-02-28  
**Plugin verzia:** 1.2.9
