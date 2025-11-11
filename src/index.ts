#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { KitAPIClient } from "./kit-api.js";
import { PermissionsManager } from "./permissions.js";
import { ApprovalQueue } from "./approval-queue.js";

// Environment variables
const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_API_SECRET = process.env.KIT_API_SECRET;

if (!KIT_API_KEY || !KIT_API_SECRET) {
  console.error("Error: KIT_API_KEY and KIT_API_SECRET environment variables are required");
  process.exit(1);
}

// Initialize Kit API client, permissions manager, and approval queue
const kitClient = new KitAPIClient(KIT_API_KEY, KIT_API_SECRET);
const permissions = new PermissionsManager();
const approvalQueue = new ApprovalQueue();

// Clean up old approvals every hour
setInterval(() => approvalQueue.cleanup(), 60 * 60 * 1000);

// Define available tools
const tools: Tool[] = [
  // Write operations that require approval
  {
    name: "create_broadcast",
    description: "Request to create a new email broadcast. THIS REQUIRES USER APPROVAL. Will show preview and wait for confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Email subject line" },
        content: { type: "string", description: "Email body content" },
        description: { type: "string", description: "Internal description" },
        published: { type: "boolean", description: "Publish immediately (default: false)" },
        send_at: { type: "string", description: "ISO 8601 datetime to schedule" },
      },
      required: ["subject", "content"],
    },
  },
  {
    name: "add_subscriber",
    description: "Request to add a new subscriber. THIS REQUIRES USER APPROVAL.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Subscriber email" },
        first_name: { type: "string", description: "First name" },
        tags: { type: "array", items: { type: "string" }, description: "Tags to apply" },
      },
      required: ["email"],
    },
  },
  {
    name: "create_tag",
    description: "Request to create a new tag. THIS REQUIRES USER APPROVAL.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Tag name" },
      },
      required: ["name"],
    },
  },
  {
    name: "tag_subscriber",
    description: "Request to add a tag to a subscriber. THIS REQUIRES USER APPROVAL.",
    inputSchema: {
      type: "object",
      properties: {
        email: { type: "string", description: "Subscriber email" },
        tag_name: { type: "string", description: "Tag name" },
      },
      required: ["email", "tag_name"],
    },
  },

  // Approval management tools
  {
    name: "approve_operation",
    description: "Approve a pending operation by its approval ID",
    inputSchema: {
      type: "object",
      properties: {
        approval_id: { type: "string", description: "The approval ID to execute" },
      },
      required: ["approval_id"],
    },
  },
  {
    name: "list_pending_approvals",
    description: "List all pending operations awaiting approval",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "cancel_approval",
    description: "Cancel/deny a pending approval",
    inputSchema: {
      type: "object",
      properties: {
        approval_id: { type: "string", description: "The approval ID to cancel" },
      },
      required: ["approval_id"],
    },
  },

  // Read-only operations (no approval needed)
  {
    name: "list_broadcasts",
    description: "List recent email broadcasts (READ-ONLY, no approval needed)",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number to return (default: 10)" },
      },
    },
  },
  {
    name: "get_broadcast",
    description: "Get details of a specific broadcast (READ-ONLY)",
    inputSchema: {
      type: "object",
      properties: {
        broadcast_id: { type: "string", description: "Broadcast ID" },
      },
      required: ["broadcast_id"],
    },
  },
  {
    name: "list_subscribers",
    description: "List subscribers (READ-ONLY)",
    inputSchema: {
      type: "object",
      properties: {
        tag_name: { type: "string", description: "Filter by tag" },
        limit: { type: "number", description: "Number to return (default: 10)" },
      },
    },
  },
  {
    name: "list_tags",
    description: "List all tags (READ-ONLY)",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "kit-mcp-server",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // Approval management tools
    if (name === "approve_operation") {
      const approvalId = (args as any).approval_id;
      const pending = approvalQueue.get(approvalId);

      if (!pending) {
        return {
          content: [{
            type: "text",
            text: `❌ Approval ID "${approvalId}" not found or already expired.`,
          }],
          isError: true,
        };
      }

      // Execute the approved operation
      let result;
      switch (pending.operation) {
        case "create_broadcast":
          result = await kitClient.createBroadcast(pending.args);
          break;
        case "add_subscriber":
          result = await kitClient.addSubscriber(pending.args);
          break;
        case "create_tag":
          result = await kitClient.createTag(pending.args.name);
          break;
        case "tag_subscriber":
          result = await kitClient.tagSubscriber(pending.args.email, pending.args.tag_name);
          break;
        default:
          throw new Error(`Unknown operation: ${pending.operation}`);
      }

      // Remove from queue
      approvalQueue.remove(approvalId);

      return {
        content: [{
          type: "text",
          text: `✅ OPERATION APPROVED AND EXECUTED\n\nOperation: ${pending.operation}\nApproval ID: ${approvalId}\n\nResult:\n${JSON.stringify(result, null, 2)}`,
        }],
      };
    }

    if (name === "list_pending_approvals") {
      const pending = approvalQueue.list();
      if (pending.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No pending approvals.",
          }],
        };
      }

      const list = pending.map(p =>
        `━━━━━━━━━━━━━━━━━━━━━━━━\nID: ${p.id}\n${p.summary}\nRequested: ${new Date(p.timestamp).toLocaleString()}\n`
      ).join('\n');

      return {
        content: [{
          type: "text",
          text: `PENDING APPROVALS:\n\n${list}`,
        }],
      };
    }

    if (name === "cancel_approval") {
      const approvalId = (args as any).approval_id;
      const pending = approvalQueue.get(approvalId);

      if (!pending) {
        return {
          content: [{
            type: "text",
            text: `❌ Approval ID "${approvalId}" not found.`,
          }],
          isError: true,
        };
      }

      approvalQueue.remove(approvalId);
      return {
        content: [{
          type: "text",
          text: `✅ Approval "${approvalId}" has been cancelled.`,
        }],
      };
    }

    // Write operations that require approval
    if (permissions.requiresApproval(name)) {
      const summary = permissions.formatApprovalRequest(name, args);
      const approvalId = approvalQueue.add(name, args, summary);

      return {
        content: [{
          type: "text",
          text: `${summary}\n\n🔑 Approval ID: ${approvalId}\n\nTo proceed, the user must explicitly approve this operation using:\napprove_operation with approval_id: ${approvalId}`,
        }],
      };
    }

    // Read-only operations (execute immediately)
    switch (name) {
      case "list_broadcasts": {
        const limit = (args?.limit as number) || 10;
        const result = await kitClient.listBroadcasts(limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "get_broadcast": {
        const result = await kitClient.getBroadcast((args as any).broadcast_id);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "list_subscribers": {
        const limit = (args?.limit as number) || 10;
        const tagName = args?.tag_name as string | undefined;
        const result = await kitClient.listSubscribers(tagName, limit);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      case "list_tags": {
        const result = await kitClient.listTags();
        return {
          content: [{
            type: "text",
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: "text",
        text: `Error: ${errorMessage}`,
      }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kit MCP Server v0.2.0 (with approval system) running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
