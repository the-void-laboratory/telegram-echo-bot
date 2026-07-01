# ⚡ From Dev → DEV

A production-oriented Telegram bot and lightweight web workbench for Telegram Rich Messages, formatting validation, repair workflows, and natural Gemini-powered developer assistance.

## Project Structure

```text
src/
├── commands/              # Slash command registration
├── handlers/              # Telegram update and menu handlers
├── services/
│   ├── formatter/         # Rich Message building and repair helpers
│   ├── gemini/            # Gemini assistant client and Telegram docs context
│   └── telegram/          # Telegram send/session helpers
├── validators/            # Rich Message validation
├── parsers/               # Input format detection
├── keyboards/             # Reply keyboard layout
├── menus/                 # User-facing text copy
├── web/                   # Modern live preview web application
├── routes/                # HTTP server routes
└── utils/                 # Shared helpers
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `BOT_TOKEN` | Yes | Telegram bot token from BotFather. |
| `GEMINI_API_KEY` | No | Enables natural AI assistant responses. |
| `BOT_OWNER_ID` | No | Numeric Telegram user ID allowed to set a temporary Gemini key. |
| `PORT` | No | HTTP port for the web app. Defaults to `3000`. |

## Commands

- `/start` - open the main menu.
- `/menu` - show the main menu.
- `/help` - show usage help.
- `/preview` - preview Telegram Rich Message input.
- `/validate` - validate HTML, MarkdownV2/Rich Markdown, or InputRichMessage JSON.
- `/fix` and `/convert` - inspect and repair formatting when possible.
- `/assistant` - switch back to natural AI assistant chat.
- `/docs` - show formatting guidance.
- `/examples` - show Rich Messages examples.
- `/settings` - show current session settings.
- `/about` - explain the bot.
- `/myid` - print your numeric Telegram user ID.
- `/setgemini KEY` - owner-only in-memory Gemini key.
- `/cleargemini` - owner-only clear temporary Gemini key.

## AI Assistant

When `GEMINI_API_KEY` is configured, non-command messages in assistant mode are sent to Gemini. The assistant handles greetings, programming questions, JavaScript help, Telegram Bot API questions, Rich Messages, HTML formatting, MarkdownV2, debugging, code review, and best-practice advice.

For Telegram-specific topics, the bot fetches official Telegram documentation context from:

- <https://core.telegram.org/bots/api-changelog#june-11-2026>
- <https://core.telegram.org/bots/api#rich-messages>

If those pages cannot be verified at runtime, the assistant is instructed to say that it cannot confirm the Telegram-specific claim from official documentation.

## Bot Menu

```text
📖 Preview Text        🛠 Validate Formatting
🔍 Fix Formatting      🤖 AI Assistant
📚 Formatting Guide    🆕 Rich Messages
⚙️ Settings            ❓ Help
```

## Web Workbench

The web app provides a live Telegram-style preview, editor, entity/error inspector, copy action, export action, and example loader for Rich Message experiments.

## Development

```bash
npm install
npm run check
npm start
```

## Troubleshooting

- **Bot does not start:** verify `BOT_TOKEN`.
- **AI assistant fails:** configure `GEMINI_API_KEY` or use owner-only `/setgemini KEY` after setting `BOT_OWNER_ID`.
- **Telegram formatting is rejected:** use `/validate` or `/fix` and check the reported offset and suggested repair.
