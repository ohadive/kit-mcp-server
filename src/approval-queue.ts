/**
 * Approval Queue for Write Operations
 * Stores pending operations that require user approval
 */

interface PendingOperation {
  id: string;
  operation: string;
  args: any;
  timestamp: number;
  summary: string;
}

export class ApprovalQueue {
  private queue: Map<string, PendingOperation> = new Map();
  private nextId = 1;

  add(operation: string, args: any, summary: string): string {
    const id = `approval_${this.nextId++}`;
    this.queue.set(id, {
      id,
      operation,
      args,
      timestamp: Date.now(),
      summary,
    });
    return id;
  }

  get(id: string): PendingOperation | undefined {
    return this.queue.get(id);
  }

  remove(id: string): void {
    this.queue.delete(id);
  }

  list(): PendingOperation[] {
    return Array.from(this.queue.values());
  }

  clear(): void {
    this.queue.clear();
  }

  // Clean up old pending approvals (older than 1 hour)
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [id, op] of this.queue.entries()) {
      if (op.timestamp < oneHourAgo) {
        this.queue.delete(id);
      }
    }
  }
}
