/**
 * Kit API Client
 * Documentation: https://developers.kit.com/
 */

export class KitAPIClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl = "https://api.kit.com/v4";

  constructor(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  private async request(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": this.apiKey,
    };

    // For API v4, use API Key in header
    // API Secret is used for webhooks verification, not direct API calls

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Kit API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  // Broadcasts
  async createBroadcast(data: {
    subject: string;
    content: string;
    description?: string;
    email_layout_template?: string;
    published?: boolean;
    send_at?: string;
  }): Promise<any> {
    return this.request("POST", "/broadcasts", data);
  }

  async listBroadcasts(limit: number = 10): Promise<any> {
    return this.request("GET", `/broadcasts?per_page=${limit}`);
  }

  async getBroadcast(broadcastId: string): Promise<any> {
    return this.request("GET", `/broadcasts/${broadcastId}`);
  }

  async deleteBroadcast(broadcastId: string): Promise<any> {
    return this.request("DELETE", `/broadcasts/${broadcastId}`);
  }

  // Subscribers
  async addSubscriber(data: {
    email: string;
    first_name?: string;
    tags?: string[];
    fields?: Record<string, any>;
  }): Promise<any> {
    return this.request("POST", "/subscribers", data);
  }

  async listSubscribers(tagName?: string, limit: number = 10): Promise<any> {
    let endpoint = `/subscribers?per_page=${limit}`;
    if (tagName) {
      endpoint += `&tag_name=${encodeURIComponent(tagName)}`;
    }
    return this.request("GET", endpoint);
  }

  async getSubscriber(subscriberId: string): Promise<any> {
    return this.request("GET", `/subscribers/${subscriberId}`);
  }

  async updateSubscriber(
    subscriberId: string,
    data: {
      first_name?: string;
      email?: string;
      fields?: Record<string, any>;
    }
  ): Promise<any> {
    return this.request("PUT", `/subscribers/${subscriberId}`, data);
  }

  async unsubscribe(subscriberId: string): Promise<any> {
    return this.request("DELETE", `/subscribers/${subscriberId}`);
  }

  // Tags
  async createTag(name: string): Promise<any> {
    return this.request("POST", "/tags", { name });
  }

  async listTags(): Promise<any> {
    return this.request("GET", "/tags");
  }

  async tagSubscriber(email: string, tagName: string): Promise<any> {
    // First, find or create the tag
    const tags = await this.listTags();
    let tagId = tags.tags?.find((t: any) => t.name === tagName)?.id;

    if (!tagId) {
      const newTag = await this.createTag(tagName);
      tagId = newTag.tag.id;
    }

    // Find subscriber by email
    const subscribers = await this.request(
      "GET",
      `/subscribers?email_address=${encodeURIComponent(email)}`
    );

    if (!subscribers.subscribers || subscribers.subscribers.length === 0) {
      throw new Error(`Subscriber with email ${email} not found`);
    }

    const subscriberId = subscribers.subscribers[0].id;

    // Add tag to subscriber
    return this.request("POST", `/subscribers/${subscriberId}/tags`, {
      tag_id: tagId,
    });
  }

  async untagSubscriber(subscriberId: string, tagId: string): Promise<any> {
    return this.request("DELETE", `/subscribers/${subscriberId}/tags/${tagId}`);
  }

  // Sequences
  async listSequences(): Promise<any> {
    return this.request("GET", "/sequences");
  }

  async subscribeToSequence(
    sequenceId: string,
    subscriberId: string
  ): Promise<any> {
    return this.request("POST", `/sequences/${sequenceId}/subscriptions`, {
      subscriber_id: subscriberId,
    });
  }

  // Forms
  async listForms(): Promise<any> {
    return this.request("GET", "/forms");
  }

  async subscribeToForm(formId: string, data: { email: string; first_name?: string; fields?: Record<string, any> }): Promise<any> {
    return this.request("POST", `/forms/${formId}/subscribe`, data);
  }
}
