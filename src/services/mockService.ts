import { Task, User, Notification, Integration } from '@/types/index';

/**
 * Mock service for development and testing
 * Simulates API responses without a backend server
 */

export const mockService = {
  // Delay helper to simulate network latency
  delay: (ms: number = 500) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Task mock endpoints
  tasks: {
    getAll: async (): Promise<Task[]> => {
      await mockService.delay();
      return [];
    },

    getById: async (id: string): Promise<Task | null> => {
      await mockService.delay();
      return null;
    },

    create: async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
      await mockService.delay();
      return {
        ...task,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    update: async (
      id: string,
      updates: Partial<Task>
    ): Promise<Task> => {
      await mockService.delay();
      return {
        ...updates,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as Task;
    },

    delete: async (id: string): Promise<void> => {
      await mockService.delay();
    },
  },

  // User mock endpoints
  user: {
    getProfile: async (): Promise<User> => {
      await mockService.delay();
      return {
        id: 'user-1',
        email: 'sapho@xspark.co.za',
        name: 'Sapho Maqhwazima',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },

    updateProfile: async (data: Partial<User>): Promise<User> => {
      await mockService.delay();
      return {
        id: 'user-1',
        email: 'sapho@xspark.co.za',
        name: 'Sapho Maqhwazima',
        role: 'admin',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    },
  },

  // Analytics mock endpoints
  analytics: {
    getMetrics: async () => {
      await mockService.delay();
      return {
        tasksCompleted: 28,
        tasksCompletedYesterday: 5,
        averageCompletionTime: 2.5,
        currentStreak: 7,
        weeklyVelocity: [4, 3, 6, 5, 7, 4, 5],
        productivityScore: 87,
        focusSessionsCompleted: 35,
        totalFocusHours: 17.5,
      };
    },
  },

  // Integration mock endpoints
  integrations: {
    whatsapp: {
      verify: async (phoneNumber: string) => {
        await mockService.delay();
        return {
          success: true,
          message: 'WhatsApp verification code sent',
        };
      },

      sendMessage: async (message: string, recipients: string[]) => {
        await mockService.delay();
        return {
          success: true,
          sentTo: recipients,
          messageId: Date.now().toString(),
        };
      },
    },

    telegram: {
      verify: async (botToken: string) => {
        await mockService.delay();
        return {
          success: true,
          botUsername: 'task_bot',
        };
      },

      sendMessage: async (chatId: string, message: string) => {
        await mockService.delay();
        return {
          success: true,
          messageId: Date.now().toString(),
        };
      },
    },
  },
};
