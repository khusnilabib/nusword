/**
 * Organization members — list, invite, change role, remove.
 *
 * Mirrors the Next.js API routes at `src/app/api/organizations/[id]/members/`:
 *   GET    /organizations/:id/members                — list members
 *   POST   /organizations/:id/members                — invite member (email + role)
 *   PATCH  /organizations/:id/members/:memberId      — change role
 *   DELETE /organizations/:id/members/:memberId      — remove member
 *
 * RBAC:
 *   - List members:   any org member.
 *   - Invite/patch/remove: requires `org.members.manage` (owner or admin).
 *   - Cannot demote yourself from owner.
 *   - Cannot remove an owner.
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getMemberRole, orgDB, firstRow } from "./organizations";
import { hasPermission, type Permission } from "../../shared/permissions";
import type { OrgMemberDTO, OrgRole } from "../../shared/types";
import { usage } from "~encore/services/usage";

// ─── Auth helper ─────────────────────────────────────────────────────────

function getEmail(): string {
  if (!auth.data?.email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return auth.data.email;
}

// ─── Schemas ─────────────────────────────────────────────────────────────

const InviteSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional(),
  role: z.enum(["admin", "editor", "commenter", "viewer"]).default("viewer"),
});

const PatchRoleSchema = z.object({
  role: z.enum(["owner", "admin", "editor", "commenter", "viewer"]),
});

// ─── DTO builder ─────────────────────────────────────────────────────────

interface MemberRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: Date;
}

function toMemberDTO(row: MemberRow): OrgMemberDTO {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as OrgRole,
    createdAt: row.created_at.toISOString(),
  };
}

// ─── Endpoints ───────────────────────────────────────────────────────────

/**
 * GET /organizations/:id/members — list all members of an org.
 *
 * Any member can list members. Non-members get 403.
 */
export const listMembers = api(
  { method: "GET", path: "/organizations/:id/members", auth: true },
  async ({ id }: { id: string }): Promise<{ members: OrgMemberDTO[] }> => {
    const email = getEmail();

    // Membership check — must be a member to see the roster.
    const myRole = await getMemberRole(id, email);
    if (!myRole) {
      throw APIError.permissionDenied("Forbidden");
    }

    const rows = await orgDB.query`
      SELECT id, email, name, role, created_at
      FROM organization_members
      WHERE organization_id = ${id}
      ORDER BY created_at ASC
    `;

    const members: OrgMemberDTO[] = [];
    for await (const row of rows) {
      members.push(
        toMemberDTO({
          id: row.id as string,
          email: row.email as string,
          name: (row.name as string | null) ?? null,
          role: row.role as string,
          created_at: row.created_at as Date,
        }),
      );
    }

    return { members };
  },
);

/**
 * POST /organizations/:id/members — invite a member (add by email).
 *
 * Requires `org.members.manage` (owner or admin). The invited user is added
 * immediately with the given role (default: viewer). The `owner` role cannot
 * be assigned via this endpoint — only via PATCH on an existing owner
 * transfer (and even then, the current owner must demote themselves).
 *
 * Body: `{ email, name?, role? }` → `{ member: OrgMemberDTO }` (201)
 */
