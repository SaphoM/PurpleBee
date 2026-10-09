import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { projectDb, projectValueHistoryDb, type DbProjectTaskInsert } from '@/lib/dataService';
import { notifyUser, notifyUsers } from '@/lib/notify';
import { useSettingsStore } from '@stores/settingsStore';
import type { Attachment, TaskLink } from '@/types/index';

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
let _ctx: { userId: string | null; teamId: string | null; role: string | null; userName: string } = {
  userId: null,
  teamId: null,
  role: null,
  userName: 'Someone',
};

export function setProjectUserContext(
  userId: string | null,
  teamId: string | null,
  role?: string | null,
  userName?: string,
) {
  _ctx = { userId, teamId, role: role ?? null, userName: userName || _ctx.userName };
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
    id: 'product-sales',
    name: 'Product Sales',
    icon: '💰',
    description: 'Launch and run a product sales pipeline or campaign',
    color: '#16a34a',
    tasks: [
      { title: 'Pricing strategy', description: 'Define price points, discount tiers, and bundling options based on market and margin analysis', priority: 'urgent', estimatedHours: 6, tags: ['pricing', 'strategy'], order: 1 },
      { title: 'Target market & lead list', description: 'Identify ideal customer profile, build a qualified lead list, and segment by priority', priority: 'high', estimatedHours: 8, tags: ['leads', 'research'], order: 2 },
      { title: 'Sales collateral & pitch deck', description: 'Create product one-pagers, pitch deck, and comparison sheets for the sales team', priority: 'high', estimatedHours: 10, tags: ['collateral', 'design'], order: 3 },
      { title: 'CRM & pipeline setup', description: 'Configure deal stages, pipeline automation, and reporting in the CRM', priority: 'high', estimatedHours: 6, tags: ['crm', 'setup'], order: 4 },
      { title: 'Proposal & quote template', description: 'Build a reusable proposal/quote template with standard terms and approval workflow', priority: 'medium', estimatedHours: 5, tags: ['proposal', 'documentation'], order: 5 },
      { title: 'Sales enablement training', description: 'Train the sales team on product positioning, objection handling, and demo flow', priority: 'high', estimatedHours: 8, tags: ['training', 'enablement'], order: 6 },
      { title: 'Contract & terms review', description: 'Finalize standard contract terms, discount approval limits, and legal sign-off', priority: 'high', estimatedHours: 6, tags: ['contract', 'legal'], order: 7 },
      { title: 'Campaign & outreach launch', description: 'Kick off outbound outreach, email sequences, and initial customer calls', priority: 'urgent', estimatedHours: 10, tags: ['outreach', 'launch'], order: 8 },
      { title: 'Sales tracking dashboard', description: 'Set up win-rate, pipeline value, and forecast dashboards for visibility', priority: 'medium', estimatedHours: 5, tags: ['reporting', 'analytics'], order: 9 },
      { title: 'Post-sale handover & onboarding', description: 'Define handoff process from sales to delivery/success once a deal closes', priority: 'medium', estimatedHours: 4, tags: ['handover', 'onboarding'], order: 10 },
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
    id: 'cybersecurity',
    name: 'Cybersecurity',
    icon: '🛡️',
    description: 'Security audit, penetration testing, or compliance programme',
    color: '#dc2626',
    tasks: [
      { title: 'Scope & risk assessment', description: 'Define engagement scope, assets in-scope, threat actors, and risk tolerance', priority: 'urgent', estimatedHours: 8, tags: ['planning', 'risk'], order: 1 },
      { title: 'Asset inventory & classification', description: 'Enumerate systems, data stores, and third-party integrations; classify by sensitivity', priority: 'high', estimatedHours: 6, tags: ['inventory', 'classification'], order: 2 },
      { title: 'Threat modelling', description: 'Map attack surfaces using STRIDE or MITRE ATT&CK; prioritise high-impact threat scenarios', priority: 'urgent', estimatedHours: 10, tags: ['threat-modelling', 'architecture'], order: 3 },
      { title: 'Vulnerability scanning', description: 'Run automated scans (SAST, DAST, dependency audit) and triage findings by CVSS score', priority: 'high', estimatedHours: 8, tags: ['scanning', 'vulnerabilities'], order: 4 },
      { title: 'Penetration testing', description: 'Conduct manual pentesting across network, application, and social-engineering vectors', priority: 'urgent', estimatedHours: 20, tags: ['pentest', 'red-team'], order: 5 },
      { title: 'Security controls review', description: 'Evaluate existing controls (firewalls, IAM, encryption, logging) against best-practice baselines', priority: 'high', estimatedHours: 10, tags: ['controls', 'compliance'], order: 6 },
      { title: 'Incident response plan', description: 'Draft or update IR runbooks, escalation paths, and communication templates', priority: 'high', estimatedHours: 8, tags: ['incident-response', 'planning'], order: 7 },
      { title: 'Compliance audit', description: 'Assess alignment with applicable frameworks (SOC 2, ISO 27001, GDPR, PCI-DSS)', priority: 'high', estimatedHours: 12, tags: ['compliance', 'audit'], order: 8 },
      { title: 'Security awareness training', description: 'Deliver phishing simulations and security hygiene training to all staff', priority: 'medium', estimatedHours: 6, tags: ['training', 'awareness'], order: 9 },
      { title: 'Remediation tracking & re-test', description: 'Track fix progress, validate remediations, and close findings with evidence', priority: 'high', estimatedHours: 10, tags: ['remediation', 'verification'], order: 10 },
      { title: 'Executive report & roadmap', description: 'Produce executive summary, risk register, and prioritised remediation roadmap', priority: 'medium', estimatedHours: 6, tags: ['reporting', 'documentation'], order: 11 },
    ],
  },
  {
    id: 'cloud-computing',
    name: 'Cloud Computing',
    icon: '☁️',
    description: 'Cloud infrastructure build-out or migration to AWS / Azure / GCP',
    color: '#0284c7',
    tasks: [
      { title: 'Cloud strategy & architecture design', description: 'Choose provider(s), define region strategy, HA/DR targets, and landing-zone blueprint', priority: 'urgent', estimatedHours: 10, tags: ['architecture', 'planning'], order: 1 },
      { title: 'Environment setup (Dev / Staging / Prod)', description: 'Provision accounts/projects, apply naming conventions, and configure billing alerts', priority: 'high', estimatedHours: 6, tags: ['setup', 'environments'], order: 2 },
      { title: 'Infrastructure as code', description: 'Write Terraform / Pulumi / CDK modules for all core resources; store in version control', priority: 'urgent', estimatedHours: 16, tags: ['iac', 'devops'], order: 3 },
      { title: 'Networking & VPC configuration', description: 'Set up VPCs, subnets, route tables, NAT gateways, peering, and private DNS', priority: 'high', estimatedHours: 8, tags: ['networking', 'infrastructure'], order: 4 },
      { title: 'Identity & access management', description: 'Configure IAM roles, policies, service accounts, and enforce least-privilege', priority: 'urgent', estimatedHours: 8, tags: ['iam', 'security'], order: 5 },
      { title: 'Compute & container platform', description: 'Deploy VM fleets, Kubernetes clusters, or serverless functions for application workloads', priority: 'high', estimatedHours: 14, tags: ['compute', 'containers'], order: 6 },
      { title: 'CI/CD pipeline setup', description: 'Configure build, test, and deploy pipelines with environment promotion gates', priority: 'high', estimatedHours: 8, tags: ['cicd', 'devops'], order: 7 },
      { title: 'Monitoring & observability', description: 'Instrument with metrics, logs, traces, and set up alerting dashboards', priority: 'high', estimatedHours: 8, tags: ['monitoring', 'observability'], order: 8 },
      { title: 'Security hardening', description: 'Enable WAF, SIEM integration, secrets management, and run CIS benchmark checks', priority: 'high', estimatedHours: 8, tags: ['security', 'hardening'], order: 9 },
      { title: 'Cost optimisation', description: 'Right-size resources, configure autoscaling, set up savings plans, and review spend dashboards', priority: 'medium', estimatedHours: 6, tags: ['cost', 'optimisation'], order: 10 },
      { title: 'Disaster recovery & backup', description: 'Implement cross-region backups, run DR failover drills, and document RTO/RPO', priority: 'high', estimatedHours: 8, tags: ['dr', 'backup'], order: 11 },
    ],
  },
  {
    id: 'support',
    name: 'Support',
    icon: '🎧',
    description: 'Customer support system, helpdesk, or service desk setup',
    color: '#0d9488',
    tasks: [
      { title: 'Support strategy & SLA definition', description: 'Define support tiers, response/resolution SLAs, and escalation thresholds', priority: 'urgent', estimatedHours: 6, tags: ['strategy', 'sla'], order: 1 },
      { title: 'Helpdesk platform setup', description: 'Configure ticketing system (Zendesk, Freshdesk, Linear, etc.) with queues, routing rules, and automations', priority: 'high', estimatedHours: 8, tags: ['tooling', 'setup'], order: 2 },
      { title: 'Knowledge base creation', description: 'Write FAQs, troubleshooting guides, and how-to articles for common issues', priority: 'high', estimatedHours: 14, tags: ['documentation', 'knowledge-base'], order: 3 },
      { title: 'Ticket routing & escalation rules', description: 'Define priority tiers, auto-assignment rules, and escalation paths to engineering', priority: 'high', estimatedHours: 6, tags: ['workflow', 'routing'], order: 4 },
      { title: 'Support team onboarding', description: 'Train agents on product, tools, tone of voice, and escalation procedures', priority: 'high', estimatedHours: 10, tags: ['training', 'onboarding'], order: 5 },
      { title: 'Customer communication templates', description: 'Write and approve email/chat templates for common scenarios — acknowledgement, resolution, follow-up', priority: 'medium', estimatedHours: 6, tags: ['communication', 'templates'], order: 6 },
      { title: 'Self-service portal launch', description: 'Publish knowledge base, status page, and community forum for tier-0 deflection', priority: 'medium', estimatedHours: 8, tags: ['self-service', 'portal'], order: 7 },
      { title: 'Reporting & metrics dashboards', description: 'Set up CSAT, first-response time, resolution rate, and backlog dashboards', priority: 'high', estimatedHours: 6, tags: ['analytics', 'reporting'], order: 8 },
      { title: 'Customer feedback loop', description: 'Implement CSAT/NPS surveys, triage qualitative feedback, and route insights to product', priority: 'medium', estimatedHours: 4, tags: ['feedback', 'csat'], order: 9 },
      { title: 'Incident & outage communication', description: 'Define runbook for customer-facing communications during incidents and post-mortems', priority: 'high', estimatedHours: 6, tags: ['incident', 'communication'], order: 10 },
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
  /** Optional product name for Product Sales projects (and any project where it's relevant) */
  productName?: string;
  /** Project References — supporting material for the project as a whole (discovery meetings, requirements, scope docs, screenshots, etc.), distinct from any individual task's own attachments/links. */
  attachments?: Attachment[];
  links?: TaskLink[];
  /**
   * Optional financial value for this project. Deliberately never populated
   * by hydrateFromDb's bulk fetch — only ever set client-side after a
   * successful projectDb.getValue() RPC call, which enforces per-project
   * visibility server-side. Absence here means "not fetched/not visible",
   * not necessarily "no value set".
   */
  value?: number;
  currency?: string;
  /** Who can see `value` — defaults to 'admins' (safest) at the DB level. */
  valueVisibility?: 'admins' | 'managers' | 'team' | 'selected';
  valueVisibleUserIds?: string[];
  /** Per-project card-display toggles. Undefined/missing fields fall back to the card's existing default rendering. */
  cardDisplay?: {
    value?: boolean;
    status?: boolean;
    progress?: boolean;
    team?: boolean;
    projectManager?: boolean;
    taskCompletion?: boolean;
    projectType?: boolean;
    plannedCompletion?: boolean;
  };
  /** Internal (in-house) vs External (client/customer) project. Defaults to 'internal' at the DB level. */
  projectType?: 'internal' | 'external';
  /** Optional planned timeline — used only to compute time-progress (see getProjectTimeProgress). Never persisted as a percentage. */
  plannedStartDate?: Date;
  plannedCompletionDate?: Date;
}

// ─── Project planning calculations (foundation for future Value vs Time vs
// Completion reporting) — always computed at render time from live data,
// never persisted, so they can never go stale. ──────────────────────────

export interface ProjectTaskStats {
  total: number;
  completed: number;
  inProgress: number;
  planned: number;
  remaining: number;
  completionPct: number | null;
}

/**
 * Buckets a project's checklist tasks (`project.tasks`) by the status of
 * whichever board task they're linked to (`linkedTaskId`). Unlinked tasks —
 * and linked tasks still at 'todo' — count as "planned" (not yet started).
 * This generalizes the Card's earlier one-off progress calculation into a
 * single shared helper reused by the Card, ProjectDetail, and any future
 * Analytics view.
 */
export function getProjectTaskStats(
  project: Pick<Project, 'tasks'>,
  boardTasks: Array<{ id: string; status: string }>,
): ProjectTaskStats {
  const total = project.tasks.length;
  let completed = 0;
  let inProgress = 0;
  for (const t of project.tasks) {
    const linked = t.linkedTaskId ? boardTasks.find((bt) => bt.id === t.linkedTaskId) : undefined;
    if (linked?.status === 'completed') completed++;
    else if (linked?.status === 'in-progress' || linked?.status === 'review') inProgress++;
  }
  const planned = total - completed - inProgress;
  const remaining = planned + inProgress;
  return {
    total, completed, inProgress, planned, remaining,
    completionPct: total === 0 ? null : Math.round((completed / total) * 100),
  };
}

export interface ProjectTimeProgress {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  timeProgressPct: number;
}

/**
 * Computes elapsed/remaining time against the project's planned dates.
 * Returns null when either date is missing or the range is invalid
 * (completion on/before start) — callers should treat null as "no
 * planned timeline to show", not an error.
 */
export function getProjectTimeProgress(
  project: Pick<Project, 'plannedStartDate' | 'plannedCompletionDate'>,
): ProjectTimeProgress | null {
  if (!project.plannedStartDate || !project.plannedCompletionDate) return null;
  const start = new Date(project.plannedStartDate).getTime();
  const end = new Date(project.plannedCompletionDate).getTime();
  if (!(end > start)) return null;
  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const totalDays = Math.round((end - start) / DAY_MS);
  const elapsedDaysRaw = (now - start) / DAY_MS;
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.round(elapsedDaysRaw)));
  const remainingDays = totalDays - elapsedDays;
  const timeProgressPct = Math.max(0, Math.min(100, Math.round((elapsedDaysRaw / totalDays) * 100)));
  return { totalDays, elapsedDays, remainingDays, timeProgressPct };
}

