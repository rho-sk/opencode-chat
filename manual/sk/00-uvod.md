---
created: '2026-02-28'
updated: '2026-03-01'
tags:
  - type/reference
  - project/opencode-chat
  - topic/documentation
---
# OpenCode Chat – Úvod

## Čo je OpenCode Chat?

OpenCode Chat je Obsidian plugin, ktorý ti umožňuje komunikovať s **AI agentom priamo z tvojho vaultu**. Agent má prístup k tvojim poznámkam a môže ti pomôcť s ich správou, organizáciou a tvorbou obsahu.

Plugin je **provider-agnostický** – funguje s akýmkoľvek LLM providerom, ktorý OpenCode podporuje (Amazon Bedrock, Ollama, Anthropic API, OpenAI a ďalšie). Povinnou súčasťou je **MCP prístup k vaultu** cez `mcp-obsidian`.

> **Chceš konkrétny setup s Amazon Bedrock + vault guidelines?**
> Pozri projekt **[opencode-obsidian-ai-workspace](https://github.com/rho-sk/opencode-obsidian-ai-workspace)** – obsahuje kompletný Bedrock setup, system rules a templates.

---

## Prečo OpenCode Chat?

### Vault zostáva lokálny – vždy

Na rozdiel od tradičných AI chatbotov (ChatGPT, Claude web), kde tvoje dáta putujú na cudzie servery, **OpenCode Chat beží lokálne na tvojom počítači**.

**Čo to znamená v praxi:**

- ✅ **Vault zostáva na tvojom PC** – súbory sa nikdy nenahrávajú do cloudu
- ✅ **Lokálny server** – OpenCode beží na `localhost`, nie na verejnom internete
- ✅ **Kontrola nad dátami** – len ty rozhoduješ, ktoré poznámky zdieľaš s agentom
- ✅ **Audit trail** – vieš presne, ktoré nástroje agent použil (v chat histórii)

**Čo ide cez internet závisí od zvoleného LLM providera:**
- **Amazon Bedrock** – GDPR compliant, EU región, žiadne logovanie *(odporúčané pre súkromie)*
- **Ollama** – plne offline, žiadny internet
- **Anthropic API / OpenAI** – dáta idú cez ich servery (skontroluj ich podmienky)

### Porovnanie s alternatívami

| Vlastnosť | OpenCode Chat | ChatGPT web | Claude web | BMO Chatbot |
|---|---|---|---|---|
| **Lokálny vault prístup** | ✅ Priamy cez MCP | ❌ Nie | ❌ Nie | ✅ Cez API |
| **Vault súbory zostávajú lokálne** | ✅ Vždy | ❌ Cloud | ❌ Cloud | ✅ Áno |
| **Voľba LLM providera** | ✅ Ľubovoľný | ❌ OpenAI | ❌ Anthropic | ⚠️ Obmedzené |
| **Offline prístup k vaultu** | ✅ Áno | ❌ Nie | ❌ Nie | ✅ Áno |
| **Streaming odpovede** | ✅ SSE real-time | ✅ Áno | ✅ Áno | ❌ Nie |
| **Obsidian integrácia** | ✅ Natívny plugin | ❌ Nie | ❌ Nie | ✅ Plugin |
| **Náklady** | 💰 Závisí od providera | 💰 $20/mesiac | 💰 $20/mesiac | 💰 Závisí |

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
│   Obsidian Desktop          │  ← Ty píšeš poznámky
│   ┌─────────────────────┐   │
│   │ OpenCode Chat Plugin│   │  ← Chat rozhranie
│   └──────────┬──────────┘   │
└──────────────┼───────────────┘
               │ HTTP API (localhost:4096)
               ▼
┌──────────────────────────────┐
│  OpenCode Server (lokálne)  │  ← AI agent engine
└──────────────┬───────────────┘
               │ LLM Provider API (konfigurovateľné)
               ▼
┌──────────────────────────────┐
│  LLM Provider                │  ← napr. Amazon Bedrock, Ollama,
│                              │      Anthropic API, OpenAI, ...
└──────────────┬───────────────┘
               │ MCP Protocol (povinné)
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
- **Vault súbory** nikdy neopúšťajú tvoj PC
- **LLM provider** je voliteľný – zmenou konfigurácie môžeš prepnúť na iný

---

## Čo potrebuješ?

### Softvér

- **Obsidian** (desktop aplikácia) – https://obsidian.md
- **Node.js 20+** – pre OpenCode a mcp-obsidian
- **OpenCode** – AI agent platform
- **LLM provider** – AWS účet (Bedrock), alebo Ollama pre offline, alebo iné

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

Závisí od zvoleného LLM providera:

| Provider | Náklady | Poznámka |
|---|---|---|
| **Amazon Bedrock** | ~$5-10/mesiac | Odporúčané – privacy, GDPR, EU región |
| **Ollama** | Zadarmo | Plne offline, slabší výkon, vyššie HW nároky |
| **Anthropic API** | ~$5-15/mesiac | Priamy Anthropic účet |
| **OpenAI API** | ~$5-20/mesiac | GPT modely |

---

## Bezpečnosť a súkromie

### Čo zostáva lokálne vždy (bez ohľadu na provider):

✅ **Všetky vault súbory** – nikdy sa nenahrávajú do cloudu
✅ **OpenCode konfigurácia** – uložená lokálne
✅ **Chat história** – uložená v OpenCode session DB (lokálne)

### Čo ide cez internet:

Závisí od LLM providera. **Odporúčaný provider pre maximálne súkromie:** Amazon Bedrock
- Žiadne logovanie, stateless API, GDPR compliant, EU región (`eu-central-1`)
- AWS Terms of Service: dáta sa nepoužívajú na tréning modelov
- Dokumentácia: https://aws.amazon.com/bedrock/data-protection/

Pre kompletný Bedrock setup pozri: **[opencode-obsidian-ai-workspace](https://github.com/rho-sk/opencode-obsidian-ai-workspace)**

### Offline alternatíva (Ollama)

Ak nechceš používať cloud LLM:

```bash
curl https://ollama.ai/install.sh | sh
ollama pull llama3.2
```

OpenCode konfigurácia pre Ollama:

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

Vault súbory zostávajú na tvojom PC vždy. Čo ide cez internet závisí od LLM providera – pre maximálne súkromie použi Amazon Bedrock alebo Ollama.

### Potrebujem AWS účet?

Nie nutne. AWS účet potrebuješ len pre Amazon Bedrock. Alternatívne môžeš použiť Ollama (offline), Anthropic API alebo iný provider.

### Funguje to offline?

Závisí od LLM providera. S Ollama – plne offline. S cloud providermi (Bedrock, Anthropic, OpenAI) – vyžaduje internet pre LLM volania. OpenCode server a mcp-obsidian samotné bežia lokálne vždy.

### Môžem používať iný LLM provider?

Áno. OpenCode podporuje Amazon Bedrock, Anthropic API, OpenAI, Azure, Google Vertex AI, Ollama a ďalšie.

### Koľko to stojí?

Závisí od providera. Amazon Bedrock ~$5-10/mesiac pri bežnom používaní. Ollama zadarmo (ale potrebuješ silný HW).

### Sú moje dáta v bezpečí?

Vault zostáva lokálne vždy. Pre prompty/odpovede – závisí od LLM providera. Bedrock: žiadne logovanie, GDPR. Ollama: plne offline.

---

**Ďalší dokument:** [[01-instalacia]] – Kompletný inštalačný návod
