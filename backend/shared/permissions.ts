/**
 * NUSWORD RBAC Permissions — shared across services.
 */

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

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: [
    "org.delete", "org.members.manage", "org.settings.edit",
    "content.create", "content.edit", "content.delete",
    "content.export", "content.share", "content.comment", "content.view",
  ],
  admin: [
    "org.members.manage", "org.settings.edit",
    "content.create", "content.edit", "content.delete",
    "content.export", "content.share", "content.comment", "content.view",
  ],
  editor: [
    "content.create", "content.edit", "content.delete",
    "content.export", "content.share", "content.comment", "content.view",
  ],
  commenter: ["content.comment", "content.view", "content.export"],
  viewer: ["content.view", "content.export"],
};

export const SHARE_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  editor: ROLE_PERMISSIONS.editor,
  commenter: ROLE_PERMISSIONS.commenter,
  viewer: ROLE_PERMISSIONS.viewer,
};

export function hasPermission(role: string, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role] || SHARE_ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}
