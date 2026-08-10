"use client";

/**
 * NUSWORD SaaS data hooks (TanStack Query) — Phase 7.
 *
 * Server state for the SaaS layer:
 *  - Organizations (CRUD)
 *  - Org members (invite / update role / remove)
 *  - Document sharing (invite / update role / revoke / shared-with-me)
 *  - Templates (marketplace: list / get / create / update / delete / use)
 *  - Usage stats (dashboard success metrics)
 *
 * Follows the same patterns as `use-documents.ts` and `use-books.ts`:
 * client-side `fetchJson` helper, wrapped API responses, query-key
 * invalidation on mutations.
 */
import * as React from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { JSONContent } from "@tiptap/react";
import type {
  NuswordOrganization,
  NuswordOrgMember,
  NuswordShare,
  NuswordTemplate,
  UsageStats,
  OrgRole,
  ShareRole,
  TemplateCategory,
  TemplateType,
} from "@/types/saas";
import type { PageSettings } from "@/types/document";

/* ------------------------------------------------------------------ */
/* Fetch helpers (client-side, relative URLs only per gateway rules)  */
/* ------------------------------------------------------------------ */

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

/* ================================================================== */
/* Organizations                                                       */
/* ================================================================== */

export function useOrganizations() {
  return useQuery({
    queryKey: ["organizations"],
    queryFn: () =>
      fetchJson<{ organizations: NuswordOrganization[] }>(
        "/api/organizations",
      ).then((r) => r.organizations),
  });
}

export function useOrganization(id: string | null) {
  return useQuery({
    queryKey: ["organization", id],
    enabled: !!id,
    queryFn: () =>
      fetchJson<{ organization: NuswordOrganization }>(
        `/api/organizations/${id}`,
      ).then((r) => r.organization),
  });
}

export interface CreateOrganizationInput {
  name: string;
  description?: string;
}

export function useCreateOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateOrganizationInput) =>
      fetchJson<{ organization: NuswordOrganization }>("/api/organizations", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.organization),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string | null;
}

export function useUpdateOrganization(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateOrganizationInput) =>
      fetchJson<{ organization: NuswordOrganization }>(
        `/api/organizations/${id}`,
        { method: "PATCH", body: JSON.stringify(input) },
      ).then((r) => r.organization),
    onSuccess: (data) => {
      // Reflect server-canonical state in the single-org cache.
      qc.setQueryData(["organization", id], data);
      // Mark the list (and any other org queries) as stale.
      qc.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

export function useDeleteOrganization() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ ok: boolean; id: string }>(`/api/organizations/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organizations"] });
    },
  });
}

/* ================================================================== */
/* Org members                                                         */
/* ================================================================== */

export function useOrgMembers(orgId: string | null) {
  return useQuery({
    queryKey: ["org-members", orgId],
    enabled: !!orgId,
    queryFn: () =>
      fetchJson<{ members: NuswordOrgMember[] }>(
        `/api/organizations/${orgId}/members`,
      ).then((r) => r.members),
  });
}

export interface InviteMemberInput {
  email: string;
  name?: string;
  role: OrgRole;
}

export function useInviteMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) =>
      fetchJson<{ member: NuswordOrgMember }>(
        `/api/organizations/${orgId}/members`,
        { method: "POST", body: JSON.stringify(input) },
      ).then((r) => r.member),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
      // Member count on the org summary changed.
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.invalidateQueries({ queryKey: ["organization", orgId] });
    },
  });
}

export interface UpdateMemberInput {
  memberId: string;
  role: OrgRole;
}

export function useUpdateMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMemberInput) =>
      fetchJson<{ member: NuswordOrgMember }>(
        `/api/organizations/${orgId}/members/${input.memberId}`,
        { method: "PATCH", body: JSON.stringify({ role: input.role }) },
      ).then((r) => r.member),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
    },
  });
}

export function useRemoveMember(orgId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) =>
      fetchJson<{ ok: boolean; id: string }>(
        `/api/organizations/${orgId}/members/${memberId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["org-members", orgId] });
      // Member count on the org summary changed.
      qc.invalidateQueries({ queryKey: ["organizations"] });
      qc.invalidateQueries({ queryKey: ["organization", orgId] });
    },
  });
}

/* ================================================================== */
/* Document sharing                                                    */
/* ================================================================== */

