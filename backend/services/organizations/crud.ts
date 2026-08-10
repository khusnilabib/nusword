/**
 * Organizations CRUD — list, create, get, update, soft-delete.
 *
 * Mirrors the Next.js API routes at `src/app/api/organizations/`:
 *   GET    /organizations        — list orgs for current user (by membership)
 *   POST   /organizations        — create org (creator becomes owner)
 *   GET    /organizations/:id    — get org details
 *   PATCH  /organizations/:id    — update name/description (org.settings.edit)
 *   DELETE /organizations/:id    — soft delete (org.delete — owner only)
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  countBooksByOrg,
  countDocumentsByOrg,
  countMembers,
  firstRow,
  getMemberRole,
  orgDB,
  slugify,
  type OrgRow,
} from "./organizations";
import { hasPermission, type Permission } from "../../shared/permissions";
import type { OrganizationDTO, OrgRole } from "../../shared/types";
import { usage } from "~encore/services/usage";

// ─── Auth helper ─────────────────────────────────────────────────────────
//
// `auth: true` on each endpoint makes Encore reject unauthenticated requests
// before the handler runs. `auth.data` is populated by the auth service's
// authHandler — see `~encore/auth` types in `encore.d.ts`.

function getEmail(): string {
  if (!auth.data?.email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return auth.data.email;
}

// ─── Schemas ─────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional(),
});

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
});

// ─── DTO builder ─────────────────────────────────────────────────────────

async function toOrgDTO(
  org: OrgRow,
  myRole: OrgRole | null,
): Promise<OrganizationDTO> {
  const [memberCount, documentCount, bookCount] = await Promise.all([
    countMembers(org.id),
    countDocumentsByOrg(org.id),
    countBooksByOrg(org.id),
  ]);
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: org.description,
    memberCount,
    documentCount,
    bookCount,
    myRole: (myRole ?? ("viewer" as OrgRole)) as OrgRole,
    createdAt: org.created_at.toISOString(),
    updatedAt: org.updated_at.toISOString(),
  };
}

// ─── Endpoints ───────────────────────────────────────────────────────────

/**
 * GET /organizations — list orgs the current user is a member of.
 *
 * Returns `{ organizations: OrganizationDTO[] }` sorted by created_at asc.
 * Soft-deleted orgs are excluded.
 */
export const listOrgs = api(
  { method: "GET", path: "/organizations", auth: true },
  async (): Promise<{ organizations: OrganizationDTO[] }> => {
    const email = getEmail();

    const rows = await orgDB.query`
      SELECT o.id, o.name, o.slug, o.description,
             o.created_at, o.updated_at, o.deleted_at,
             m.role
      FROM organization_members m
      JOIN organizations o ON o.id = m.organization_id
      WHERE m.email = ${email} AND o.deleted_at IS NULL
      ORDER BY o.created_at ASC
    `;

    const organizations: OrganizationDTO[] = [];
    for await (const row of rows) {
      const org: OrgRow = {
        id: row.id as string,
        name: row.name as string,
        slug: row.slug as string,
        description: (row.description as string | null) ?? null,
        created_at: row.created_at as Date,
        updated_at: row.updated_at as Date,
        deleted_at: (row.deleted_at as Date | null) ?? null,
      };
      organizations.push(await toOrgDTO(org, (row.role as OrgRole) ?? null));
    }

    return { organizations };
  },
);

/**
 * POST /organizations — create a new organization.
 *
 * The creator becomes the owner (role: "owner"). Slug is derived from the
 * name if not provided. Returns 409 if the slug is already taken.
 *
 * Body: `{ name, slug?, description? }` → `{ organization: OrganizationDTO }`
 */
