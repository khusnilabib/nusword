/**
 * Encore virtual-module type shims.
 *
 * Encore's compiler generates these modules at build time (`encore run` /
 * `encore build`). This declaration file provides stand-in types so that
 * plain `tsc --noEmit` can type-check the source without running the
 * Encore codegen. The shapes here mirror what Encore generates based on
 * the auth handler exported from `./services/auth/auth.ts`.
 *
 * At runtime (under Encore), these declarations are ignored — Encore's
 * own generated types take precedence.
 */

declare module "~encore/auth" {
  /**
   * The auth context. `auth.data` is populated by the auth handler
   * (see services/auth/auth.ts) on every request to an `auth: true`
   * endpoint. It is `undefined` on `auth: false` endpoints or when the
   * request has no valid bearer token.
   */
  export interface AuthData {
    userID: string;
    email: string;
    name: string | null;
    createdAt: string;
  }

  export const auth: {
    /** The authenticated user's data, or undefined if not authenticated. */
    readonly data: AuthData | undefined;
  };
}

// ─── Cross-service RPC shims ─────────────────────────────────────────────
//
// These declare the RPC interfaces that other services are expected to
// expose. At Encore build time, the compiler generates real types based on
// the actual exported functions in each service folder. These shims let
// plain `tsc --noEmit` type-check the call sites without running codegen.
//
// If a service adds or renames an RPC, update the corresponding shim here
// so static type-checking stays in sync.

declare module "~encore/services/usage" {
  /** Parameters for the usage.logEvent RPC. */
  export interface LogEventParams {
    email: string;
    type: string;
    resourceId?: string;
    metadata?: string;
  }

  export const usage: {
    /**
     * Log a usage event. Best-effort — failures are swallowed inside the
     * usage service so a logging hiccup never breaks the caller.
     */
    logEvent: (params: LogEventParams) => Promise<void>;
  };
}

declare module "~encore/services/documents" {
  /** DTO returned by documents.createFromTemplate. */
  export interface DocumentDTO {
    id: string;
    title: string;
    content: unknown;
    settings: unknown;
    createdAt: string;
    updatedAt: string;
    wordCount: number;
    organizationId: string | null;
  }

  export const documents: {
    /** Create a new document from a template's content + settings. */
    createFromTemplate: (params: {
      title: string;
      content: string;
      settings: string;
      ownerEmail: string;
      organizationId?: string;
    }) => Promise<{ document: DocumentDTO }>;

    /**
     * Create a new empty document owned by the calling user. Used by the
     * books service's POST /books/:id/chapters endpoint when no documentId
     * is supplied — the new chapter gets a fresh linked document.
     */
    createDocument: (params: {
      title?: string;
      organizationId?: string;
    }) => Promise<{ document: DocumentDTO }>;

    /**
     * Fetch a single document by id. Used by the books service's
     * GET /books/:id/toc endpoint to extract headings from each chapter's
     * linked document.
     */
    getDocument: (params: { id: string }) => Promise<{ document: DocumentDTO }>;

    /** Count non-deleted documents owned by the given user email. */
    countByOwner: (params: { email: string }) => Promise<{ count: number }>;

    /** Count export jobs for documents owned by the given user email. */
    countExportsByOwner: (
      params: { email: string },
    ) => Promise<{ count: number }>;

    /** Count non-deleted documents owned by the given org. */
    countByOrg: (params: { orgId: string }) => Promise<{ count: number }>;
  };
}

declare module "~encore/services/books" {
  export const books: {
    /** Count non-deleted books owned by the given user email. */
    countByOwner: (params: { email: string }) => Promise<{ count: number }>;

    /** Count non-deleted books owned by the given org. */
    countByOrg: (params: { orgId: string }) => Promise<{ count: number }>;
  };
}
