---
created: '2026-02-28'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
---
# OpenCode Chat – Úvod

## Čo je OpenCode Chat?

OpenCode Chat je Obsidian plugin, ktorý ti umožňuje komunikovať s **AI agentom priamo z tvojho vaultu**. Agent má prístup k tvojim poznámkám a môže ti pomôcť s ich správou, organizáciou a tvorbou obsahu.

---

## Prečo OpenCode Chat?

### 🔒 Data Privacy na prvom mieste

Na rozdiel od tradičných AI chatbotov (ChatGPT, Claude web), kde tvoje dáta putujú na cudzie servery, **OpenCode Chat beží lokálne na tvojom počítači**.

**Čo to znamená v praxi:**

- ✅ **Vault zostáva na tvojom PC** – súbory sa nikdy nenahrávajú do cloudu
- ✅ **Lokálny server** – OpenCode beží na `localhost`, nie na verejnom internete
- ✅ **Kontrola nad dátami** – len ty rozhoduješ, ktoré poznámky zdieľaš s agentom
- ✅ **GDPR compliant** – Amazon Bedrock EU región (`eu-central-1`)
- ✅ **Žiadne logovanie** – AWS Bedrock neukladá tvoje prompty ani odpovede
- ✅ **Audit trail** – vieš presne, ktoré nástroje agent použil (v chat histórii)

### Porovnanie s alternatívami

| Vlastnosť | OpenCode Chat | ChatGPT web | Claude web | BMO Chatbot |
|---|---|---|---|---|
| **Lokálny vault prístup** | ✅ Priamy cez MCP | ❌ Nie | ❌ Nie | ✅ Cez API |
| **Data privacy** | ✅ Lokálny server | ❌ Cloud | ❌ Cloud | ⚠️ Závisí od LLM |
| **Offline prístup k vaultu** | ✅ Áno | ❌ Nie | ❌ Nie | ✅ Áno |
| **Streaming odpovede** | ✅ SSE real-time | ✅ Áno | ✅ Áno | ❌ Nie |
| **Obsidian integrácia** | ✅ Natívny plugin | ❌ Nie | ❌ Nie | ✅ Plugin |
| **Náklady** | 💰 $5-10/mesiac | 💰 $20/mesiac | 💰 $20/mesiac | 💰 Závisí |

---

## Čo ti OpenCode Chat prinesie?

### 1. **Inteligentný asistent pre tvoj vault**

```
👤 "Nájdi všetky poznámky o AI, ktoré som vytvoril tento mesiac"
🤖 *Prehľadá vault a zobrazí relevantné poznámky*
```

### 2. **Automatizácia opakujúcich sa úloh**

```
👤 "Vytvor projektovú poznámku podľa šablóny pre projekt 'mobilná aplikácia'"
🤖 *Načíta šablónu, vyplní metadata, vytvorí poznámku*
```

### 3. **Organizácia a tagovanie**

```
👤 "Pridaj tag #status/done do všetkých hotových úloh v projekte XYZ"
🤖 *Nájde úlohy, pridá tagy*
```

### 4. **Generovanie obsahu**

```
👤 "Na základe poznámok v projekte napíš zhrnutie pokroku"
🤖 *Prečíta poznámky, vytvorí markdown report*
```

### 5. **Refaktoring a úpravy**

```
👤 "Aktualizuj všetky poznámky v projekte – zmeň tag #status/active na #status/archived"
🤖 *Batch update tagov*
```

---

## Ako to funguje? (Architektúra)

```
┌─────────────────────────────┐
│   Obsidian Desktop         │  ← Ty píšeš poznámky
│   ┌─────────────────────┐  │
│   │ OpenCode Chat Plugin│  │  ← Chat rozhranie
│   └──────────┬──────────┘  │
└──────────────┼──────────────┘
               │ HTTP API (localhost:4096)
               ▼
┌──────────────────────────────┐
│  OpenCode Server (lokálne)  │  ← AI agent engine
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
│  mcp-obsidian                │  ← Prístup k vault súborom
│  (číta z filesystem)         │
└──────────────┬───────────────┘
               │ Filesystem I/O
               ▼
┌──────────────────────────────┐
│  Tvoj Obsidian Vault         │  ← Poznámky zostávajú lokálne
└──────────────────────────────┘
```

**Kľúčové body:**

- **OpenCode** beží na tvojom počítači (nie cloud)
- **mcp-obsidian** číta vault priamo z filesystému (žiadny HTTP server)
- **Amazon Bedrock** je len LLM provider (stateless API, žiadne logovanie)
- **Vault súbory** nikdy neopúšťajú tvoj PC