export type ProjectPace = 'ahead' | 'behind' | 'on-pace' | 'unknown';

/**
 * Compares planned time-elapsed against actual task completion — the
 * foundation for a future Value vs Time vs Completion view. 'unknown'
 * whenever either input isn't available (no planned dates, or no tasks to
 * measure completion from) rather than guessing.
 */
export function getProjectPace(
  project: Pick<Project, 'tasks' | 'plannedStartDate' | 'plannedCompletionDate'>,
  boardTasks: Array<{ id: string; status: string }>,
): ProjectPace {
  const time = getProjectTimeProgress(project);
  const stats = getProjectTaskStats(project, boardTasks);
  if (!time || stats.completionPct === null) return 'unknown';
  const diff = stats.completionPct - time.timeProgressPct;
  const TOLERANCE = 10;
  if (diff > TOLERANCE) return 'ahead';
  if (diff < -TOLERANCE) return 'behind';
  return 'on-pace';
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
    productName?: string;
    attachments?: Attachment[];
    links?: TaskLink[];
    value?: number;
    currency?: string;
    valueVisibility?: Project['valueVisibility'];
    valueVisibleUserIds?: string[];
    cardDisplay?: Project['cardDisplay'];
    projectType?: Project['projectType'];
    plannedStartDate?: Date;
    plannedCompletionDate?: Date;
  }) => string; // returns project id
  /** `notify` (default true) — pass false for system-derived updates (e.g. auto status derivation from linked task progress) so they don't spam project members with a notification for something nobody actively did. */
  updateProject: (id: string, updates: Partial<Project>, notify?: boolean) => void;
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
  getAllProjectTaskTitles: () => { projectId: string; projectName: string; projectIcon: string; projectColor: string; taskId: string; taskTitle: string; taskDescription: string; assignedTo?: string }[];
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
      productName: data.productName || undefined,
      attachments: data.attachments || undefined,
      links: data.links || undefined,
      value: data.value ?? undefined,
      currency: data.value !== undefined ? (data.currency || 'ZAR') : undefined,
      valueVisibility: data.valueVisibility || 'admins',
      valueVisibleUserIds: data.valueVisibleUserIds || undefined,
      cardDisplay: data.cardDisplay || undefined,
      projectType: data.projectType || 'internal',
      plannedStartDate: data.plannedStartDate || undefined,
      plannedCompletionDate: data.plannedCompletionDate || undefined,
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
        product_name: project.productName || null,
        attachments: project.attachments && project.attachments.length > 0 ? project.attachments : null,
        links: project.links && project.links.length > 0 ? project.links : null,
        value: project.value ?? null,
        currency: project.currency || 'ZAR',
        value_visibility: project.valueVisibility || 'admins',
        value_visible_user_ids: project.valueVisibleUserIds && project.valueVisibleUserIds.length > 0 ? project.valueVisibleUserIds : null,
        card_display: project.cardDisplay || null,
        project_type: project.projectType || 'internal',
        planned_start_date: project.plannedStartDate ? project.plannedStartDate.toISOString().slice(0, 10) : null,
        planned_completion_date: project.plannedCompletionDate ? project.plannedCompletionDate.toISOString().slice(0, 10) : null,
      },
      project.tasks.map((t) => toDbProjectTask(project.id, t)),
      isMockMode(),
    );

    return id;
  },

  updateProject: (id, updates, notify = true) => {
    const prevProject = get().projects.find((p) => p.id === id);
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
    if (updates.productName !== undefined) payload.product_name = updates.productName || null;
    if (updates.attachments !== undefined) payload.attachments = updates.attachments && updates.attachments.length > 0 ? updates.attachments : null;
    if (updates.links !== undefined) payload.links = updates.links && updates.links.length > 0 ? updates.links : null;
    if (updates.value !== undefined) payload.value = updates.value ?? null;
    if (updates.currency !== undefined) payload.currency = updates.currency || 'ZAR';
    if (updates.valueVisibility !== undefined) payload.value_visibility = updates.valueVisibility || 'admins';
    if (updates.valueVisibleUserIds !== undefined) payload.value_visible_user_ids = updates.valueVisibleUserIds && updates.valueVisibleUserIds.length > 0 ? updates.valueVisibleUserIds : null;
    if (updates.cardDisplay !== undefined) payload.card_display = updates.cardDisplay || null;
    if (updates.projectType !== undefined) payload.project_type = updates.projectType || 'internal';
    if (updates.plannedStartDate !== undefined) payload.planned_start_date = updates.plannedStartDate ? new Date(updates.plannedStartDate).toISOString().slice(0, 10) : null;
    if (updates.plannedCompletionDate !== undefined) payload.planned_completion_date = updates.plannedCompletionDate ? new Date(updates.plannedCompletionDate).toISOString().slice(0, 10) : null;
    if (Object.keys(payload).length > 0) {
      payload.updated_at = new Date().toISOString();
      projectDb.update(id, payload, isMockMode());
    }

    // ── Audit trail: log Project Value changes (value or currency) ──
    if (
      prevProject &&
      (updates.value !== undefined || updates.currency !== undefined) &&
      (updates.value !== prevProject.value || (updates.currency ?? prevProject.currency) !== prevProject.currency)
    ) {
      const { userId: actorId, userName: actorName, teamId } = getTeamContext();
      if (actorId) {
        projectValueHistoryDb.insert(
          {
            projectId: id,
            projectName: prevProject.name,
            teamId,
            actorId,
            actorName,
            oldValue: prevProject.value ?? null,
            oldCurrency: prevProject.currency ?? null,
            newValue: updates.value !== undefined ? updates.value ?? null : prevProject.value ?? null,
            newCurrency: updates.currency !== undefined ? updates.currency || 'ZAR' : prevProject.currency ?? null,
          },
          isMockMode(),
        );
      }
    }

    // ── Notify everyone with a task assigned in this project when its status actually changes ──
    if (notify && updates.status !== undefined && prevProject && updates.status !== prevProject.status) {
      const { userId: currentUserId, userName } = getTeamContext();
      const recipients = Array.from(
        new Set(prevProject.tasks.map((t) => t.assignedTo).filter((uid): uid is string => !!uid))
      );
      notifyUsers(recipients, {
        actorId: currentUserId,
        type: 'project-updated',
        title: 'Project updated',
        message: `${userName} changed "${prevProject.name}" status to ${updates.status}`,
        actionUrl: `#projects?projectId=${id}`,
      });
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
    const prevProject = get().projects.find((p) => p.id === projectId);
    const prevTask = prevProject?.tasks.find((t) => t.id === taskId);
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

    // ── Notify the assignee whenever a project task is (re)assigned — the
    // single source of truth for this, so assignProjectTask (which just
    // delegates here) doesn't need its own duplicate notify logic. ──
    if (
      updates.assignedTo !== undefined &&
      updates.assignedTo !== prevTask?.assignedTo &&
      updates.assignedTo &&
      isValidUuid(updates.assignedTo)
    ) {
      const { userId: currentUserId, userName } = getTeamContext();
      const taskTitle = updates.title || prevTask?.title || 'a task';
      notifyUser({
        actorId: currentUserId,
        recipientId: updates.assignedTo,
        type: 'task-assigned',
        title: 'Task assigned to you',
        message: `${userName} assigned "${taskTitle}" to you${prevProject ? ` in ${prevProject.name}` : ''}`,
        actionUrl: `#projects?projectId=${projectId}`,
      });
    }
  },

  assignProjectTask: (projectId, taskId, userId) => {
    get().updateProjectTask(projectId, taskId, { assignedTo: userId });
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
    const results: { projectId: string; projectName: string; projectIcon: string; projectColor: string; taskId: string; taskTitle: string; taskDescription: string; assignedTo?: string }[] = [];
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
          assignedTo: t.assignedTo,
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

    const { role } = getTeamContext();
    const rows = await projectDb.fetchAll(userId, false, teamId, role);
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
      productName: r.product_name || undefined,
      attachments: r.attachments || [],
      links: r.links || [],
      // value/currency are deliberately NOT in this payload (see
      // projectDb.fetchAll) — never hydrated here; fetched on demand via
      // projectDb.getValue() by whichever component needs to show it.
      cardDisplay: r.card_display || undefined,
      projectType: r.project_type || 'internal',
      plannedStartDate: r.planned_start_date ? new Date(r.planned_start_date) : undefined,
      plannedCompletionDate: r.planned_completion_date ? new Date(r.planned_completion_date) : undefined,
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

// Push a live project snapshot to the backend so the WhatsApp/Telegram bot
// can show real projects (never hardcoded/hallucinated ones).
import('@/lib/botSocket').then(({ getBotSocket }) => {
  const socket = getBotSocket();
  const pushSnapshot = () => {
    const projects = useProjectStore.getState().projects;
    socket.emit('projects:sync', projects.map((p) => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
      updatedAt: new Date(p.updatedAt).toISOString(),
    })));
  };
  socket.on('connect', pushSnapshot);
  useProjectStore.subscribe(pushSnapshot);
});
