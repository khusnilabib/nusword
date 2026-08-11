/**
 * Templates CRUD — list, create, get, update, delete.
 *
 * Mirrors the Next.js API routes at `src/app/api/templates/`:
 *   GET    /templates        — list published templates (optional ?category=)
 *   POST   /templates        — create a template
 *   GET    /templates/:id    — get template (with parsed content/settings)
 *   PATCH  /templates/:id    — update template fields
 *   DELETE /templates/:id    — delete template
 *
 * Notes:
 *   - The list endpoint only returns published=true templates (unpublished
 *     ones are private to their owning org). Mirrors the Next.js behavior.
 *   - Content/settings are stored as JSON strings (SQLite/Postgres TEXT);
 *     they are parsed and returned as objects only on GET /:id.
 *   - `?category=` filters by one of the 5 valid categories.
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import {
  VALID_CATEGORIES,
  VALID_TYPES,
  firstRow,
  parseJsonField,
  stringifyJsonField,
  templateDB,
  toTemplateDTO,
  type TemplateRow,
} from "./templates";
import { usage } from "~encore/services/usage";

// ─── Auth helper ─────────────────────────────────────────────────────────

function getEmail(): string {
  if (!auth.data?.email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return auth.data.email;
}

// ─── Schemas ─────────────────────────────────────────────────────────────

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  type: z.enum(VALID_TYPES).default("document"),
  category: z.enum(VALID_CATEGORIES).default("personal"),
  content: z.any(), // Tiptap JSON — stringified before storage
  settings: z.any(), // PageSettings / BookSettings JSON
  published: z.boolean().default(false),
  organizationId: z.string().optional(),
});

const PatchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(500).nullable().optional(),
  published: z.boolean().optional(),
  content: z.any().optional(),
  settings: z.any().optional(),
});

// ─── Row coercion helper ─────────────────────────────────────────────────
//
// Encore's SQLDatabase returns rows as plain objects with column names as
// keys, but the values are untyped. This helper casts them to the TemplateRow
// shape so the rest of the code can use proper types.

function asTemplateRow(row: Record<string, unknown>): TemplateRow {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    type: row.type as string,
    category: row.category as string,
    content: (row.content as string) ?? "",
    settings: (row.settings as string) ?? "{}",
    published: (row.published as boolean) ?? false,
    organization_id: (row.organization_id as string | null) ?? null,
    use_count: (row.use_count as number) ?? 0,
    created_at: row.created_at as Date,
    updated_at: row.updated_at as Date,
  };
}

// ─── Endpoints ───────────────────────────────────────────────────────────

/**
 * GET /templates — list published templates, optionally filtered by category.
 *
 * Returns up to 200 templates ordered by useCount desc (most-used first).
 * Only published=true templates are returned (unpublished ones are private
 * to their owning org).
 *
 * Query: `?category=academic|business|creative|religious|personal`
 */
export const listTemplates = api(
  { method: "GET", path: "/templates", auth: true },
  async (
    { category }: { category?: string },
  ): Promise<{ templates: ReturnType<typeof toTemplateDTO>[] }> => {
    getEmail(); // auth check

    if (category && !(VALID_CATEGORIES as readonly string[]).includes(category)) {
      throw APIError.invalidArgument(`Invalid category: ${category}`);
    }

    // Encore's SQLDatabase only accepts tagged template literals, so we
    // branch on whether a category filter is present.
    const rows: TemplateRow[] = [];
    if (category) {
      const result = await templateDB.query`
        SELECT * FROM templates
        WHERE published = TRUE AND category = ${category}
        ORDER BY use_count DESC, created_at DESC
        LIMIT 200
      `;
      for await (const row of result) {
        rows.push(asTemplateRow(row as Record<string, unknown>));
      }
    } else {
      const result = await templateDB.query`
        SELECT * FROM templates
        WHERE published = TRUE
        ORDER BY use_count DESC, created_at DESC
        LIMIT 200
      `;
      for await (const row of result) {
        rows.push(asTemplateRow(row as Record<string, unknown>));
      }
    }

    return { templates: rows.map(toTemplateDTO) };
  },
);

/**
 * POST /templates — create a new template.
 *
 * Body: `{ title, description?, type?, category?, content, settings, published?, organizationId? }`
 * → `{ template: TemplateDTO }` (201)
 *
 * Content/settings can be either an object (will be JSON-stringified) or a
 * pre-stringified JSON string. The created template's `useCount` starts at 0.
 */
