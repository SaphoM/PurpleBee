import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { projectDb, notificationDb, type DbProjectTaskInsert } from '@/lib/dataService';
import { useSettingsStore } from '@stores/settingsStore';

/**
 * Returns true when mock/sample data mode is active.
 * When true, all DB reads and writes are skipped — data lives in-memory only.
 * This keeps a clean separation: mock operations never touch the DB.
 */
const isMockMode = () => useSettingsStore.getState().keepMockData;

/**
 * Module-level user context — set by userStore after login so projectStore
 * can attach teamId to writes without a circular require() dep.
 * (require is not defined in Vite's ESM browser runtime.)
 */
let _ctx: { userId: string | null; teamId: string | null } = {
  userId: null,
  teamId: null,
};

export function setProjectUserContext(
  userId: string | null,
  teamId: string | null,
) {
  _ctx = { userId, teamId };
}

const getTeamContext = () => _ctx;

/** Check if a string looks like a valid UUID (not a mock ID like 'user-1') */
const isValidUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

const toDbProjectTask = (projectId: string, t: ProjectTask): DbProjectTaskInsert => ({
  id: t.id,
  project_id: projectId,
  title: t.title,
  description: t.description || null,
  priority: t.priority,
  estimated_hours: t.estimatedHours,
  tags: t.tags,
  assigned_to: t.assignedTo && isValidUuid(t.assignedTo) ? t.assignedTo : null,
  order: t.order,
  linked_task_id: t.linkedTaskId || null,
});

// ─── Project task template (suggested tasks for a project type) ────────
export interface ProjectTaskTemplate {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  tags: string[];
  order: number;
}

// ─── Project type templates with pre-built suggested tasks ─────────────
export interface ProjectTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  color: string;
  tasks: Omit<ProjectTaskTemplate, 'id'>[];
}

