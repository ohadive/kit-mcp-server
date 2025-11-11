# Setup Guide for Kit MCP Server

This guide will walk you through setting up the Kit MCP Server with Claude Desktop.

## Prerequisites

- Node.js 18 or higher
- Claude Desktop app installed
- Kit.com (ConvertKit) account

## Step 1: Get Your Kit API Credentials

1. Log in to your Kit account
2. Go to **Settings > Advanced > API & Webhooks**
3. You'll find your **API Key** (starts with your account ID)
4. Click **Generate API Secret** if you haven't already
5. Copy both the API Key and API Secret

## Step 2: Clone and Build the Project

```bash
# Clone the repository
git clone https://github.com/ohadive/kit-mcp-server.git
cd kit-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Step 3: Configure Claude Desktop

### macOS

Edit the config file at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Windows

Edit the config file at:
```
%APPDATA%\Claude\claude_desktop_config.json
```

### Configuration

Add this to your config file (replace `/path/to/kit-mcp-server` with your actual path):

```json
{
  "mcpServers": {
    "kit": {
      "command": "node",
      "args": ["/path/to/kit-mcp-server/dist/index.js"],
      "env": {
        "KIT_API_KEY": "your_api_key_here",
        "KIT_API_SECRET": "your_api_secret_here"
      }
    }
  }
}
```

**Example (macOS):**
```json
{
  "mcpServers": {
    "kit": {
      "command": "node",
      "args": ["/Users/ohad/kit-mcp-server/dist/index.js"],
      "env": {
        "KIT_API_KEY": "12345_abcdefgh",
        "KIT_API_SECRET": "your-secret-key-here"
      }
    }
  }
}
```

## Step 4: Restart Claude Desktop

Close and reopen Claude Desktop for the changes to take effect.

## Step 5: Test the Connection

In Claude Desktop, try these commands:

1. **List your broadcasts:**
   ```
   Can you list my recent email broadcasts?
   ```

2. **Create a draft email:**
   ```
   Create a draft email with subject "Test Email" and content "This is a test email from the Kit MCP Server"
   ```

3. **List your tags:**
   ```
   Show me all my subscriber tags
   ```

## Available Commands

Once configured, you can interact with Kit through natural language. Here are some examples:

### Email Broadcasts

- "Create a draft email about [topic]"
- "Schedule this email for next Tuesday at 9am EST"
- "Show me my last 10 broadcasts"
- "Get details about broadcast ID 12345"

### Subscribers

- "Add a subscriber: john@example.com with first name John"
- "Show me all subscribers with the 'shopify-founders' tag"
- "Tag sarah@example.com with 'vip-customer'"
- "List my recent subscribers"

### Tags

- "Create a new tag called 'engaged-readers'"
- "Show me all my tags"
- "Add the 'product-launch' tag to mike@example.com"

## Troubleshooting

### Server Not Starting

If the server doesn't start, check:
1. Node.js is installed (`node --version`)
2. The path in your config is correct (absolute path, not relative)
3. The dist folder exists (run `npm run build` if not)

### API Errors

If you get API errors:
1. Verify your API credentials are correct
2. Check that you have the right permissions in Kit
3. Make sure your API secret hasn't expired

### Claude Can't Find the Server

1. Check the config file syntax (valid JSON)
2. Restart Claude Desktop completely
3. Check Claude Desktop's logs (Help > View Logs)

## Next Steps

Now that your server is running, you can:

1. Create email drafts directly from your conversations with Claude
2. Schedule emails for future delivery
3. Manage your subscriber list and tags
4. Automate your email workflow

For more examples and use cases, see the main [README.md](README.md).