export const createTemplate = api(
  { method: "POST", path: "/templates", auth: true },
  async (body: {
    title: string;
    description?: string;
    type?: "document" | "book";
    category?: "academic" | "business" | "creative" | "religious" | "personal";
    content: unknown;
    settings: unknown;
    published?: boolean;
    organizationId?: string;
  }): Promise<{ template: ReturnType<typeof toTemplateDTO> }> => {
    const email = getEmail();

    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    const id = randomUUID();
    const description = parsed.data.description ?? null;
    const contentStr = stringifyJsonField(
      parsed.data.content,
      JSON.stringify({ type: "doc", content: [] }),
    );
    const settingsStr = stringifyJsonField(parsed.data.settings, "{}");
    const organizationId = parsed.data.organizationId ?? null;

    const inserted = await firstRow(
      templateDB.query`
        INSERT INTO templates (id, title, description, type, category, content, settings, published, organization_id)
        VALUES (${id}, ${parsed.data.title}, ${description}, ${parsed.data.type}, ${parsed.data.category}, ${contentStr}, ${settingsStr}, ${parsed.data.published}, ${organizationId})
        RETURNING *
      `,
    );
    if (!inserted) {
      throw APIError.internal("Failed to insert template");
    }

    // Log usage event (best-effort).
    try {
      await usage.logEvent({
        email,
        type: "template.create",
        resourceId: id,
      });
    } catch {
      /* usage logging is best-effort */
    }

    return { template: toTemplateDTO(asTemplateRow(inserted as Record<string, unknown>)) };
  },
);

/**
 * GET /templates/:id — get a single template with parsed content/settings.
 *
 * Unlike the list endpoint, this returns the full template including content
 * (parsed Tiptap JSON) and settings (parsed PageSettings/BookSettings JSON).
 */
export const getTemplate = api(
  { method: "GET", path: "/templates/:id", auth: true },
  async ({ id }: { id: string }): Promise<{
    template: ReturnType<typeof toTemplateDTO> & {
      content: unknown;
      settings: unknown;
    };
  }> => {
    getEmail(); // auth check

    const row = await firstRow(
      templateDB.query`SELECT * FROM templates WHERE id = ${id}`,
    );
    if (!row) {
      throw APIError.notFound("Not found");
    }

    const t = asTemplateRow(row as Record<string, unknown>);
    return {
      template: {
        ...toTemplateDTO(t),
        content: parseJsonField(t.content, { type: "doc", content: [] }),
        settings: parseJsonField(t.settings, {}),
      },
    };
  },
);

/**
 * PATCH /templates/:id — update template fields.
 *
 * Body: `{ title?, description?, published?, content?, settings? }`
 * → `{ template: TemplateDTO }` (without content/settings — same as list)
 *
 * Content/settings can be either an object or a pre-stringified JSON string.
 * Only provided fields are updated.
 */
export const updateTemplate = api(
  { method: "PATCH", path: "/templates/:id", auth: true },
  async (body: {
    id: string;
    title?: string;
    description?: string | null;
    published?: boolean;
    content?: unknown;
    settings?: unknown;
  }): Promise<{ template: ReturnType<typeof toTemplateDTO> }> => {
    const { id, ...rest } = body;
    getEmail();

    const existing = await firstRow(
      templateDB.query`SELECT * FROM templates WHERE id = ${id}`,
    );
    if (!existing) {
      throw APIError.notFound("Not found");
    }
    const current = asTemplateRow(existing as Record<string, unknown>);

    const parsed = PatchSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Merge partial updates — Encore's SQLDatabase only accepts tagged
    // template literals, so we read current values and write all fields back.
    const newTitle = parsed.data.title !== undefined ? parsed.data.title : current.title;
    const newDescription =
      parsed.data.description !== undefined
        ? parsed.data.description
        : current.description;
    const newPublished =
      parsed.data.published !== undefined ? parsed.data.published : current.published;
    const newContent =
      parsed.data.content !== undefined
        ? stringifyJsonField(parsed.data.content, current.content)
        : current.content;
    const newSettings =
      parsed.data.settings !== undefined
        ? stringifyJsonField(parsed.data.settings, current.settings)
        : current.settings;

    const updated = await firstRow(
      templateDB.query`
        UPDATE templates
        SET title = ${newTitle},
            description = ${newDescription},
            published = ${newPublished},
            content = ${newContent},
            settings = ${newSettings},
            updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `,
    );
    if (!updated) {
      throw APIError.notFound("Not found");
    }

    return { template: toTemplateDTO(asTemplateRow(updated as Record<string, unknown>)) };
  },
);

/**
 * DELETE /templates/:id — permanently delete a template.
 *
 * Returns `{ ok: true, id }`. Note: this is a hard delete (no soft-delete
 * column on templates). The Next.js route also hard-deletes.
 */
export const deleteTemplate = api(
  { method: "DELETE", path: "/templates/:id", auth: true },
  async ({ id }: { id: string }): Promise<{ ok: true; id: string }> => {
    getEmail();

    const existing = await firstRow(
      templateDB.query`SELECT id FROM templates WHERE id = ${id}`,
    );
    if (!existing) {
      throw APIError.notFound("Not found");
    }

    await templateDB.exec`DELETE FROM templates WHERE id = ${id}`;
    return { ok: true, id };
  },
);