export const projectTemplates: ProjectTemplate[] = [
  {
    id: 'web-app',
    name: 'Web Application',
    icon: '🌐',
    description: 'Full-stack web application development',
    color: '#7c3aed',
    tasks: [
      { title: 'Product Requirements Document (PRD)', description: 'Define product goals, user personas, feature scope, user stories, and acceptance criteria before any build work starts', priority: 'urgent', estimatedHours: 8, tags: ['planning', 'documentation'], order: 1 },
      { title: 'Project setup & repository init', description: 'Initialize repo, configure linting, CI/CD, and dev environment', priority: 'high', estimatedHours: 4, tags: ['setup', 'devops'], order: 2 },
      { title: 'Design system & UI kit', description: 'Create reusable component library, color palette, and typography', priority: 'high', estimatedHours: 16, tags: ['design', 'ui'], order: 3 },
      { title: 'Database schema design', description: 'Design and implement data models, relationships, and migrations', priority: 'high', estimatedHours: 8, tags: ['database', 'backend'], order: 4 },
      { title: 'Authentication & authorization', description: 'Implement user auth flow with OAuth, JWT, and role-based access', priority: 'urgent', estimatedHours: 12, tags: ['security', 'backend'], order: 5 },
      { title: 'API development', description: 'Build REST/GraphQL endpoints for core business logic', priority: 'high', estimatedHours: 20, tags: ['backend', 'api'], order: 6 },
      { title: 'Frontend pages & routing', description: 'Build main pages, navigation, and client-side routing', priority: 'high', estimatedHours: 16, tags: ['frontend', 'ui'], order: 7 },
      { title: 'State management setup', description: 'Configure global state, caching, and data fetching patterns', priority: 'medium', estimatedHours: 6, tags: ['frontend', 'architecture'], order: 8 },
      { title: 'Responsive design & mobile', description: 'Ensure all views work on mobile, tablet, and desktop', priority: 'medium', estimatedHours: 8, tags: ['design', 'testing'], order: 9 },
      { title: 'Testing & QA', description: 'Write unit, integration, and E2E tests for critical flows', priority: 'high', estimatedHours: 14, tags: ['testing', 'qa'], order: 10 },
      { title: 'Deployment & monitoring', description: 'Deploy to production, set up monitoring, and error tracking', priority: 'high', estimatedHours: 6, tags: ['devops', 'infrastructure'], order: 11 },
    ],
  },
  {
    id: 'mobile-app',
    name: 'Mobile Application',
    icon: '📱',
    description: 'iOS and Android mobile app development',
    color: '#2563eb',
    tasks: [
      { title: 'Product Requirements Document (PRD)', description: 'Define app goals, target platforms, user flows, feature list, and release criteria before any build work starts', priority: 'urgent', estimatedHours: 8, tags: ['planning', 'documentation'], order: 1 },
      { title: 'Project setup & tooling', description: 'Initialize React Native/Flutter project, configure build tools', priority: 'high', estimatedHours: 4, tags: ['setup', 'mobile'], order: 2 },
      { title: 'UI/UX wireframes & prototypes', description: 'Design app screens, user flows, and interactive prototypes', priority: 'high', estimatedHours: 14, tags: ['design', 'ux'], order: 3 },
      { title: 'Navigation & app structure', description: 'Implement tab navigation, stack navigators, and deep linking', priority: 'high', estimatedHours: 6, tags: ['mobile', 'architecture'], order: 4 },
      { title: 'Authentication & onboarding', description: 'Build login, signup, and user onboarding screens', priority: 'urgent', estimatedHours: 10, tags: ['security', 'mobile'], order: 5 },
      { title: 'Core feature screens', description: 'Build main feature screens with data fetching and state', priority: 'high', estimatedHours: 24, tags: ['mobile', 'frontend'], order: 6 },
      { title: 'Push notifications', description: 'Integrate FCM/APNs for push notifications', priority: 'medium', estimatedHours: 8, tags: ['mobile', 'notifications'], order: 7 },
      { title: 'Offline support & caching', description: 'Implement local storage, offline mode, and sync', priority: 'medium', estimatedHours: 10, tags: ['mobile', 'database'], order: 8 },
      { title: 'Device testing & optimization', description: 'Test on multiple devices, optimize performance and memory', priority: 'high', estimatedHours: 8, tags: ['testing', 'mobile'], order: 9 },
      { title: 'App store submission', description: 'Prepare assets, screenshots, and submit to App Store/Play Store', priority: 'high', estimatedHours: 6, tags: ['release', 'mobile'], order: 10 },
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing Campaign',
    icon: '📣',
    description: 'Plan and execute a marketing campaign',
    color: '#ea580c',
    tasks: [
      { title: 'Market research & analysis', description: 'Analyze target audience, competitors, and market trends', priority: 'high', estimatedHours: 10, tags: ['research', 'marketing'], order: 1 },
      { title: 'Campaign strategy & goals', description: 'Define KPIs, budget, timeline, and channel strategy', priority: 'urgent', estimatedHours: 6, tags: ['strategy', 'marketing'], order: 2 },
      { title: 'Content creation', description: 'Write copy, blog posts, social media content, and email templates', priority: 'high', estimatedHours: 16, tags: ['content', 'marketing'], order: 3 },
      { title: 'Visual design & assets', description: 'Create banners, social graphics, video content, and brand materials', priority: 'high', estimatedHours: 14, tags: ['design', 'marketing'], order: 4 },
      { title: 'Landing page development', description: 'Build and optimize campaign landing pages with A/B variants', priority: 'high', estimatedHours: 10, tags: ['frontend', 'marketing'], order: 5 },
      { title: 'Email campaign setup', description: 'Configure email sequences, automation, and list segmentation', priority: 'medium', estimatedHours: 8, tags: ['email', 'marketing'], order: 6 },
      { title: 'Social media scheduling', description: 'Schedule posts across platforms, set up monitoring', priority: 'medium', estimatedHours: 6, tags: ['social', 'marketing'], order: 7 },
      { title: 'Analytics & tracking setup', description: 'Configure UTMs, conversion tracking, and reporting dashboards', priority: 'high', estimatedHours: 4, tags: ['analytics', 'marketing'], order: 8 },
      { title: 'Campaign launch & monitoring', description: 'Go live, monitor performance, and make real-time adjustments', priority: 'urgent', estimatedHours: 8, tags: ['launch', 'marketing'], order: 9 },
    ],
  },
  {
    id: 'api-service',
    name: 'API / Microservice',
    icon: '⚡',
    description: 'Backend API or microservice development',
    color: '#059669',
    tasks: [
      { title: 'Product Requirements Document (PRD)', description: 'Define service scope, API consumers, data contracts, SLAs, and non-functional requirements before any implementation', priority: 'urgent', estimatedHours: 6, tags: ['planning', 'documentation'], order: 1 },
      { title: 'Service architecture design', description: 'Define API contracts, data models, and service boundaries', priority: 'high', estimatedHours: 6, tags: ['architecture', 'backend'], order: 2 },
      { title: 'Project scaffolding', description: 'Set up project structure, dependencies, and configuration', priority: 'high', estimatedHours: 3, tags: ['setup', 'backend'], order: 3 },
      { title: 'Database setup & migrations', description: 'Configure database, write schemas, and seed data', priority: 'high', estimatedHours: 6, tags: ['database', 'backend'], order: 4 },
      { title: 'Core API endpoints', description: 'Implement CRUD operations and business logic endpoints', priority: 'urgent', estimatedHours: 16, tags: ['api', 'backend'], order: 5 },
      { title: 'Authentication middleware', description: 'Implement JWT validation, API keys, and rate limiting', priority: 'high', estimatedHours: 8, tags: ['security', 'backend'], order: 6 },
      { title: 'Error handling & validation', description: 'Add input validation, error responses, and logging', priority: 'medium', estimatedHours: 6, tags: ['backend', 'quality'], order: 7 },
      { title: 'API documentation', description: 'Write OpenAPI/Swagger docs with examples and schemas', priority: 'medium', estimatedHours: 6, tags: ['documentation', 'api'], order: 8 },
      { title: 'Integration tests', description: 'Write comprehensive API tests with mocking and fixtures', priority: 'high', estimatedHours: 10, tags: ['testing', 'backend'], order: 9 },
      { title: 'CI/CD & deployment', description: 'Configure pipelines, Docker, and deployment environments', priority: 'high', estimatedHours: 6, tags: ['devops', 'infrastructure'], order: 10 },
    ],
  },
  {
    id: 'design-system',
    name: 'Design System',
    icon: '🎨',
    description: 'Create a design system and component library',
    color: '#db2777',
    tasks: [
      { title: 'Design audit & inventory', description: 'Audit existing designs, identify patterns and inconsistencies', priority: 'high', estimatedHours: 8, tags: ['design', 'research'], order: 1 },
      { title: 'Design tokens & foundations', description: 'Define colors, typography, spacing, shadows, and breakpoints', priority: 'urgent', estimatedHours: 6, tags: ['design', 'tokens'], order: 2 },
      { title: 'Core components (atoms)', description: 'Build buttons, inputs, badges, icons, and typography components', priority: 'high', estimatedHours: 14, tags: ['components', 'ui'], order: 3 },
      { title: 'Composite components (molecules)', description: 'Build cards, forms, modals, navigation, and data tables', priority: 'high', estimatedHours: 18, tags: ['components', 'ui'], order: 4 },
      { title: 'Layout components', description: 'Build grid, flex containers, page layouts, and responsive helpers', priority: 'medium', estimatedHours: 8, tags: ['layout', 'ui'], order: 5 },
      { title: 'Accessibility audit', description: 'Ensure WCAG compliance, keyboard navigation, and screen reader support', priority: 'high', estimatedHours: 8, tags: ['a11y', 'quality'], order: 6 },
      { title: 'Storybook documentation', description: 'Document all components with stories, props, and usage examples', priority: 'medium', estimatedHours: 10, tags: ['documentation', 'ui'], order: 7 },
      { title: 'Theme support', description: 'Implement dark mode, custom themes, and theme switching', priority: 'medium', estimatedHours: 8, tags: ['design', 'themes'], order: 8 },
    ],
  },
  {
    id: 'training',
    name: 'Training Program',
    icon: '🎓',
    description: 'Employee training, onboarding, or learning program',
    color: '#0891b2',
    tasks: [
      { title: 'Training needs assessment', description: 'Identify skill gaps, target audience, and learning objectives', priority: 'urgent', estimatedHours: 8, tags: ['research', 'planning'], order: 1 },
      { title: 'Curriculum design & outline', description: 'Structure modules, topics, learning paths, and prerequisites', priority: 'high', estimatedHours: 12, tags: ['curriculum', 'planning'], order: 2 },
      { title: 'Content development', description: 'Create slides, guides, worksheets, and reference materials', priority: 'high', estimatedHours: 20, tags: ['content', 'materials'], order: 3 },
      { title: 'Video & multimedia production', description: 'Record tutorials, screencasts, and interactive demos', priority: 'medium', estimatedHours: 16, tags: ['video', 'multimedia'], order: 4 },
      { title: 'LMS setup & configuration', description: 'Set up learning management system, enrol learners, and configure tracking', priority: 'high', estimatedHours: 8, tags: ['lms', 'setup'], order: 5 },
      { title: 'Assessment & quiz creation', description: 'Design quizzes, practical exercises, and certification criteria', priority: 'high', estimatedHours: 10, tags: ['assessment', 'evaluation'], order: 6 },
      { title: 'Trainer preparation & rehearsal', description: 'Brief facilitators, run dry-runs, and prepare session plans', priority: 'medium', estimatedHours: 6, tags: ['facilitation', 'preparation'], order: 7 },
      { title: 'Pilot session & feedback', description: 'Run pilot with a small group, collect feedback, and iterate', priority: 'high', estimatedHours: 8, tags: ['pilot', 'feedback'], order: 8 },
      { title: 'Rollout & scheduling', description: 'Schedule sessions, send invitations, and manage registrations', priority: 'medium', estimatedHours: 4, tags: ['rollout', 'logistics'], order: 9 },
      { title: 'Evaluation & reporting', description: 'Track completion rates, scores, and measure training effectiveness', priority: 'medium', estimatedHours: 6, tags: ['analytics', 'reporting'], order: 10 },
    ],
  },
  {
    id: 'services',
    name: 'Services Project',
    icon: '💼',
    description: 'Client-facing professional services or consulting engagement',
    color: '#7c3aed',
    tasks: [
      { title: 'Client discovery & scoping', description: 'Understand client needs, define scope, deliverables, and success criteria', priority: 'urgent', estimatedHours: 8, tags: ['discovery', 'client'], order: 1 },
      { title: 'Product Requirements Document (PRD)', description: 'Translate discovery findings into a structured PRD — user stories, acceptance criteria, constraints, and out-of-scope items', priority: 'urgent', estimatedHours: 8, tags: ['planning', 'documentation'], order: 2 },
      { title: 'Proposal & SOW preparation', description: 'Draft proposal, statement of work, timelines, and pricing', priority: 'high', estimatedHours: 10, tags: ['proposal', 'documentation'], order: 3 },
      { title: 'Resource allocation & staffing', description: 'Assign team members, define roles, and plan capacity', priority: 'high', estimatedHours: 4, tags: ['resourcing', 'planning'], order: 4 },
      { title: 'Project kickoff & onboarding', description: 'Run kickoff meeting, share access, and align on communication cadence', priority: 'high', estimatedHours: 4, tags: ['kickoff', 'client'], order: 5 },
      { title: 'Requirements gathering', description: 'Conduct workshops, interviews, and document detailed requirements', priority: 'urgent', estimatedHours: 12, tags: ['requirements', 'analysis'], order: 6 },
      { title: 'Solution design & architecture', description: 'Design technical or strategic solution based on requirements', priority: 'high', estimatedHours: 16, tags: ['design', 'architecture'], order: 7 },
      { title: 'Implementation & delivery', description: 'Execute the core work — build, configure, or deliver agreed outputs', priority: 'high', estimatedHours: 40, tags: ['delivery', 'implementation'], order: 8 },
      { title: 'Client review & UAT', description: 'Present deliverables, run user acceptance testing, gather sign-off', priority: 'high', estimatedHours: 8, tags: ['review', 'testing'], order: 9 },
      { title: 'Knowledge transfer & documentation', description: 'Create handover docs, train client team, and document processes', priority: 'medium', estimatedHours: 10, tags: ['documentation', 'handover'], order: 10 },
      { title: 'Project closure & retrospective', description: 'Final sign-off, invoice, lessons learned, and client feedback', priority: 'medium', estimatedHours: 4, tags: ['closure', 'retrospective'], order: 11 },
    ],
  },
  {
    id: 'custom',
    name: 'Custom Project',
    icon: '🔧',
    description: 'Start from scratch with no template',
    color: '#6b7280',
    tasks: [],
  },
];

// ─── Project entity ────────────────────────────────────────────────────
export interface ProjectTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedHours: number;
  tags: string[];
  assignedTo?: string;
  order: number;
  linkedTaskId?: string; // Reference to actual task in taskStore once created
}

