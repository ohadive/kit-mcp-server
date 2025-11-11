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

// Environment variables
const KIT_API_KEY = process.env.KIT_API_KEY;
const KIT_API_SECRET = process.env.KIT_API_SECRET;

if (!KIT_API_KEY || !KIT_API_SECRET) {
  console.error("Error: KIT_API_KEY and KIT_API_SECRET environment variables are required");
  process.exit(1);
}

// Initialize Kit API client and permissions manager
const kitClient = new KitAPIClient(KIT_API_KEY, KIT_API_SECRET);
const permissions = new PermissionsManager();

// Define available tools
const tools: Tool[] = [
  {
    name: "create_broadcast",
    description: "Create a new email broadcast (draft or scheduled). Can include subject line, content, and optional scheduling.",
    inputSchema: {
      type: "object",
      properties: {
        subject: {
          type: "string",
          description: "Email subject line",
        },
        content: {
          type: "string",
          description: "Email body content (HTML or plain text)",
        },
        description: {
          type: "string",
          description: "Internal description for the broadcast",
        },
        email_layout_template: {
          type: "string",
          description: "Template ID to use (optional)",
        },
        published: {
          type: "boolean",
          description: "Whether to publish immediately (true) or save as draft (false). Default: false",
        },
        send_at: {
          type: "string",
          description: "ISO 8601 datetime to schedule the broadcast (e.g., '2025-11-15T09:00:00Z'). Leave empty for draft.",
        },
      },
      required: ["subject", "content"],
    },
  },
  {
    name: "list_broadcasts",
    description: "List recent email broadcasts with their status",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Number of broadcasts to return (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "get_broadcast",
    description: "Get details of a specific broadcast by ID",
    inputSchema: {
      type: "object",
      properties: {
        broadcast_id: {
          type: "string",
          description: "The broadcast ID",
        },
      },
      required: ["broadcast_id"],
    },
  },
  {
    name: "add_subscriber",
    description: "Add a new subscriber or update an existing one",
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Subscriber email address",
        },
        first_name: {
          type: "string",
          description: "Subscriber first name",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Array of tag names to apply",
        },
        fields: {
          type: "object",
          description: "Custom fields as key-value pairs",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "list_subscribers",
    description: "List subscribers with optional filtering",
    inputSchema: {
      type: "object",
      properties: {
        tag_name: {
          type: "string",
          description: "Filter by tag name",
        },
        limit: {
          type: "number",
          description: "Number of subscribers to return (default: 10, max: 50)",
        },
      },
    },
  },
  {
    name: "create_tag",
    description: "Create a new tag",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Tag name",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_tags",
    description: "List all tags",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "tag_subscriber",
    description: "Add a tag to a subscriber",
    inputSchema: {
      type: "object",
      properties: {
        email: {
          type: "string",
          description: "Subscriber email address",
        },
        tag_name: {
          type: "string",
          description: "Tag name to apply",
        },
      },
      required: ["email", "tag_name"],
    },
  },
];

// Create MCP server
const server = new Server(
  {
    name: "kit-mcp-server",
    version: "0.1.0",
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
    // Check if operation is forbidden
    if (permissions.isForbidden(name)) {
      return {
        content: [
          {
            type: "text",
            text: `❌ OPERATION FORBIDDEN\n\nThe operation "${name}" is not allowed for security reasons.\n\nThis operation has been disabled to protect your Kit account.`,
          },
        ],
        isError: true,
      };
    }

    // Check if operation requires approval and user hasn't confirmed
    const userApproved = (args as any)?._approved === true;

    if (permissions.requiresApproval(name) && !userApproved) {
      const approvalRequest = permissions.formatApprovalRequest(name, args);
      return {
        content: [
          {
            type: "text",
            text: `${approvalRequest}\n\n📋 To execute this operation, the user must explicitly confirm.\nI will ask for their approval before proceeding.`,
          },
        ],
      };
    }

    // Execute the operation (read operations or approved writes)
    switch (name) {
      case "create_broadcast": {
        const result = await kitClient.createBroadcast(args as any);
        return {
          content: [
            {
              type: "text",
              text: `✅ BROADCAST CREATED SUCCESSFULLY\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      }

      case "list_broadcasts": {
        const limit = (args?.limit as number) || 10;
        const result = await kitClient.listBroadcasts(limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "get_broadcast": {
        const result = await kitClient.getBroadcast((args as any).broadcast_id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "add_subscriber": {
        const result = await kitClient.addSubscriber(args as any);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_subscribers": {
        const limit = (args?.limit as number) || 10;
        const tagName = args?.tag_name as string | undefined;
        const result = await kitClient.listSubscribers(tagName, limit);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "create_tag": {
        const result = await kitClient.createTag((args as any).name);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "list_tags": {
        const result = await kitClient.listTags();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "tag_subscriber": {
        const result = await kitClient.tagSubscriber((args as any).email, (args as any).tag_name);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Kit MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