export const inviteMember = api(
  { method: "POST", path: "/organizations/:id/members", auth: true },
  async (body: {
    id: string;
    email: string;
    name?: string;
    role?: "admin" | "editor" | "commenter" | "viewer";
  }): Promise<{ member: OrgMemberDTO }> => {
    const { id, ...rest } = body;
    const email = getEmail();

    const myRole = await getMemberRole(id, email);
    if (
      !myRole ||
      !hasPermission(myRole as OrgRole, "org.members.manage" as Permission)
    ) {
      throw APIError.permissionDenied("Forbidden — admin or owner only");
    }

    const parsed = InviteSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Check if already a member (UNIQUE(org_id, email) would also reject,
    // but we want to return a clean 409 instead of a 500).
    const existing = await firstRow(
      orgDB.query`
        SELECT id FROM organization_members
        WHERE organization_id = ${id} AND email = ${parsed.data.email}
      `,
    );
    if (existing) {
      throw APIError.alreadyExists("Already a member");
    }

    const memberId = randomUUID();
    const name = parsed.data.name ?? null;
    const inserted = await firstRow(
      orgDB.query`
        INSERT INTO organization_members (id, organization_id, email, name, role)
        VALUES (${memberId}, ${id}, ${parsed.data.email}, ${name}, ${parsed.data.role})
        RETURNING id, email, name, role, created_at
      `,
    );
    if (!inserted) {
      throw APIError.internal("Failed to insert member");
    }

    // Log usage event (best-effort).
    try {
      await usage.logEvent({
        email,
        type: "organization.member.invite",
        resourceId: memberId,
      });
    } catch {
      /* usage logging is best-effort */
    }

    return {
      member: toMemberDTO({
        id: inserted.id as string,
        email: inserted.email as string,
        name: (inserted.name as string | null) ?? null,
        role: inserted.role as string,
        created_at: inserted.created_at as Date,
      }),
    };
  },
);

/**
 * PATCH /organizations/:id/members/:memberId — change a member's role.
 *
 * Requires `org.members.manage`. A member cannot demote themselves from
 * owner (prevents accidental lockout).
 *
 * Body: `{ role }` → `{ member: { id, role } }`
 */
export const updateMemberRole = api(
  {
    method: "PATCH",
    path: "/organizations/:id/members/:memberId",
    auth: true,
  },
  async (body: {
    id: string;
    memberId: string;
    role: "owner" | "admin" | "editor" | "commenter" | "viewer";
  }): Promise<{ member: { id: string; role: OrgRole } }> => {
    const { id, memberId, ...rest } = body;
    const email = getEmail();

    const myRole = await getMemberRole(id, email);
    if (
      !myRole ||
      !hasPermission(myRole as OrgRole, "org.members.manage" as Permission)
    ) {
      throw APIError.permissionDenied("Forbidden");
    }

    const parsed = PatchRoleSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const target = await firstRow(
      orgDB.query`
        SELECT email, role FROM organization_members
        WHERE id = ${memberId} AND organization_id = ${id}
      `,
    );
    if (!target) {
      throw APIError.notFound("Member not found");
    }

    // Guard: cannot demote yourself from owner (prevents accidental lockout).
    if (
      target.email === email &&
      target.role === "owner" &&
      parsed.data.role !== "owner"
    ) {
      throw APIError.invalidArgument("Cannot demote yourself from owner");
    }

    const updated = await firstRow(
      orgDB.query`
        UPDATE organization_members
        SET role = ${parsed.data.role}, updated_at = NOW()
        WHERE id = ${memberId} AND organization_id = ${id}
        RETURNING id, role
      `,
    );
    if (!updated) {
      throw APIError.notFound("Member not found");
    }

    return {
      member: {
        id: updated.id as string,
        role: updated.role as OrgRole,
      },
    };
  },
);

/**
 * DELETE /organizations/:id/members/:memberId — remove a member.
 *
 * Requires `org.members.manage`. The owner cannot be removed (must transfer
 * ownership first via PATCH, or delete the org).
 */
export const removeMember = api(
  {
    method: "DELETE",
    path: "/organizations/:id/members/:memberId",
    auth: true,
  },
  async (body: { id: string; memberId: string }): Promise<{ ok: true }> => {
    const { id, memberId } = body;
    const email = getEmail();

    const myRole = await getMemberRole(id, email);
    if (
      !myRole ||
      !hasPermission(myRole as OrgRole, "org.members.manage" as Permission)
    ) {
      throw APIError.permissionDenied("Forbidden");
    }

    const target = await firstRow(
      orgDB.query`
        SELECT role FROM organization_members
        WHERE id = ${memberId} AND organization_id = ${id}
      `,
    );
    if (!target) {
      throw APIError.notFound("Member not found");
    }

    if (target.role === "owner") {
      throw APIError.invalidArgument("Cannot remove owner");
    }

    await orgDB.exec`
      DELETE FROM organization_members
      WHERE id = ${memberId} AND organization_id = ${id}
    `;
    return { ok: true };
  },
);
