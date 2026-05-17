/**
 * WhatsApp Integration Configuration
 * Uses Meta WhatsApp Cloud API
 */

export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  webhookToken: string;
  apiVersion: string;
}

export const whatsappConfig: WhatsAppConfig = {
  phoneNumberId: process.env.REACT_APP_WHATSAPP_PHONE_ID || '',
  businessAccountId: process.env.REACT_APP_WHATSAPP_ACCOUNT_ID || '',
  accessToken: process.env.REACT_APP_WHATSAPP_TOKEN || '',
  webhookToken: process.env.REACT_APP_WHATSAPP_WEBHOOK_TOKEN || '',
  apiVersion: 'v18.0',
};

/**
 * WhatsApp API endpoints
 */
export const whatsappEndpoints = {
  sendMessage: (phoneNumberId: string, version: string = 'v18.0') =>
    `https://graph.instagram.com/${version}/${phoneNumberId}/messages`,

  webhookVerify: (phoneNumberId: string, version: string = 'v18.0') =>
    `https://graph.instagram.com/${version}/${phoneNumberId}/webhook`,
};

/**
 * Message templates for WhatsApp
 */
export const whatsappTemplates = {
  taskReminder: (taskTitle: string, dueDate: string) => ({
    messaging_product: 'whatsapp',
    to: '{{recipientPhone}}',
    type: 'template',
    template: {
      name: 'task_reminder',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: taskTitle },
            { type: 'text', text: dueDate },
          ],
        },
      ],
    },
  }),

  taskCompleted: (taskTitle: string) => ({
    messaging_product: 'whatsapp',
    to: '{{recipientPhone}}',
    type: 'template',
    template: {
      name: 'task_completed',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [{ type: 'text', text: taskTitle }],
        },
      ],
    },
  }),

  dailySummary: (completedCount: number, pendingCount: number) => ({
    messaging_product: 'whatsapp',
    to: '{{recipientPhone}}',
    type: 'template',
    template: {
      name: 'daily_summary',
      language: { code: 'en_US' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: completedCount.toString() },
            { type: 'text', text: pendingCount.toString() },
          ],
        },
      ],
    },
  }),
};

/**
 * WhatsApp service class
 */
export class WhatsAppService {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * Send a WhatsApp message
   */
  async sendMessage(phoneNumber: string, message: string): Promise<any> {
    const url = whatsappEndpoints.sendMessage(this.config.phoneNumberId);

    const payload = {
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'text',
      text: { body: message },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('WhatsApp send message error:', error);
      throw error;
    }
  }

  /**
   * Send a template message
   */
  async sendTemplate(phoneNumber: string, template: any): Promise<any> {
    const url = whatsappEndpoints.sendMessage(this.config.phoneNumberId);
    const payload = { ...template, to: phoneNumber };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`WhatsApp API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('WhatsApp send template error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook token
   */
  verifyWebhookToken(token: string): boolean {
    return token === this.config.webhookToken;
  }
}

export const whatsappService = new WhatsAppService(whatsappConfig);
