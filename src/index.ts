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
import { LocalDraftManager } from "./local-drafts.js";

// Environment variables
const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_API_SECRET = process.env.KIT_API_SECRET || ""; // Optional - only needed for webhooks
const DRAFTS_PATH = process.env.DRAFTS_PATH || "./drafts";

if (!KIT_API_KEY) {
  console.error("Error: KIT_API_KEY environment variable is required");
  process.exit(1);
}

// Initialize Kit API client, permissions manager, approval queue, and local drafts
const kitClient = new KitAPIClient(KIT_API_KEY, KIT_API_SECRET);
const permissions = new PermissionsManager();
const approvalQueue = new ApprovalQueue();
const draftManager = new LocalDraftManager(DRAFTS_PATH);

// Clean up old approvals every hour
setInterval(() => approvalQueue.cleanup(), 60 * 60 * 1000);

// Define available tools
const tools: Tool[] = [
  // Local draft management (NO APPROVAL NEEDED - just saves to disk)
  {
    name: "create_local_draft",
    description: "Create a new email draft in your local Content/eMail folder for review and editing. NO APPROVAL NEEDED - just saves a .md file locally.",
    inputSchema: {
      type: "object",
      properties: {
        subject: { type: "string", description: "Email subject line" },
        content: { type: "string", description: "Email body content" },
        description: { type: "string", description: "Internal description" },
        send_at: { type: "string", description: "ISO 8601 datetime to schedule (optional)" },
      },
      required: ["subject", "content"],
    },
  },
  {
    name: "list_local_drafts",
    description: "List all local email drafts in Content/eMail folder",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "read_local_draft",
    description: "Read a local draft by its draft_id",
    inputSchema: {
      type: "object",
      properties: {
        draft_id: { type: "string", description: "The draft ID to read" },
      },
      required: ["draft_id"],
    },
  },
  {
    name: "publish_local_draft_to_kit",
    description: "Publish a local draft to Kit. THIS REQUIRES USER APPROVAL. Reads the local .md file and sends it to Kit API.",
    inputSchema: {
      type: "object",
      properties: {
        draft_id: { type: "string", description: "The local draft ID to publish" },
      },
      required: ["draft_id"],
    },
  },
  {
    name: "delete_local_draft",
    description: "Delete a local draft file",
    inputSchema: {
      type: "object",
      properties: {
        draft_id: { type: "string", description: "The draft ID to delete" },
      },
      required: ["draft_id"],
    },
  },

  // Write operations that require approval
  {
    name: "create_broadcast",
    description: "DEPRECATED: Use create_local_draft instead. Direct creation to Kit requires approval.",
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
    // Local draft management tools (no approval needed - just file operations)
    if (name === "create_local_draft") {
      const { draft_id, file_path } = draftManager.createDraft(args as any);
      return {
        content: [{
          type: "text",
          text: `✅ LOCAL DRAFT CREATED\n\nDraft ID: ${draft_id}\nFile: ${file_path}\n\nThe draft has been saved locally. You can now:\n1. Open the file to review/edit it\n2. Use read_local_draft to view it\n3. Use publish_local_draft_to_kit when ready to send to Kit`,
        }],
      };
    }

    if (name === "list_local_drafts") {
      const drafts = draftManager.listDrafts();
      if (drafts.length === 0) {
        return {
          content: [{
            type: "text",
            text: "No local drafts found in Content/eMail folder.",
          }],
        };
      }

      const list = drafts.map(d =>
        `━━━━━━━━━━━━━━━━━━━━━━━━\nDraft ID: ${d.draft_id}\nSubject: ${d.subject}\nStatus: ${d.status}\nCreated: ${new Date(d.created_at).toLocaleString()}\nFile: ${d.file_path}\n`
      ).join('\n');

      return {
        content: [{
          type: "text",
          text: `LOCAL DRAFTS:\n\n${list}`,
        }],
      };
    }

    if (name === "read_local_draft") {
      const draft = draftManager.readDraft((args as any).draft_id);
      if (!draft) {
        return {
          content: [{
            type: "text",
            text: `❌ Draft not found: ${(args as any).draft_id}`,
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: `📧 LOCAL DRAFT\n\nSubject: ${draft.metadata.subject}\nStatus: ${draft.metadata.status}\nCreated: ${draft.metadata.created_at}\n${draft.metadata.send_at ? `Scheduled for: ${draft.metadata.send_at}\n` : ''}\n━━━━━━━━━━━━━━━━━━━━━━━━\n\n${draft.content}\n\n━━━━━━━━━━━━━━━━━━━━━━━━\nFile: ${draft.file_path}`,
        }],
      };
    }

    if (name === "delete_local_draft") {
      const deleted = draftManager.deleteDraft((args as any).draft_id);
      if (!deleted) {
        return {
          content: [{
            type: "text",
            text: `❌ Draft not found: ${(args as any).draft_id}`,
          }],
          isError: true,
        };
      }

      return {
        content: [{
          type: "text",
          text: `✅ Local draft deleted: ${(args as any).draft_id}`,
        }],
      };
    }

    if (name === "publish_local_draft_to_kit") {
      const draft = draftManager.readDraft((args as any).draft_id);
      if (!draft) {
        return {
          content: [{
            type: "text",
            text: `❌ Draft not found: ${(args as any).draft_id}`,
          }],
          isError: true,
        };
      }

      // This requires approval, so add to approval queue
      const broadcastData = {
        subject: draft.metadata.subject,
        content: draft.content,
        description: draft.metadata.description,
        send_at: draft.metadata.send_at,
        published: draft.metadata.published,
        email_layout_template: draft.metadata.email_layout_template,
      };

      const summary = permissions.formatApprovalRequest("create_broadcast", broadcastData);
      const approvalId = approvalQueue.add("create_broadcast", broadcastData, summary);

      return {
        content: [{
          type: "text",
          text: `${summary}\n\n📁 Publishing from local draft: ${draft.metadata.subject}\n🔑 Approval ID: ${approvalId}\n\nTo proceed, approve this operation.`,
        }],
      };
    }

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
