/**
 * POST /templates/:id/use — create a new document from a template.
 *
 * Mirrors the Next.js route at `src/app/api/templates/[id]/use/route.ts`:
 *   1. Fetch the template (404 if not found).
 *   2. Parse its content + settings JSON strings.
 *   3. Create a new Document via the documents service RPC (cross-service).
 *   4. Increment the template's useCount.
 *   5. Log a "template.use" usage event.
 *   6. Return the created document.
 *
 * Body: `{ title? }` → `{ document: DocumentDTO }` (201)
 *
 * Cross-service dependency (REQUIRED for this endpoint to function):
 *   The documents service must export an RPC function `createFromTemplate`:
 *     documents.createFromTemplate({
 *       title: string,
 *       content: string,          // pre-stringified Tiptap JSON
 *       settings: string,         // pre-stringified PageSettings JSON
 *       ownerEmail: string,
 *       organizationId?: string,
 *     }) → Promise<{ document: DocumentDTO }>
 *
 *   If the documents service does not yet expose this RPC, the integration
 *   agent should add it. The DTO shape is the same as POST /documents.
 */
import { api, APIError } from "encore.dev/api";
import { auth } from "~encore/auth";
import { z } from "zod";

import { firstRow, parseJsonField, templateDB, type TemplateRow } from "./templates";
import { usage } from "~encore/services/usage";
import { documents } from "~encore/services/documents";

// ─── Auth helper ─────────────────────────────────────────────────────────

function getEmail(): string {
  if (!auth.data?.email) {
    throw APIError.unauthenticated("Unauthorized");
  }
  return auth.data.email;
}

// ─── Schemas ─────────────────────────────────────────────────────────────

const UseSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

// ─── Row coercion helper ─────────────────────────────────────────────────

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

// ─── Endpoint ────────────────────────────────────────────────────────────

/**
 * POST /templates/:id/use — instantiate a template into a new document.
 *
 * The new document inherits the template's content + settings. The template's
 * useCount is incremented, and a "template.use" usage event is logged.
 *
 * Body: `{ title? }` (defaults to the template's title) → `{ document }` (201)
 */
export const useTemplate = api(
  { method: "POST", path: "/templates/:id/use", auth: true },
  async (body: {
    id: string;
    title?: string;
  }): Promise<{ document: unknown }> => {
    const { id, ...rest } = body;
    const email = getEmail();

    const row = await firstRow(
      templateDB.query`SELECT * FROM templates WHERE id = ${id}`,
    );
    if (!row) {
      throw APIError.notFound("Template not found");
    }
    const template = asTemplateRow(row as Record<string, unknown>);

    const parsed = UseSchema.safeParse(rest);
    if (!parsed.success) {
      throw APIError.invalidArgument("Invalid request").withDetails({
        issues: parsed.error.issues,
      });
    }

    // Canonicalise the content/settings: parse and re-stringify so we write
    // valid JSON into the new document (mirrors the Next.js route which uses
    // parseContent + parseSettings from src/lib/nusword/serialize.ts).
    const rawContent = parseJsonField(template.content, null);
    const rawSettings = parseJsonField(template.settings, null);
    const contentStr =
      rawContent === null
        ? JSON.stringify({ type: "doc", content: [] })
        : JSON.stringify(rawContent);
    const settingsStr =
      rawSettings === null ? "{}" : JSON.stringify(rawSettings);

    const title = parsed.data.title ?? template.title;

    // Create the document via the documents service RPC. The documents
    // service owns the `documents` table; we can't INSERT into it directly.
    const result = await documents.createFromTemplate({
      title,
      content: contentStr,
      settings: settingsStr,
      ownerEmail: email,
      organizationId: template.organization_id ?? undefined,
    });

    // Increment template useCount.
    await templateDB.exec`
      UPDATE templates SET use_count = use_count + 1, updated_at = NOW()
      WHERE id = ${id}
    `;

    // Log usage event (best-effort).
    try {
      const docId =
        (result?.document as { id?: string } | undefined)?.id ?? null;
      await usage.logEvent({
        email,
        type: "template.use",
        resourceId: docId ?? undefined,
        metadata: JSON.stringify({
          templateId: id,
          templateTitle: template.title,
        }),
      });
    } catch {
      /* usage logging is best-effort */
    }

    return { document: result.document };
  },
);
