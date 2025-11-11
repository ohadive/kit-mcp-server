# Security Features

The Kit MCP Server includes multiple layers of security to protect your Kit account from unauthorized or accidental actions.

## Approval System

All write operations (creating broadcasts, adding subscribers, creating tags) **require explicit user approval** before execution.

### How It Works

1. **Request Phase**: When Claude wants to perform a write operation, it calls the tool (e.g., `create_broadcast`)
2. **Preview**: The server shows you exactly what will happen and generates an approval ID
3. **Approval**: You explicitly tell Claude "approve that operation" or use the approval ID
4. **Execution**: Only after your approval does the operation execute

### Example Workflow

```
You: "Create a draft email about symptoms vs root causes"

Claude: [Calls create_broadcast tool]

Server Response:
⚠️ APPROVAL REQUIRED ⚠️

📧 CREATE EMAIL BROADCAST

Subject: Symptoms vs Root Causes
Content: Most founders who reach out to me...
📝 Status: DRAFT

🔑 Approval ID: approval_1

To proceed, the user must explicitly approve using:
approve_operation with approval_id: approval_1

Claude: "I've prepared the email broadcast. Here's what it will create:
- Subject: Symptoms vs Root Causes
- Status: Draft (not sent)

Would you like me to proceed with creating this draft?"

You: "Yes, go ahead"

Claude: [Calls approve_operation with approval_id: approval_1]

Server: ✅ OPERATION APPROVED AND EXECUTED
```

## Read vs Write Operations

### Read Operations (No Approval Needed)
These are safe and execute immediately:
- `list_broadcasts` - View your broadcasts
- `get_broadcast` - View broadcast details
- `list_subscribers` - View subscribers
- `list_tags` - View tags

### Write Operations (Approval Required)
These require explicit approval:
- `create_broadcast` - Create email broadcasts
- `add_subscriber` - Add new subscribers
- `create_tag` - Create new tags
- `tag_subscriber` - Apply tags to subscribers

### Forbidden Operations
These operations are completely disabled for safety:
- `delete_broadcast` - Cannot delete broadcasts
- `unsubscribe` - Cannot remove subscribers

## Configuration

You can customize which operations require approval by editing `permissions.json`:

```json
{
  "read_operations": ["list_broadcasts", "list_subscribers", "list_tags"],
  "write_operations_require_approval": ["create_broadcast", "add_subscriber"],
  "forbidden_operations": ["delete_broadcast", "unsubscribe"]
}
```

## Approval Management

### List Pending Approvals
```
Claude: [Calls list_pending_approvals]
```

Shows all operations waiting for your approval.

### Cancel an Approval
```
Claude: [Calls cancel_approval with approval_id]
```

Cancels a pending operation without executing it.

### Approval Expiration
Pending approvals automatically expire after 1 hour for security.

## API Key Security

### Best Practices

1. **Never commit API keys to git** - They're in `.gitignore` by default
2. **Store keys in Claude Desktop config only** - Not in code or env files
3. **Use separate Kit accounts for testing** - Test on a non-production account first
4. **Rotate keys regularly** - Generate new API keys periodically
5. **Monitor your Kit account** - Check for unexpected activity

### If Your Keys Are Compromised

1. Go to Kit Settings > Advanced > API & Webhooks
2. Revoke the compromised API secret
3. Generate a new API secret
4. Update your Claude Desktop config
5. Restart Claude Desktop

## Local-Only Architecture

The MCP server runs entirely on your machine:
- ✅ No cloud service
- ✅ No remote server
- ✅ Direct communication: Your Machine → Kit API
- ✅ Credentials never leave your computer

## What Claude Can and Cannot Do

### Can Do (With Your Approval)
- Create draft emails
- Schedule emails for future delivery
- Add subscribers
- Create and apply tags
- List and view your data

### Cannot Do
- Send emails without your approval
- Delete any data
- Remove subscribers
- Access your API keys
- Make changes without showing you first

## Monitoring

Check your Kit account regularly:
- Recent broadcasts created
- New subscribers added
- Tags applied
- API activity logs

## Questions?

If you have security concerns or questions, please open an issue on GitHub:
https://github.com/ohadive/kit-mcp-server/issues