export const createOrg = api(
  { method: "POST", path: "/organizations", auth: true },
  async (body: {
    name: string;
    slug?: string;
    description?: string;
  }): Promise<{ organization: OrganizationDTO }> => {
    const email = getEmail();

    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const slug = parsed.data.slug || slugify(parsed.data.name);

    // Check slug uniqueness (against all orgs, including soft-deleted ones,
    // so a trashed org still reserves its slug — mirrors Prisma behavior).
    const existing = await firstRow(
      orgDB.query`SELECT id FROM organizations WHERE slug = ${slug}`,
    );
    if (existing) {
      throw APIError.alreadyExists("Slug already taken");
    }

    // Create the org + make the creator the owner in a single transaction
    // so we never end up with an org that has no owner. Encore's SQLDatabase
    // uses the `await using tx = await db.begin()` pattern — the transaction
    // auto-rolls back if `commit()` isn't called before the scope exits.
    const orgId = randomUUID();
    const memberId = randomUUID();
    const description = parsed.data.description ?? null;

    await using tx = await orgDB.begin();
    await tx.exec`
      INSERT INTO organizations (id, name, slug, description)
      VALUES (${orgId}, ${parsed.data.name}, ${slug}, ${description})
    `;
    await tx.exec`
      INSERT INTO organization_members (id, organization_id, email, name, role)
      VALUES (${memberId}, ${orgId}, ${email}, ${"You"}, ${"owner"})
    `;
    await tx.commit();

    // Log usage event (best-effort — don't fail the request if logging fails).
    try {
      await usage.logEvent({
        email,
        type: "organization.create",
        resourceId: orgId,
      });
    } catch {
      /* usage logging is best-effort */
    }

    const org = await firstRow(
      orgDB.query`SELECT * FROM organizations WHERE id = ${orgId}`,
    );
    if (!org) {
      throw APIError.internal("Failed to load created organization");
    }

    const orgRow: OrgRow = {
      id: org.id as string,
      name: org.name as string,
      slug: org.slug as string,
      description: (org.description as string | null) ?? null,
      created_at: org.created_at as Date,
      updated_at: org.updated_at as Date,
      deleted_at: (org.deleted_at as Date | null) ?? null,
    };

    return {
      organization: await toOrgDTO(orgRow, "owner"),
    };
  },
);

/**
 * GET /organizations/:id — get org details.
 *
 * Returns the org DTO with the current user's role (`myRole`). Returns 404
 * if the org doesn't exist or has been soft-deleted. The `myRole` field is
 * `null` if the user is not a member (the Next.js route returns the DTO
 * anyway; RBAC is enforced on mutations, not reads).
 */
export const getOrg = api(
  { method: "GET", path: "/organizations/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ organization: OrganizationDTO }> => {
    const email = getEmail();

    const row = await firstRow(
      orgDB.query`SELECT * FROM organizations WHERE id = ${id}`,
    );
    if (!row || row.deleted_at) {
      throw APIError.notFound("Not found");
    }

    const orgRow: OrgRow = {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: (row.description as string | null) ?? null,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date,
      deleted_at: (row.deleted_at as Date | null) ?? null,
    };

    const myRole = (await getMemberRole(id, email)) as OrgRole | null;

    return { organization: await toOrgDTO(orgRow, myRole) };
  },
);

/**
 * PATCH /organizations/:id — update name and/or description.
 *
 * Requires `org.settings.edit` permission (owner or admin only).
 */
export const updateOrg = api(
  { method: "PATCH", path: "/organizations/:id", auth: true },
  async (
    { id, ...body }: { id: string; name?: string; description?: string | null },
  ): Promise<{
    organization: Pick<
      OrganizationDTO,
      "id" | "name" | "slug" | "description"
    >;
  }> => {
    const email = getEmail();

    const role = await getMemberRole(id, email);
    if (!role || !hasPermission(role as OrgRole, "org.settings.edit" as Permission)) {
      throw APIError.permissionDenied("Forbidden");
    }

    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Fetch current values so we can merge partial updates into a single
    // static UPDATE statement. (Encore's SQLDatabase only accepts tagged
    // template literals, so we can't build a dynamic SET clause.)
    const current = await firstRow(
      orgDB.query`SELECT name, description FROM organizations WHERE id = ${id}`,
    );
    if (!current) throw APIError.notFound("Not found");

    const newName =
      parsed.data.name !== undefined ? parsed.data.name : (current.name as string);
    const newDescription =
      parsed.data.description !== undefined
        ? parsed.data.description
        : (current.description as string | null);

    const updated = await firstRow(
      orgDB.query`
        UPDATE organizations
        SET name = ${newName}, description = ${newDescription}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, name, slug, description
      `,
    );
    if (!updated) throw APIError.notFound("Not found");

    return {
      organization: {
        id: updated.id as string,
        name: updated.name as string,
        slug: updated.slug as string,
        description: (updated.description as string | null) ?? null,
      },
    };
  },
);

/**
 * DELETE /organizations/:id — soft-delete the org.
 *
 * Requires `org.delete` permission (owner only). Sets `deleted_at = NOW()`
 * rather than removing the row, so the org can be restored from the trash
 * (PRD §25). The slug remains reserved (uniqueness check in `createOrg`
 * includes soft-deleted orgs).
 */
export const deleteOrg = api(
  { method: "DELETE", path: "/organizations/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ ok: true }> => {
    const email = getEmail();

    const role = await getMemberRole(id, email);
    if (!role || !hasPermission(role as OrgRole, "org.delete" as Permission)) {
      throw APIError.permissionDenied("Forbidden — owner only");
    }

    await orgDB.exec`
      UPDATE organizations SET deleted_at = NOW(), updated_at = NOW()
      WHERE id = ${id}
    `;
    return { ok: true };
  },
);
