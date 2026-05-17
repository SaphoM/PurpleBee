/**
 * Telegram Bot Integration Configuration
 * Uses Telegram Bot API
 */

export interface TelegramConfig {
  botToken: string;
  botUsername: string;
  webhookUrl: string;
  apiEndpoint: string;
}

export const telegramConfig: TelegramConfig = {
  botToken: process.env.REACT_APP_TELEGRAM_BOT_TOKEN || '',
  botUsername: process.env.REACT_APP_TELEGRAM_BOT_USERNAME || '',
  webhookUrl: process.env.REACT_APP_TELEGRAM_WEBHOOK_URL || '',
  apiEndpoint: 'https://api.telegram.org',
};

/**
 * Telegram API endpoints
 */
export const telegramEndpoints = {
  sendMessage: (botToken: string) =>
    `https://api.telegram.org/bot${botToken}/sendMessage`,

  sendPhoto: (botToken: string) =>
    `https://api.telegram.org/bot${botToken}/sendPhoto`,

  setWebhook: (botToken: string) =>
    `https://api.telegram.org/bot${botToken}/setWebhook`,

  getUpdates: (botToken: string) =>
    `https://api.telegram.org/bot${botToken}/getUpdates`,
};

/**
 * Inline keyboard helper
 */
export const createInlineKeyboard = (buttons: Array<{ text: string; callbackData: string }>) => ({
  inline_keyboard: [buttons.map((btn) => ({ text: btn.text, callback_data: btn.callbackData }))],
});

/**
 * Telegram service class
 */
export class TelegramService {
  private config: TelegramConfig;

  constructor(config: TelegramConfig) {
    this.config = config;
  }

  /**
   * Send a text message
   */
  async sendMessage(chatId: string, message: string, options?: any): Promise<any> {
    const url = telegramEndpoints.sendMessage(this.config.botToken);

    const payload = {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML',
      ...options,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Telegram send message error:', error);
      throw error;
    }
  }

  /**
   * Send a message with inline buttons
   */
  async sendMessageWithButtons(
    chatId: string,
    message: string,
    buttons: Array<{ text: string; callbackData: string }>
  ): Promise<any> {
    return this.sendMessage(chatId, message, {
      reply_markup: createInlineKeyboard(buttons),
    });
  }

  /**
   * Send a photo
   */
  async sendPhoto(chatId: string, photoUrl: string, caption?: string): Promise<any> {
    const url = telegramEndpoints.sendPhoto(this.config.botToken);

    const payload = {
      chat_id: chatId,
      photo: photoUrl,
      caption: caption || '',
      parse_mode: 'HTML',
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Telegram send photo error:', error);
      throw error;
    }
  }

  /**
   * Set webhook for receiving updates
   */
  async setWebhook(): Promise<any> {
    const url = telegramEndpoints.setWebhook(this.config.botToken);

    const payload = {
      url: this.config.webhookUrl,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Telegram API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Telegram set webhook error:', error);
      throw error;
    }
  }

  /**
   * Parse command from message
   */
  parseCommand(text: string): { command: string; args: string[] } | null {
    if (!text.startsWith('/')) return null;

    const parts = text.split(' ');
    const command = parts[0].substring(1); // Remove leading /
    const args = parts.slice(1);

    return { command, args };
  }
}

export const telegramService = new TelegramService(telegramConfig);
