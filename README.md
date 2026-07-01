# From Dev to Dev

A production-oriented Telegram bot and lightweight web workbench for Telegram Rich Messages, formatting validation, AI-assisted beautification, and forwarded bot message replication.

## Folder Structure

```text
src/
├── commands/              # Slash command registration
├── handlers/              # Telegram update and menu handlers
├── middlewares/           # Error boundaries and cross-cutting Telegraf middleware
├── services/
│   ├── formatter/         # Rich message building and repair
│   ├── gemini/            # Gemini API client
│   ├── replication/       # Forwarded bot message inspection and replication
│   └── telegram/          # Telegram API helpers and sessions
├── utils/                 # HTML escaping, truncation, logging
├── validators/            # Telegram formatting validation
├── parsers/               # Input format detection
├── menus/                 # User-facing text copy
├── keyboards/             # Reply and inline keyboard builders
├── web/                   # Modern live preview web application
├── config/                # Environment configuration and validation
├── routes/                # HTTP server routes
└── index.js               # Application bootstrap
```

The root `index.js` only loads `src/index.js` for backward compatibility with existing hosting settings.

## Installation

```bash
npm install
BOT_TOKEN=123:abc npm start
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `BOT_TOKEN` | Yes | Telegram bot token from BotFather. |
| `GEMINI_API_KEY` | No | Enables AI beautification and formatting Q&A. |
| `BOT_OWNER_ID` | No | Numeric Telegram user ID allowed to set a temporary Gemini key. |
| `PORT` | No | HTTP port for the web app. Defaults to `3000`. |
| `PUBLIC_HOST` | No | Public host metadata for deployments. |

## Slash Commands

- `/start` - open the main menu.
- `/help` - show command and feature help.
- `/menu` - show the main menu.
- `/preview` - preview Telegram Rich Message input.
- `/beautify` - beautify plain text with Gemini.
- `/validate` - validate HTML, Markdown, or InputRichMessage JSON.
- `/fix` - validate and auto-repair safe HTML issues.
- `/convert` - alias for repair/conversion workflow.
- `/examples` - show example formatting.
- `/docs` - show the formatting guide.
- `/settings` - show session and environment settings.
- `/about` - show project information.
- `/replicate` - prompt for a forwarded bot message.
- `/myid` - show your Telegram numeric user ID.
- `/setgemini KEY` - owner-only in-memory Gemini key.
- `/cleargemini` - owner-only clear temporary Gemini key.

All major button workflows have command equivalents.

## Feature Overview

### Formatting Engine

The bot detects HTML, Markdown/Rich Markdown, and JSON payloads. It validates common Telegram Rich Message constraints, including unsupported tags, bad nesting, media URL restrictions, unclosed tags, unbalanced Markdown delimiters, and maximum message size.

### AI Features

When `GEMINI_API_KEY` is configured, the beautify and Q&A workflows use Gemini to generate or explain Telegram-compatible formatting. The validator still checks generated output before sending.

### Bot Message Replication

Forward a message from another Telegram bot to inspect it. The inspector reports:

- Message/media type.
- Text or caption.
- Formatting entities.
- Exposed parse-mode information.
- Inline keyboard row/button structure.
- Compatibility notes.
- Potential issues and suggested next actions.

The inline actions allow replication, copying exposed text/caption, exporting inspection JSON, beautification, and validation.

#### Telegram Bot API Limitations

Telegram does not expose every detail of an original message. The bot never fabricates missing data. Known limitations include:

- The original `parse_mode` is not exposed after Telegram parses a message.
- Hidden forward origins cannot be reliably attributed.
- Some callback behavior and bot-private state cannot be recovered.
- Protected content and expired/unavailable file IDs may not be resendable.
- Only inline keyboard data included in the received update can be reproduced.

### Web App Usage

The HTTP server serves a modern developer tool with:

- Split editor and preview layout.
- Dark, responsive dashboard styling.
- Real-time preview updates.
- Copy/export/example buttons.
- Formatting/error inspector.
- Mobile-friendly layout.

Open the app at `http://localhost:3000` by default.

## Troubleshooting

- **Bot exits immediately:** set `BOT_TOKEN`.
- **AI features fail:** configure `GEMINI_API_KEY` or use owner-only `/setgemini KEY` after setting `BOT_OWNER_ID`.
- **Replication is incomplete:** check the inspector limitations; Telegram may not expose the missing field.
- **Rich message sending fails:** validate input with `/validate`, then repair with `/fix`.

## Development Guide

- Keep command entry points thin and move business logic into services.
- Add reusable text in `src/menus/texts.js` and reusable buttons in `src/keyboards/`.
- Keep validators pure and deterministic.
- Handle Telegram API limitations explicitly in user-facing messages.
- Prefer incremental modules over large files.