export function useDocumentShares(documentId: string | null) {
  return useQuery({
    queryKey: ["document-shares", documentId],
    enabled: !!documentId,
    queryFn: () =>
      fetchJson<{ shares: NuswordShare[] }>(
        `/api/documents/${documentId}/shares`,
      ).then((r) => r.shares),
  });
}

export interface ShareDocumentInput {
  email: string;
  role: ShareRole;
}

export function useShareDocument(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ShareDocumentInput) =>
      fetchJson<{ share: NuswordShare }>(
        `/api/documents/${documentId}/shares`,
        { method: "POST", body: JSON.stringify(input) },
      ).then((r) => r.share),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-shares", documentId] });
    },
  });
}

export interface UpdateShareInput {
  shareId: string;
  role: ShareRole;
}

export function useUpdateShare(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateShareInput) =>
      fetchJson<{ share: NuswordShare }>(
        `/api/documents/${documentId}/shares/${input.shareId}`,
        { method: "PATCH", body: JSON.stringify({ role: input.role }) },
      ).then((r) => r.share),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-shares", documentId] });
    },
  });
}

export function useRevokeShare(documentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (shareId: string) =>
      fetchJson<{ ok: boolean; id: string }>(
        `/api/documents/${documentId}/shares/${shareId}`,
        { method: "DELETE" },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["document-shares", documentId] });
    },
  });
}

/** Documents shared with the current user (inbox). */
export function useSharedWithMe() {
  return useQuery({
    queryKey: ["shared-with-me"],
    queryFn: () =>
      fetchJson<{ shares: NuswordShare[] }>("/api/shared").then(
        (r) => r.shares,
      ),
  });
}

/* ================================================================== */
/* Templates                                                           */
/* ================================================================== */

/** Single template with parsed content + settings (from GET /[id]). */
export type NuswordTemplateDetail = NuswordTemplate & {
  content: JSONContent;
  settings: PageSettings;
};

export function useTemplates(category?: TemplateCategory | null) {
  return useQuery({
    queryKey: ["templates", category ?? null],
    queryFn: () => {
      const url = category
        ? `/api/templates?category=${encodeURIComponent(category)}`
        : "/api/templates";
      return fetchJson<{ templates: NuswordTemplate[] }>(url).then(
        (r) => r.templates,
      );
    },
  });
}

export function useTemplate(id: string | null) {
  return useQuery({
    queryKey: ["template", id],
    enabled: !!id,
    queryFn: () =>
      fetchJson<{ template: NuswordTemplateDetail }>(
        `/api/templates/${id}`,
      ).then((r) => r.template),
  });
}

export interface CreateTemplateInput {
  title: string;
  description?: string | null;
  type: TemplateType;
  category: TemplateCategory;
  content?: JSONContent;
  settings?: PageSettings;
  /** Org-scoped templates only — null = system/global template. */
  organizationId?: string | null;
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTemplateInput) =>
      fetchJson<{ template: NuswordTemplate }>("/api/templates", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.template),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export interface UpdateTemplateInput {
  title?: string;
  description?: string | null;
  type?: TemplateType;
  category?: TemplateCategory;
  content?: JSONContent;
  settings?: PageSettings;
  published?: boolean;
}

export function useUpdateTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTemplateInput) =>
      fetchJson<{ template: NuswordTemplate }>(`/api/templates/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((r) => r.template),
    onSuccess: (data) => {
      // Reflect server-canonical state in the single-template cache.
      qc.setQueryData(["template", id], data);
      // Mark the list (and any other template queries) as stale.
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetchJson<{ ok: boolean; id: string }>(`/api/templates/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

/**
 * Instantiate a template — POST /api/templates/[id]/use.
 * Returns the created document. Invalidates both documents (so the
 * dashboard shows the new doc) and templates (useCount bump).
 */
export function useUseTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (templateId: string) =>
      fetchJson<{ document: import("@/types/document").NuswordDocument }>(
        `/api/templates/${templateId}/use`,
        { method: "POST" },
      ).then((r) => r.document),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      qc.invalidateQueries({ queryKey: ["templates"] });
    },
  });
}

/* ================================================================== */
/* Usage stats                                                         */
/* ================================================================== */

export function useUsageStats() {
  return useQuery({
    queryKey: ["usage-stats"],
    queryFn: () => fetchJson<UsageStats>("/api/usage"),
  });
}
