# Kit MCP Server

A Model Context Protocol (MCP) server for [Kit.com](https://kit.com) (formerly ConvertKit) that enables AI assistants like Claude to create and manage email broadcasts, subscribers, and tags.

## Features

- 📧 **Create Email Broadcasts** - Draft and create email broadcasts directly from conversations
- 📅 **Schedule Emails** - Schedule broadcasts for future delivery
- 👥 **Manage Subscribers** - Add, update, and tag subscribers
- 🏷️ **Tag Management** - Create and apply tags to organize your list
- 🎯 **Segment Lists** - Query subscribers by tags and segments

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

**Examples:**
- "Create a draft email about symptoms vs root causes in app marketing"
- "Schedule this email for next Tuesday at 9am"
- "Add the tag 'shopify-founders' to subscribers who opened my last 3 emails"
- "Show me how many subscribers have the 'engaged' tag"

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
