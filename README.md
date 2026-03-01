# OpenCode Chat – Obsidian Plugin

AI assistant directly inside your Obsidian vault. Local OpenCode server + Amazon Bedrock + MCP protocol for vault file access.

## Installation

### Option 1 – Manual install (ZIP)

1. Go to the [Releases page](https://github.com/rho-sk/opencode-chat/releases/latest)
2. Download `opencode-chat-v*.zip`
3. Extract into your vault's plugins folder:

```bash
unzip opencode-chat-v*.zip -d /path/to/vault/.obsidian/plugins/
```

4. In Obsidian: **Settings → Community plugins → Enable "OpenCode Chat"**

### Option 2 – Obsidian Community Plugin

Coming soon.

See [manual/en/01-installation.md](manual/en/01-installation.md) for the full setup guide (OpenCode server, AWS Bedrock, MCP).

## Repository structure

```
opencode-chat/
├── src/                    # Plugin source code
│   ├── main.ts             # TypeScript source (edit only here)
│   ├── styles.css          # CSS styles
│   └── manifest.json       # Plugin metadata (id, version, minAppVersion)
├── build/
│   ├── build.sh            # The only permitted way to build and install
│   ├── esbuild.mjs         # esbuild config (TS → CJS bundle)
│   ├── install.mjs         # copies to vault (called by build.sh --install)
│   └── dist/               # Build output – gitignored
├── manual/
│   ├── sk/                 # Slovak documentation
│   │   ├── 00-uvod.md
│   │   ├── 01-instalacia.md
│   │   └── 02-pouzivanie.md
│   └── en/                 # English documentation
│       ├── 00-introduction.md
│       ├── 01-installation.md
│       └── 02-usage.md
├── package.json
├── tsconfig.json
└── .gitignore
```

## Build

```bash
# Build ZIP from src/ (version from manifest.json)
./build/build.sh

# Build + install directly into vault
./build/build.sh --install

# Custom version
./build/build.sh --version 1.4.0

# Custom vault path (default: ~/work/obsidian/work)
OBSIDIAN_VAULT_PATH=/path/to/vault ./build/build.sh --install
```

Output: `build/dist/opencode-chat-v<version>.zip`

## Plugin installation

```bash
unzip build/dist/opencode-chat-v*.zip -d /path/to/vault/.obsidian/plugins/
```

Then in Obsidian: Settings → Community plugins → Enable "OpenCode Chat".

## Architecture

- **Plugin** communicates with a local OpenCode server via HTTP API (port 4096)
- **SSE streaming** – tokens are rendered live in the chat
- **Amazon Bedrock** – Claude 3.5 Sonnet/Haiku (EU region, GDPR)
- **mcp-obsidian** – agent accesses vault files via MCP protocol

## Documentation

| Language | Introduction | Installation | Usage |
|---|---|---|---|
| English | [00-introduction.md](manual/en/00-introduction.md) | [01-installation.md](manual/en/01-installation.md) | [02-usage.md](manual/en/02-usage.md) |
| Slovak | [00-uvod.md](manual/sk/00-uvod.md) | [01-instalacia.md](manual/sk/01-instalacia.md) | [02-pouzivanie.md](manual/sk/02-pouzivanie.md) |

## Plugin settings

| Setting | Value |
|---|---|
| Server URL | `http://localhost:4096` |
| Default model | `amazon-bedrock/global.anthropic.claude-sonnet-4-6` |
| Default agent | `build` |
| Rules path | `system/opencode-rules.md` |
| Send shortcut | `Ctrl+Enter` |

## Version

Current version is in `src/manifest.json`.