export interface Project {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  templateId: string;
  status: 'planning' | 'active' | 'on-hold' | 'completed';
  tasks: ProjectTask[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Store ─────────────────────────────────────────────────────────────
interface ProjectStore {
  projects: Project[];
  selectedProjectId: string | null;

  // Actions
  createProject: (data: {
    name: string;
    description: string;
    templateId: string;
    icon: string;
    color: string;
    tasks: Omit<ProjectTask, 'id'>[];
    createdBy: string;
  }) => string; // returns project id
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  selectProject: (id: string | null) => void;

  // Task management within project
  addProjectTask: (projectId: string, task: Omit<ProjectTask, 'id'>) => void;
  removeProjectTask: (projectId: string, taskId: string) => void;
  updateProjectTask: (projectId: string, taskId: string, updates: Partial<ProjectTask>) => void;
  assignProjectTask: (projectId: string, taskId: string, userId: string) => void;
  linkProjectTask: (projectId: string, projectTaskId: string, linkedTaskId: string) => void;

  // Queries
  getProjectById: (id: string) => Project | undefined;
  getProjectTasks: (projectId: string) => ProjectTask[];
  getUnassignedTasks: (projectId: string) => ProjectTask[];
  getAllProjectTaskTitles: () => { projectId: string; projectName: string; projectIcon: string; projectColor: string; taskId: string; taskTitle: string; taskDescription: string }[];
  clearMockData: () => void;
  restoreMockData: () => void;
  hydrateFromDb: (userId: string) => Promise<void>;
}

// ─── Seed data ─────────────────────────────────────────────────────────
const seedProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Client Portal',
    description: 'Build a self-service portal for clients to track orders, invoices, and support tickets',
    icon: '🌐',
    color: '#7c3aed',
    templateId: 'web-app',
    status: 'active',
    createdBy: 'user-1',
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    tasks: [
      { id: 'pt-0', title: 'Product Requirements Document (PRD)', description: 'Define portal goals, user personas, feature scope, user stories, and acceptance criteria', priority: 'urgent', estimatedHours: 8, tags: ['planning', 'documentation'], assignedTo: 'user-1', order: 1 },
      { id: 'pt-1', title: 'Design system & UI kit', description: 'Create reusable component library, color palette, and typography', priority: 'high', estimatedHours: 16, tags: ['design', 'ui'], assignedTo: 'user-2', order: 2 },
      { id: 'pt-2', title: 'Database schema design', description: 'Design and implement data models, relationships, and migrations', priority: 'high', estimatedHours: 8, tags: ['database', 'backend'], assignedTo: 'user-1', order: 3 },
      { id: 'pt-3', title: 'Authentication & authorization', description: 'Implement user auth flow with OAuth, JWT, and role-based access', priority: 'urgent', estimatedHours: 12, tags: ['security', 'backend'], assignedTo: 'user-3', order: 4 },
      { id: 'pt-4', title: 'API development', description: 'Build REST/GraphQL endpoints for core business logic', priority: 'high', estimatedHours: 20, tags: ['backend', 'api'], assignedTo: 'user-3', order: 5 },
      { id: 'pt-5', title: 'Frontend pages & routing', description: 'Build main pages, navigation, and client-side routing', priority: 'high', estimatedHours: 16, tags: ['frontend', 'ui'], assignedTo: 'user-5', order: 6 },
      { id: 'pt-6', title: 'Testing & QA', description: 'Write unit, integration, and E2E tests for critical flows', priority: 'high', estimatedHours: 14, tags: ['testing', 'qa'], order: 7 },
      { id: 'pt-7', title: 'Deployment & monitoring', description: 'Deploy to production, set up monitoring, and error tracking', priority: 'high', estimatedHours: 6, tags: ['devops', 'infrastructure'], assignedTo: 'user-4', order: 8 },
    ],
  },
  {
    id: 'proj-2',
    name: 'Winter Campaign',
    description: 'Plan and execute the Q3 winter product launch marketing campaign',
    icon: '📣',
    color: '#f59e0b',
    templateId: 'marketing',
    status: 'active',
    createdBy: 'user-4',
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    tasks: [
      { id: 'pt-20', title: 'Market research & competitor analysis', description: 'Analyse competitor positioning and identify key differentiators', priority: 'high', estimatedHours: 10, tags: ['research', 'strategy'], assignedTo: 'user-5', order: 1 },
      { id: 'pt-21', title: 'Campaign messaging & creative brief', description: 'Draft core messaging, tone of voice, and visual direction', priority: 'high', estimatedHours: 8, tags: ['branding', 'content'], assignedTo: 'user-2', order: 2 },
      { id: 'pt-22', title: 'Content calendar & copy', description: 'Create content schedule and write copy for all channels', priority: 'medium', estimatedHours: 14, tags: ['marketing', 'content'], assignedTo: 'user-2', order: 3 },
      { id: 'pt-23', title: 'Social media assets', description: 'Design graphics and video for social media posts', priority: 'medium', estimatedHours: 12, tags: ['design', 'social'], assignedTo: 'user-2', order: 4 },
      { id: 'pt-24', title: 'Email sequences', description: 'Build drip campaigns for leads, customers, and re-engagement', priority: 'medium', estimatedHours: 10, tags: ['email', 'automation'], assignedTo: 'user-5', order: 5 },
    ],
  },
  {
    id: 'proj-3',
    name: 'Ops & Compliance',
    description: 'Operational improvements, vendor management, and regulatory compliance tasks',
    icon: '🛡️',
    color: '#0891b2',
    templateId: 'services',
    status: 'active',
    createdBy: 'user-1',
    createdAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(),
    tasks: [
      { id: 'pt-30', title: 'POPIA compliance audit', description: 'Review all data processes against POPIA requirements', priority: 'high', estimatedHours: 16, tags: ['compliance', 'security'], assignedTo: 'user-5', order: 1 },
      { id: 'pt-31', title: 'Vendor contract renewals', description: 'Negotiate and renew annual contracts with key suppliers', priority: 'urgent', estimatedHours: 10, tags: ['legal', 'procurement'], assignedTo: 'user-3', order: 2 },
      { id: 'pt-32', title: 'Infrastructure migration', description: 'Move staging and production to new hosting provider', priority: 'high', estimatedHours: 8, tags: ['devops', 'infrastructure'], assignedTo: 'user-4', order: 3 },
      { id: 'pt-33', title: 'New hire onboarding process', description: 'Standardise onboarding checklists and orientation schedules', priority: 'medium', estimatedHours: 12, tags: ['hr', 'onboarding'], assignedTo: 'user-5', order: 4 },
      { id: 'pt-34', title: 'Payment gateway testing', description: 'Validate all payment flows and error handling end-to-end', priority: 'medium', estimatedHours: 8, tags: ['testing', 'payments'], assignedTo: 'user-3', order: 5 },
    ],
  },
];

