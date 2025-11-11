# Kit MCP Server

A **secure** Model Context Protocol (MCP) server for [Kit.com](https://kit.com) (formerly ConvertKit) that enables AI assistants like Claude to create and manage email broadcasts, subscribers, and tags.

## 🔒 Security First

**All write operations require explicit user approval** - nothing happens without your confirmation.

- ✅ Preview every action before it executes
- ✅ Approve or deny each operation individually
- ✅ Read-only operations work instantly (viewing data)
- ✅ Local-only - runs entirely on your machine
- ✅ Your API keys never leave your computer

See [SECURITY.md](SECURITY.md) for complete security documentation.

## Features

- 📧 **Create Email Broadcasts** - Draft and create email broadcasts (with approval)
- 📅 **Schedule Emails** - Schedule broadcasts for future delivery (with approval)
- 👥 **Manage Subscribers** - Add, update, and tag subscribers (with approval)
- 🏷️ **Tag Management** - Create and apply tags (with approval)
- 🎯 **View Data** - List broadcasts, subscribers, and tags (instant, no approval needed)

## Installation

```bash
npm install
npm run build
```

## Configuration

1. Get your Kit API credentials:
   - Go to [Kit Settings > Advanced > API & Webhooks](https://app.kit.com/account_settings/advanced)
   - Generate an API Secret
   - Copy your API Key

2. Configure in Claude Desktop:

Edit your Claude Desktop config file:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "kit": {
      "command": "node",
      "args": ["/path/to/kit-mcp-server/dist/index.js"],
      "env": {
        "KIT_API_KEY": "your-api-key-here",
        "KIT_API_SECRET": "your-api-secret-here"
      }
    }
  }
}
```

3. Restart Claude Desktop

## Usage

Once configured, you can interact with Kit through natural language in Claude:

### Read Operations (Instant, No Approval)
- "List my recent broadcasts"
- "Show me all subscribers with the 'shopify-founders' tag"
- "List all my tags"

### Write Operations (Require Approval)
- "Create a draft email about symptoms vs root causes"
  - Claude will show you the preview
  - You say "yes, go ahead" or "approve"
  - Claude executes the approved operation

- "Add john@example.com to my list"
  - Preview shown
  - You approve
  - Subscriber added

### How Approval Works

1. You ask Claude to do something (e.g., create an email)
2. Claude shows you exactly what will happen
3. You explicitly approve or deny
4. Only then does it execute

**Example:**
```
You: "Create a draft email with subject 'Test' and content 'Hello World'"

Claude: "I've prepared this email broadcast:
- Subject: Test
- Content: Hello World
- Status: Draft (not sent)

Should I proceed with creating this draft?"

You: "Yes"

Claude: ✅ Draft created successfully!
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev
```

## Kit API Documentation

This server uses the [Kit API v4](https://developers.kit.com/). Key endpoints:
- Broadcasts
- Subscribers
- Tags
- Forms
- Sequences

## License

MIT

## Author

Ohad Michaeli - [https://github.com/ohadive](https://github.com/ohadive)
