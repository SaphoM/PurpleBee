// User and Authentication Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// Task Types
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: string;
  createdBy?: string; // user id of the person who created the task
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  progress: number; // 0-100
  subtasks?: Subtask[];
  attachments?: Attachment[];
  links?: TaskLink[];
  progressNotes?: ProgressNote[];
  notes?: string;
  isRecurring?: boolean;
  recurringPattern?: RecurringPattern;
  estimatedHours?: number;
  actualHours?: number;
  teamId?: string;
  projectId?: string;
  collaborators?: TaskCollaborator[];
  sourceChannel?: 'whatsapp' | 'telegram' | 'in-app';
}

export interface TaskCollaborator {
  userId: string;
  name: string;
  avatar: string;
  role: 'helper' | 'reviewer';
  allocatedMinutes?: number; // time the collaborator allocates from their schedule
  addedAt: Date;
}

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  previewUrl?: string;
  uploadedAt: Date;
  uploadedBy?: string;      // user id of the uploader
  uploadedByName?: string;  // denormalized display name, shown in upload history
}

export interface TaskLink {
  id: string;
  title: string;
  url: string;
  type:
    | 'link' | 'figma' | 'github' | 'notion' | 'google-doc' | 'other'
    // Project Reference categories
    | 'google-drive' | 'sharepoint' | 'onedrive' | 'loom' | 'youtube' | 'vimeo'
    | 'discovery-meeting' | 'wireframe' | 'requirements' | 'scope-doc';
  addedAt: Date;
}

export type TaskActivityAction =
  | 'created' | 'updated' | 'deleted'
  | 'attachment_added' | 'attachment_removed'
  | 'link_added' | 'link_removed'
  | 'subtask_changed';

export interface TaskActivityEntry {
  id: string;
  taskId: string | null; // null once the source task has been deleted
  taskTitle: string;      // denormalized snapshot — survives task deletion
  teamId: string | null;
  actorId: string;
  actorName: string;
  action: TaskActivityAction;
  field?: string;       // e.g. 'status', 'priority', 'title', 'description', 'assignedTo', 'dueDate'
  oldValue?: string;
  newValue?: string;
  createdAt: Date;
}

export interface ProgressNote {
  id: string;
  text: string;
  progress: number; // snapshot of progress when note was added
  trigger: string; // what action triggered (drag, slider, mini-task, quick-set)
  createdAt: Date;
}

export interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';
  endDate?: Date;
  daysOfWeek?: number[]; // 0-6
}

// Project Types
export interface Project {
  id: string;
  name: string;
  description?: string;
  teamId: string;
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
  tasks?: Task[];
}

// Team Types
export interface Team {
  id: string;
  name: string;
  description?: string;
  members: TeamMember[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  user: User;
  role: 'admin' | 'member';
  joinedAt: Date;
}

// Analytics Types
export interface TaskMetrics {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface ProductivityMetrics {
  tasksCompleted: number;
  tasksCompletedYesterday: number;
  averageCompletionTime: number;
  currentStreak: number;
  weeklyVelocity: number[];
  productivityScore: number; // 0-100
  focusSessionsCompleted: number;
  totalFocusHours: number;
}

export interface TeamMetrics {
  totalMembers: number;
  activeMembers: number;
  teamVelocity: number;
  avgCompletionTime: number;
  teamHealthScore: number;
}

export interface AnalyticsData {
  taskMetrics: TaskMetrics;
  productivityMetrics: ProductivityMetrics;
  teamMetrics?: TeamMetrics;
  completionTrends: CompletionTrend[];
  priorityDistribution: PriorityDistribution[];
}

export interface CompletionTrend {
  date: string;
  completed: number;
  target: number;
}

export interface PriorityDistribution {
  priority: TaskPriority;
  count: number;
  percentage: number;
}

// Notification Types
export type NotificationType = 'task-assigned' | 'task-due' | 'task-completed' | 'mention' | 'update' | 'ai-insight' | 'project-invite';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  conversationId?: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  channel?: 'whatsapp' | 'telegram';
}

// Integration Types
export interface Integration {
  id: string;
  userId: string;
  type: 'whatsapp' | 'telegram' | 'slack' | 'calendar' | 'email';
  isActive: boolean;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppIntegration extends Integration {
  type: 'whatsapp';
  config: {
    phoneNumber: string;
    accessToken: string;
    businessAccountId: string;
  };
}

export interface TelegramIntegration extends Integration {
  type: 'telegram';
  config: {
    botToken: string;
    chatId: string;
    username: string;
  };
}

// Calendar Event
export interface CalendarEvent {
  id: string;
  taskId?: string;
  title: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  color?: string;
}

// AI Insights
export interface AIInsight {
  id: string;
  userId: string;
  type: 'recommendation' | 'warning' | 'suggestion' | 'forecast';
  title: string;
  message: string;
  actionable: boolean;
  suggestedAction?: string;
  confidence: number; // 0-100
  createdAt: Date;
}

// Focus Session
export interface FocusSession {
  id: string;
  userId: string;
  taskId?: string;
  duration: number; // in minutes
  actualDuration: number;
  startedAt: Date;
  endedAt?: Date;
  breaks: number;
  distractions: number;
  completed: boolean;
}

// Report Types
export interface Report {
  id: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  period: string;
  data: {
    summary: string;
    metrics: ProductivityMetrics;
    topTasks: Task[];
    insights: AIInsight[];
    recommendations: string[];
  };
  generatedAt: Date;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// UI State
export interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  selectedTaskId?: string;
  isModalOpen: boolean;
  modalType?: 'create-task' | 'edit-task' | 'settings' | 'integrations';
  selectedFilter: {
    status?: TaskStatus;
    priority?: TaskPriority;
    tags?: string[];
    assignedTo?: string;
  };
  viewMode: 'kanban' | 'list' | 'calendar' | 'timeline';
}

// Chat Types
export type ConversationType = 'task' | 'dm' | 'team' | 'announcement' | 'telegram';

export interface TaskRef {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  progress: number;
  projectName?: string;
  subtasksCompleted: number;
  subtasksTotal: number;
}

export interface ReplyRef {
  id: string;
  text: string;
  senderName: string;
  taskRef?: TaskRef;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  timestamp: Date;
  readBy: string[];
  replyTo?: ReplyRef;
  attachments?: Attachment[];
  reactions?: MessageReaction[];
  taskRef?: TaskRef;
  editedAt?: Date;
  isDeleted?: boolean;
  starred?: boolean;
}

export interface MessageReaction {
  emoji: string;
  users: string[];
}

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string;
  description?: string;
  participants: ChatParticipant[];
  taskId?: string;
  taskTitle?: string;
  teamId?: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatParticipant {
  userId: string;
  name: string;
  avatar?: string;
  role: 'admin' | 'member';
  online: boolean;
  lastSeen?: Date;
}
