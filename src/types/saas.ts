/**
 * NUSWORD SaaS Types (PRD §19 — Security/RBAC, §7 — Organizations).
 *
 * Phase 7: Organizations, sharing, roles, usage metering — WITHOUT billing.
 * The goal is user growth and collaboration, not monetization.
 *
 * Roles (PRD §19):
 *  - owner:    full control (delete org, manage members, all content)
 *  - admin:    manage members + all content (cannot delete org)
 *  - editor:   create/edit/delete content
 *  - commenter: view + comment only
 *  - viewer:   view only
 */
import type { JSONContent } from "@tiptap/react";
import type { PageSettings } from "./document";

/** Organization roles (hierarchy). */
export type OrgRole = "owner" | "admin" | "editor" | "commenter" | "viewer";

/** Document sharing roles (subset of org roles — no owner/admin for shares). */
export type ShareRole = "editor" | "commenter" | "viewer";

/** Template categories for the marketplace. */
export type TemplateCategory =
  | "academic"
  | "business"
  | "creative"
  | "religious"
  | "personal";

/** Template type. */
export type TemplateType = "document" | "book";

/** Permission actions for role-based access control. */
export type Permission =
  | "org.delete"
  | "org.members.manage"
  | "org.settings.edit"
  | "content.create"
  | "content.edit"
  | "content.delete"
  | "content.export"
  | "content.share"
  | "content.comment"
  | "content.view";

/** Role → permissions mapping (PRD §19: RBAC). */
export const ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  owner: [
    "org.delete",
    "org.members.manage",
    "org.settings.edit",
    "content.create",
    "content.edit",
    "content.delete",
    "content.export",
    "content.share",
    "content.comment",
    "content.view",
  ],
  admin: [
    "org.members.manage",
    "org.settings.edit",
    "content.create",
    "content.edit",
    "content.delete",
    "content.export",
    "content.share",
    "content.comment",
    "content.view",
  ],
  editor: [
    "content.create",
    "content.edit",
    "content.delete",
    "content.export",
    "content.share",
    "content.comment",
    "content.view",
  ],
  commenter: [
    "content.comment",
    "content.view",
    "content.export",
  ],
  viewer: [
    "content.view",
    "content.export",
  ],
};

/** Share role → permissions (subset of org roles). */
export const SHARE_ROLE_PERMISSIONS: Record<ShareRole, Permission[]> = {
  editor: ROLE_PERMISSIONS.editor,
  commenter: ROLE_PERMISSIONS.commenter,
  viewer: ROLE_PERMISSIONS.viewer,
};

/** Check if a role has a permission. */
export function hasPermission(role: OrgRole | ShareRole, permission: Permission): boolean {
  const perms =
    role in ROLE_PERMISSIONS
      ? ROLE_PERMISSIONS[role as OrgRole]
      : SHARE_ROLE_PERMISSIONS[role as ShareRole];
  return perms.includes(permission);
}

/** Role metadata for UI display. */
export const ROLE_META: Record<OrgRole, { label: string; description: string; icon: string; color: string }> = {
  owner: { label: "Owner", description: "Full control including org deletion", icon: "admin_panel_settings", color: "text-primary" },
  admin: { label: "Admin", description: "Manage members and all content", icon: "manage_accounts", color: "text-primary" },
  editor: { label: "Editor", description: "Create, edit, and delete content", icon: "edit", color: "text-on-surface" },
  commenter: { label: "Commenter", description: "View and comment only", icon: "comment", color: "text-on-surface-variant" },
  viewer: { label: "Viewer", description: "View only", icon: "visibility", color: "text-on-surface-variant" },
};

/** Share role metadata (excludes owner/admin). */
export const SHARE_ROLE_META: Record<ShareRole, { label: string; description: string; icon: string }> = {
  editor: { label: "Editor", description: "Can edit and comment", icon: "edit" },
  commenter: { label: "Commenter", description: "Can view and comment", icon: "comment" },
  viewer: { label: "Viewer", description: "Can view only", icon: "visibility" },
};

/** Organization DTO. */
export interface NuswordOrganization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  memberCount: number;
  documentCount: number;
  bookCount: number;
  /** Current user's role in this org. */
  myRole: OrgRole;
  createdAt: string;
  updatedAt: string;
}

/** Organization member DTO. */
export interface NuswordOrgMember {
  id: string;
  email: string;
  name: string | null;
  role: OrgRole;
  createdAt: string;
}

/** Shared document DTO. */
export interface NuswordShare {
  id: string;
  documentId: string;
  documentTitle: string;
  sharedWithEmail: string;
  role: ShareRole;
  shareToken: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Template DTO. */
export interface NuswordTemplate {
  id: string;
  title: string;
  description: string | null;
  type: TemplateType;
  category: TemplateCategory;
  published: boolean;
  useCount: number;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Template category metadata for UI. */
export const TEMPLATE_CATEGORIES: Array<{
  key: TemplateCategory;
  label: string;
  icon: string;
  description: string;
}> = [
  { key: "academic", label: "Academic", icon: "school", description: "Papers, theses, research" },
  { key: "business", label: "Business", icon: "business", description: "Reports, proposals, invoices" },
  { key: "creative", label: "Creative", icon: "palette", description: "Stories, scripts, poetry" },
  { key: "religious", label: "Religious", icon: "menu_book", description: "Kitab, sermons, studies" },
  { key: "personal", label: "Personal", icon: "person", description: "Letters, journals, notes" },
];

/** Seed templates for the marketplace (system templates). */
export interface SeedTemplate {
  title: string;
  description: string;
  type: TemplateType;
  category: TemplateCategory;
  content: JSONContent;
  settings: PageSettings;
}

/** Usage stats for the dashboard (PRD §32: success metrics). */
export interface UsageStats {
  documentsCreated: number;
  booksCreated: number;
  exportsRun: number;
  templatesUsed: number;
  /** Recent activity (last 7 days). */
  recentEvents: Array<{ type: string; count: number; date: string }>;
}
