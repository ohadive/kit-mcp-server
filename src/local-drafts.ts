/**
 * Local Draft Management
 * Saves email drafts to Content/eMail folder for review and editing before sending to Kit
 */

import * as fs from 'fs';
import * as path from 'path';

interface DraftMetadata {
  subject: string;
  description?: string;
  created_at: string;
  modified_at: string;
  status: 'draft' | 'ready' | 'sent';
  send_at?: string;
  published?: boolean;
  email_layout_template?: string;
  draft_id: string;
}

export class LocalDraftManager {
  private draftsPath: string;

  constructor(draftsPath: string = './drafts') {
    this.draftsPath = draftsPath;

    // Ensure the directory exists
    if (!fs.existsSync(this.draftsPath)) {
      throw new Error(`Drafts path does not exist: ${this.draftsPath}`);
    }
  }

  /**
   * Create a new local draft file
   */
  createDraft(data: {
    subject: string;
    content: string;
    description?: string;
    send_at?: string;
    published?: boolean;
    email_layout_template?: string;
  }): { draft_id: string; file_path: string } {
    const draft_id = this.generateDraftId();
    const timestamp = new Date().toISOString();

    const metadata: DraftMetadata = {
      subject: data.subject,
      description: data.description,
      created_at: timestamp,
      modified_at: timestamp,
      status: 'draft',
      send_at: data.send_at,
      published: data.published,
      email_layout_template: data.email_layout_template,
      draft_id,
    };

    const fileContent = this.formatDraftFile(metadata, data.content);
    const fileName = this.generateFileName(data.subject, draft_id);
    const filePath = path.join(this.draftsPath, fileName);

    fs.writeFileSync(filePath, fileContent, 'utf-8');

    return { draft_id, file_path: filePath };
  }

  /**
   * Read a draft file
   */
  readDraft(draft_id: string): { metadata: DraftMetadata; content: string; file_path: string } | null {
    const filePath = this.findDraftFile(draft_id);
    if (!filePath) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { metadata, content } = this.parseDraftFile(fileContent);

    return { metadata, content, file_path: filePath };
  }

  /**
   * Update draft status
   */
  updateDraftStatus(draft_id: string, status: 'draft' | 'ready' | 'sent'): boolean {
    const draft = this.readDraft(draft_id);
    if (!draft) {
      return false;
    }

    draft.metadata.status = status;
    draft.metadata.modified_at = new Date().toISOString();

    const fileContent = this.formatDraftFile(draft.metadata, draft.content);
    fs.writeFileSync(draft.file_path, fileContent, 'utf-8');

    return true;
  }

  /**
   * List all drafts
   */
  listDrafts(): Array<{ draft_id: string; subject: string; status: string; created_at: string; file_path: string }> {
    const files = fs.readdirSync(this.draftsPath);
    const drafts: Array<{ draft_id: string; subject: string; status: string; created_at: string; file_path: string }> = [];

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(this.draftsPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      try {
        const { metadata } = this.parseDraftFile(fileContent);
        if (metadata.draft_id) {
          drafts.push({
            draft_id: metadata.draft_id,
            subject: metadata.subject,
            status: metadata.status,
            created_at: metadata.created_at,
            file_path: filePath,
          });
        }
      } catch (error) {
        // Skip files that aren't valid drafts
        continue;
      }
    }

    return drafts.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  /**
   * Delete a draft file
   */
  deleteDraft(draft_id: string): boolean {
    const filePath = this.findDraftFile(draft_id);
    if (!filePath) {
      return false;
    }

    fs.unlinkSync(filePath);
    return true;
  }

  // Helper methods

  private generateDraftId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `draft_${timestamp}_${random}`;
  }

  private generateFileName(subject: string, draft_id: string): string {
    const date = new Date().toISOString().split('T')[0];
    const slug = subject
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    return `${date}_${slug}_${draft_id.split('_')[1]}.md`;
  }

  private formatDraftFile(metadata: DraftMetadata, content: string): string {
    return `---
subject: "${metadata.subject.replace(/"/g, '\\"')}"
description: "${metadata.description?.replace(/"/g, '\\"') || ''}"
created_at: "${metadata.created_at}"
modified_at: "${metadata.modified_at}"
status: "${metadata.status}"
${metadata.send_at ? `send_at: "${metadata.send_at}"` : ''}
${metadata.published !== undefined ? `published: ${metadata.published}` : ''}
${metadata.email_layout_template ? `email_layout_template: "${metadata.email_layout_template}"` : ''}
draft_id: "${metadata.draft_id}"
---

${content}
`;
  }

  private parseDraftFile(fileContent: string): { metadata: DraftMetadata; content: string } {
    const match = fileContent.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      throw new Error('Invalid draft file format');
    }

    const [, frontmatter, content] = match;
    const metadata: any = {};

    frontmatter.split('\n').forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex === -1) return;

      const key = line.substring(0, colonIndex).trim();
      let value = line.substring(colonIndex + 1).trim();

      // Remove quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }

      // Parse boolean
      if (value === 'true') value = true as any;
      if (value === 'false') value = false as any;

      metadata[key] = value;
    });

    return { metadata: metadata as DraftMetadata, content: content.trim() };
  }

  private findDraftFile(draft_id: string): string | null {
    const files = fs.readdirSync(this.draftsPath);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(this.draftsPath, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');

      try {
        const { metadata } = this.parseDraftFile(fileContent);
        if (metadata.draft_id === draft_id) {
          return filePath;
        }
      } catch (error) {
        continue;
      }
    }

    return null;
  }
}
