import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface Permissions {
  read_operations: string[];
  write_operations_require_approval: string[];
  forbidden_operations: string[];
}

export class PermissionsManager {
  private permissions: Permissions;

  constructor() {
    const permissionsPath = path.join(__dirname, '..', 'permissions.json');
    const permissionsData = fs.readFileSync(permissionsPath, 'utf-8');
    this.permissions = JSON.parse(permissionsData);
  }

  isReadOperation(operation: string): boolean {
    return this.permissions.read_operations.includes(operation);
  }

  requiresApproval(operation: string): boolean {
    return this.permissions.write_operations_require_approval.includes(operation);
  }

  isForbidden(operation: string): boolean {
    return this.permissions.forbidden_operations.includes(operation);
  }

  getOperationType(operation: string): 'read' | 'write' | 'forbidden' {
    if (this.isForbidden(operation)) return 'forbidden';
    if (this.isReadOperation(operation)) return 'read';
    return 'write';
  }

  formatApprovalRequest(operation: string, args: any): string {
    let summary = '';

    switch (operation) {
      case 'create_broadcast':
        summary = `📧 CREATE EMAIL BROADCAST

Subject: ${args.subject || '(no subject)'}
Content: ${args.content?.substring(0, 200) || '(no content)'}${args.content?.length > 200 ? '...' : ''}
${args.description ? `Description: ${args.description}` : ''}
${args.send_at ? `⏰ Scheduled for: ${args.send_at}` : '📝 Status: DRAFT'}
${args.published ? '⚠️ WILL BE PUBLISHED IMMEDIATELY' : ''}`;
        break;

      case 'add_subscriber':
        summary = `👤 ADD SUBSCRIBER

Email: ${args.email}
${args.first_name ? `Name: ${args.first_name}` : ''}
${args.tags ? `Tags: ${args.tags.join(', ')}` : ''}
${args.fields ? `Custom Fields: ${JSON.stringify(args.fields)}` : ''}`;
        break;

      case 'create_tag':
        summary = `🏷️ CREATE TAG

Tag Name: ${args.name}`;
        break;

      case 'tag_subscriber':
        summary = `🏷️ TAG SUBSCRIBER

Email: ${args.email}
Tag: ${args.tag_name}`;
        break;

      default:
        summary = `Operation: ${operation}
Arguments: ${JSON.stringify(args, null, 2)}`;
    }

    return `⚠️ APPROVAL REQUIRED ⚠️

${summary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This operation will make changes to your Kit account.

To proceed, respond with one of:
• "APPROVE" or "YES" - Execute this operation
• "DENY" or "NO" - Cancel this operation
• "SHOW DETAILS" - See full request details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }
}