// Read keepMockData from localStorage at module init to decide initial state.
const shouldStartWithMock = (() => {
  try {
    const raw = localStorage.getItem('purplebee-settings');
    if (!raw) return true; // default is true
    const parsed = JSON.parse(raw);
    return parsed.keepMockData !== false;
  } catch { return true; }
})();

// ─── localStorage persistence helpers ─────────────────────────────────
const PROJECTS_STORAGE_KEY = 'purplebee-projects';

const persistProjects = (projects: Project[]) => {
  try {
    localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
  } catch { /* quota exceeded – silently skip */ }
};

const loadPersistedProjects = (): Project[] | null => {
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project[];
    // Rehydrate Date objects
    return parsed.map((p) => ({
      ...p,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
  } catch { return null; }
};

/** Determine initial projects:
 * - Mock mode ON  → seed projects (sample data, in-memory only)
 * - Mock mode OFF → empty array; DB hydration will populate after login
 *
 * We deliberately do NOT restore from the localStorage cache in live mode —
 * that cache may contain stale mock project data from a previous session and
 * would flash incorrect content before hydrateFromDb overwrites it.
 */
const getInitialProjects = (): Project[] => {
  if (shouldStartWithMock) {
    // Try persisted first (user may have created/edited mock projects in this session)
    const persisted = loadPersistedProjects();
    if (persisted && persisted.length > 0) return persisted;
    return seedProjects;
  }
  // Live mode: always start empty; hydrateFromDb fills this from Supabase
  return [];
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: getInitialProjects(),
  selectedProjectId: null,

  createProject: (data) => {
    const id = uuidv4();
    const project: Project = {
      id,
      name: data.name,
      description: data.description,
      templateId: data.templateId,
      icon: data.icon,
      color: data.color,
      status: 'planning',
      tasks: data.tasks.map((t) => ({ ...t, id: uuidv4() })),
      createdBy: data.createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    set((state) => {
      const next = [project, ...state.projects];
      persistProjects(next);
      return { projects: next };
    });

    // Persist to DB only when mock mode is OFF. Attach team_id so the
    // project belongs to the company, not just the creator. Fire-and-forget.
    const { teamId } = getTeamContext();
    projectDb.insertWithTasks(
      {
        id: project.id,
        name: project.name,
        description: project.description || null,
        icon: project.icon,
        color: project.color,
        template_id: project.templateId,
        status: project.status,
        team_id: teamId || null,
        created_by: data.createdBy,
      },
      project.tasks.map((t) => toDbProjectTask(project.id, t)),
      isMockMode(),
    );

    return id;
  },

  updateProject: (id, updates) => {
    set((state) => {
      const next = state.projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
      );
      persistProjects(next);
      return { projects: next };
    });
    // Persist whitelisted fields. Tasks array is handled by add/remove/updateProjectTask.
    const payload: Record<string, unknown> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.icon !== undefined) payload.icon = updates.icon;
    if (updates.color !== undefined) payload.color = updates.color;
    if (updates.status !== undefined) payload.status = updates.status;
    if (Object.keys(payload).length > 0) {
      payload.updated_at = new Date().toISOString();
      projectDb.update(id, payload, isMockMode());
    }
  },

  deleteProject: (id) => {
    set((state) => {
      const next = state.projects.filter((p) => p.id !== id);
      persistProjects(next);
      return {
        projects: next,
        selectedProjectId: state.selectedProjectId === id ? null : state.selectedProjectId,
      };
    });
    projectDb.delete(id, isMockMode());
  },

  selectProject: (id) => set({ selectedProjectId: id }),

  addProjectTask: (projectId, task) => {
    const newId = uuidv4();
    const newTask: ProjectTask = { ...task, id: newId };
    set((state) => {
      const next = state.projects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: [...p.tasks, newTask], updatedAt: new Date() }
          : p
      );
      persistProjects(next);
      return { projects: next };
    });
    projectDb.insertTask(toDbProjectTask(projectId, newTask), isMockMode());
  },

  removeProjectTask: (projectId, taskId) => {
    set((state) => {
      const next = state.projects.map((p) =>
        p.id === projectId
          ? { ...p, tasks: p.tasks.filter((t) => t.id !== taskId), updatedAt: new Date() }
          : p
      );
      persistProjects(next);
      return { projects: next };
    });
    projectDb.deleteTask(taskId, isMockMode());
  },

  updateProjectTask: (projectId, taskId, updates) => {
    set((state) => {
      const next = state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
              updatedAt: new Date(),
            }
          : p
      );
      persistProjects(next);
      return { projects: next };
    });
    const payload: Record<string, unknown> = {};
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description || null;
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.estimatedHours !== undefined) payload.estimated_hours = updates.estimatedHours;
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo || null;
    if (updates.order !== undefined) payload.order = updates.order;
    if (updates.linkedTaskId !== undefined) payload.linked_task_id = updates.linkedTaskId || null;
    if (Object.keys(payload).length > 0) {
      projectDb.updateTask(taskId, payload, isMockMode());
    }
  },

  assignProjectTask: (projectId, taskId, userId) => {
    get().updateProjectTask(projectId, taskId, { assignedTo: userId });

    // Notify the newly-assigned user (live mode only, skip self-assignment and demo IDs)
    const { userId: currentUserId } = getTeamContext();
    if (
      !isMockMode() &&
      isValidUuid(userId) &&
      userId !== currentUserId
    ) {
      const project = get().projects.find((p) => p.id === projectId);
      const task = project?.tasks.find((t) => t.id === taskId);
      if (project && task) {
        notificationDb.insert(
          {
            id: uuidv4(),
            userId,
            type: 'task-assigned',
            title: "You've been assigned a task",
            message: `${project.name}: ${task.title}`,
            read: false,
            actionUrl: '#projects',
          },
          false,
        ).catch(() => {});
      }
    }
  },

  linkProjectTask: (projectId, projectTaskId, linkedTaskId) => {
    get().updateProjectTask(projectId, projectTaskId, { linkedTaskId });
  },

  getProjectById: (id) => get().projects.find((p) => p.id === id),

  getProjectTasks: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    return project?.tasks || [];
  },

  getUnassignedTasks: (projectId) => {
    const project = get().projects.find((p) => p.id === projectId);
    return (project?.tasks || []).filter((t) => !t.assignedTo);
  },

  getAllProjectTaskTitles: () => {
    const projects = get().projects;
    const results: { projectId: string; projectName: string; projectIcon: string; projectColor: string; taskId: string; taskTitle: string; taskDescription: string }[] = [];
    projects.forEach((p) => {
      p.tasks.forEach((t) => {
        results.push({
          projectId: p.id,
          projectName: p.name,
          projectIcon: p.icon,
          projectColor: p.color,
          taskId: t.id,
          taskTitle: t.title,
          taskDescription: t.description,
        });
      });
    });
    return results;
  },

  clearMockData: () => {
    // Clear in-memory state only — do NOT wipe localStorage.
    // hydrateFromDb will overwrite localStorage with DB data on next hydration.
    set({ projects: [], selectedProjectId: null });
  },

  restoreMockData: () => {
    // Mock mode ON → always show the built-in seed projects (sample data).
    // Never load from localStorage here — that may contain real DB data
    // from a previous hydration, which would break mock/real separation.
    set({ projects: seedProjects, selectedProjectId: null });
  },

  /**
   * Pull all projects for the user's team from Supabase (mock mode OFF only).
   * Maps DB rows back into the Project shape used across the UI.
   *
   * When the DB is empty (first real-mode login), seeds demo projects and
   * writes them to Supabase so they persist across refresh / re-login.
   * Also claims orphaned projects (team_id IS NULL) when the team resolves.
   */
  hydrateFromDb: async (userId: string) => {
    if (isMockMode()) return;
    const { teamId } = getTeamContext();

    // If team just resolved, attach any orphaned projects to it
    if (teamId) {
      await projectDb.claimOrphanedProjects(userId, teamId, false);
    }

    const rows = await projectDb.fetchAll(userId, false, teamId);
    if (rows === null) return; // DB error — keep current state, don't wipe projects
    const mapped: Project[] = (rows as Array<Record<string, any>>).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      icon: r.icon || '🔧',
      color: r.color || '#6b7280',
      templateId: r.template_id || 'custom',
      status: r.status,
      createdBy: r.created_by || '',
      createdAt: new Date(r.created_at),
      updatedAt: new Date(r.updated_at),
      tasks: ((r.project_tasks as Array<Record<string, any>>) || [])
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          priority: t.priority,
          estimatedHours: Number(t.estimated_hours) || 0,
          tags: t.tags || [],
          assignedTo: t.assigned_to || undefined,
          order: t.order ?? 0,
          linkedTaskId: t.linked_task_id || undefined,
        })),
    }));

    // Always replace in-memory state with DB data.
    // An empty array is correct for a fresh account — sample data is only
    // shown when the "Sample Data" toggle is ON.
    persistProjects(mapped);
    set({ projects: mapped });
  },
}));