---

## Čo potrebuješ?

### Softvér

- **Obsidian** (desktop aplikácia) – https://obsidian.md
- **Node.js 20+** – pre OpenCode a mcp-obsidian
- **OpenCode** – AI agent platform
- **AWS účet** – pre Amazon Bedrock API

### Technické znalosti

**Minimálne:**
- Ovládanie terminálu (spúšťanie príkazov)
- Základy práce s konfiguračnými súbormi

**Odporúčané:**
- Pochopenie REST API
- Základy systemd (Linux) alebo services (macOS/Windows)

### Čas inštalácie

- **Prvá inštalácia:** ~30-45 minút
- **Následné setupy:** ~10 minút

---

## Náklady

### Amazon Bedrock pricing (približne)

| Model | Input ($/1M tokenov) | Output ($/1M tokenov) | Odporúčané pre |
|---|---|---|---|
| **Claude 3.5 Sonnet v2** | $3 | $15 | Komplexné úlohy, kód, analýza |
| **Claude 3.5 Haiku** | $1 | $5 | Jednoduché otázky, vyhľadávanie |

**Reálne použitie:**

- 100-200 správ denne (mix Sonnet + Haiku): **~$5-10 / mesiac**
- Power user (500+ správ denne): **~$20-30 / mesiac**

**Tip:** Použi Haiku pre jednoduché úlohy (vyhľadávanie, tagovanie) a Sonnet pre komplexné (generovanie obsahu, refaktoring).

---

## Bezpečnosť a súkromie

### Čo zostáva lokálne?

✅ **Všetky vault súbory** – nikdy sa nenahrávajú do cloudu  
✅ **OpenCode konfigurácia** – uložená lokálne  
✅ **Chat história** – uložená v OpenCode session DB (lokálne)  
✅ **AWS credentials** – uložené v `~/.aws/credentials` (file permissions 600)

### Čo ide cez internet?

⚠️ **Len tvoje prompty a odpovede** – putujú cez AWS Bedrock API  
⚠️ **Obsah poznámok** – len ak explicitne požiadaš agenta o ich prečítanie

### Ako AWS Bedrock spracováva dáta?

- **Žiadne logovanie** – Bedrock neukladá tvoje prompty ani odpovede
- **Stateless API** – žiadna perzistencia dát na AWS strane
- **GDPR compliant** – používame EU región (`eu-central-1`)
- **AWS Terms of Service** – AWS sa zaväzuje, že nepoužije tvoje dáta na tréning modelov

**Oficiálna dokumentácia:** https://aws.amazon.com/bedrock/data-protection/

---

## Alternatívy (ak chceš 100% offline)

Ak nechceš používať cloud LLM, môžeš použiť **Ollama** (lokálne modely):

- ✅ **Plne offline** – žiadne API volania
- ✅ **Zadarmo** – žiadne mesačné náklady
- ❌ **Slabší výkon** – menšie modely = horšie výsledky
- ❌ **Vyššie HW požiadavky** – potrebuješ silný GPU/CPU

**Inštalácia Ollama:**

```bash
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

**OpenCode konfigurácia:**

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

---

## Ďalšie kroky

Teraz, keď rozumieš konceptu, prejdi na inštaláciu:

👉 **[[01-instalacia]]** – Krok za krokom setup

---

## Často kladené otázky

### Je to bezpečné?

Áno. OpenCode beží lokálne, vault súbory zostávajú na tvojom PC. Len prompty a odpovede idú cez AWS Bedrock (GDPR-compliant, žiadne logovanie).

### Potrebujem AWS účet?

Áno, pre Amazon Bedrock. Alternatívne môžeš použiť Ollama (lokálne modely, offline).

### Funguje to offline?

Čiastočne. OpenCode + mcp-obsidian funguje offline, ale LLM (Bedrock) vyžaduje internet. Pre plný offline režim použi Ollama.

### Môžem používať iný LLM provider?

Áno. OpenCode podporuje Anthropic API, OpenAI, Azure, Google Vertex AI, Ollama.

### Koľko to stojí?

AWS Bedrock: ~$5-10/mesiac pri bežnom používaní. Ollama: zadarmo (ale potrebuješ silný HW).

### Sú moje dáta v bezpečí?

Áno. Vault zostáva lokálne, AWS Bedrock neukladá tvoje prompty, používame EU región (GDPR).

---

**Ďalší dokument:** [[01-instalacia]] – Kompletný inštalačný návod
