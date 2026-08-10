"use client";

/**
 * OrganizationsView — full-page management UI for NUSWORD organizations
 * (Phase 7 SaaS).
 *
 * Surfaced when the user picks "Organizations" from the dashboard nav.
 *
 * Layout:
 *  - Header: title + count + "Create Organization" action
 *  - Grid of organization cards (name, slug, description, stats, role,
 *    Manage / Delete actions)
 *  - Create-organization dialog (name + description)
 *  - Manage-members dialog (member list + role change + remove + invite form)
 *
 * All data flows through the TanStack Query hooks in `@/hooks/use-saas`:
 *  - useOrganizations / useCreateOrganization / useDeleteOrganization
 *  - useOrgMembers / useInviteMember / useUpdateMember / useRemoveMember
 *
 * Roles are rendered via `ROLE_META` (icon + label + color) from
 * `@/types/saas`. Toasts (sonner) fire on every mutation success/error.
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { relativeTime } from "@/lib/nusword/time";
import {
  useOrganizations,
  useCreateOrganization,
  useDeleteOrganization,
  useOrgMembers,
  useInviteMember,
  useUpdateMember,
  useRemoveMember,
} from "@/hooks/use-saas";
import {
  ROLE_META,
  type NuswordOrganization,
  type NuswordOrgMember,
  type OrgRole,
} from "@/types/saas";

/** Roles that can be assigned when inviting a new member (owner excluded). */
const INVITE_ROLES: OrgRole[] = ["admin", "editor", "commenter", "viewer"];

/** Roles that an owner/admin can reassign an existing member to. */
const ALL_ROLES: OrgRole[] = ["owner", "admin", "editor", "commenter", "viewer"];

/* ------------------------------------------------------------------ */
/* Root view                                                           */
/* ------------------------------------------------------------------ */

export function OrganizationsView() {
  const { data: organizations = [], isLoading, isError } = useOrganizations();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [managedOrgId, setManagedOrgId] = React.useState<string | null>(null);

  const managedOrg = React.useMemo(
    () => organizations.find((o) => o.id === managedOrgId) ?? null,
    [organizations, managedOrgId],
  );

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-6xl px-margin-mobile py-8 md:px-margin-desktop md:py-12">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-headline-ui-lg text-on-surface">
              Organizations
            </h1>
            <p className="text-body-ui-md mt-1 text-on-surface-variant">
              Manage teams, members, and shared workspaces.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded bg-primary px-4 text-body-ui-md font-medium text-on-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-50"
          >
            <Icon name="add" size={18} />
            Create Organization
          </button>
        </header>

        {/* Body */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <OrganizationCardSkeleton key={i} />
            ))}
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest/50 px-6 py-12 text-center">
            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-error-container text-on-error-container">
              <Icon name="error" size={22} />
            </div>
            <p className="text-headline-ui-md text-on-surface">
              Couldn&apos;t load organizations
            </p>
            <p className="text-body-ui-md mt-1 max-w-sm text-on-surface-variant">
              Please try again in a moment.
            </p>
          </div>
        ) : organizations.length === 0 ? (
          <EmptyState onCreate={() => setCreateOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
            {organizations.map((org) => (
              <OrganizationCard
                key={org.id}
                org={org}
                onManage={() => setManagedOrgId(org.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <CreateOrganizationDialog open={createOpen} onOpenChange={setCreateOpen} />

      {/* Manage members dialog */}
      <ManageMembersDialog
        org={managedOrg}
        open={managedOrg !== null}
        onOpenChange={(o) => {
          if (!o) setManagedOrgId(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest/50 px-6 py-16 text-center">
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
        <Icon name="group" size={26} />
      </div>
      <p className="text-headline-ui-md text-on-surface">
        No organizations yet
      </p>
      <p className="text-body-ui-md mt-1 max-w-sm text-on-surface-variant">
        Create your first organization to start collaborating with your team
        on documents and books.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-6 inline-flex h-10 cursor-pointer items-center gap-2 rounded bg-primary px-4 text-body-ui-md font-medium text-on-primary transition-colors hover:bg-primary-container"
      >
        <Icon name="add" size={18} />
        Create Organization
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Organization card                                                   */
/* ------------------------------------------------------------------ */

function OrganizationCard({
  org,
  onManage,
}: {
  org: NuswordOrganization;
  onManage: () => void;
}) {
  const deleteMutation = useDeleteOrganization();
  const [confirming, setConfirming] = React.useState(false);
  const roleMeta = ROLE_META[org.myRole];
  const canDelete = org.myRole === "owner";

  const handleDelete = () => {
    deleteMutation.mutate(org.id, {
      onSuccess: () => {
        toast.success(`"${org.name}" deleted`);
        setConfirming(false);
      },
      onError: (err) => {
        toast.error(err instanceof Error ? err.message : "Failed to delete organization");
      },
    });
  };

  return (
    <article className="group flex flex-col rounded-lg border border-outline-variant bg-surface p-5 transition-all hover:border-outline">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded bg-primary-container text-on-primary-container">
            <Icon name={roleMeta.icon} size={22} />
          </div>
          <div className="min-w-0">
            <h3 className="text-headline-ui-md truncate text-on-surface">
              {org.name}
            </h3>
            <span className="text-mono-ui text-outline">
              {org.slug}
            </span>
          </div>
        </div>
        <RoleBadge role={org.myRole} />
      </div>

      {/* Description */}
      <p className="text-body-ui-md mt-3 line-clamp-2 min-h-[2.5rem] text-on-surface-variant">
        {org.description || "No description provided."}
      </p>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <StatChip icon="group" label="Members" value={org.memberCount} />
        <StatChip icon="description" label="Docs" value={org.documentCount} />
        <StatChip icon="menu_book" label="Books" value={org.bookCount} />
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between gap-2 border-t border-outline-variant/50 pt-4">
        <span className="text-label-ui-sm text-outline">
          Created {relativeTime(org.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          {canDelete && !confirming ? (
            <button
              type="button"
              aria-label={`Delete ${org.name}`}
              onClick={() => setConfirming(true)}
              className="flex size-9 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-on-error-container"
            >
              <Icon name="delete" size={18} />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onManage}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded border border-outline-variant px-3 text-body-ui-md font-medium text-on-surface transition-colors hover:bg-surface-container-low"
          >
            <Icon name="manage_accounts" size={16} />
            Manage
          </button>
        </div>
      </div>

      {/* Confirm-delete inline panel */}
      {confirming && (
        <div className="mt-3 rounded border border-error-container/60 bg-error-container/20 p-3">
          <p className="text-body-ui-md text-on-surface">
            Delete <span className="font-semibold">{org.name}</span>? This
            cannot be undone.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleteMutation.isPending}
              className="cursor-pointer rounded px-3 py-1.5 text-body-ui-md text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded bg-destructive px-3 text-body-ui-md font-medium text-white transition-colors hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-50"
            >
              <Icon
                name={deleteMutation.isPending ? "progress_activity" : "delete"}
                size={16}
                className={deleteMutation.isPending ? "animate-spin" : ""}
              />
              Delete
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded bg-surface-container-low px-3 py-2">
      <div className="flex items-center gap-1.5 text-on-surface-variant">
        <Icon name={icon} size={14} />
        <span className="text-label-ui-sm uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="text-headline-ui-md text-on-surface">
        {value.toLocaleString()}
      </span>
    </div>
  );
}

function OrganizationCardSkeleton() {
  return (
    <div className="flex flex-col rounded-lg border border-outline-variant/40 bg-surface p-5">
      <div className="flex items-center gap-3">
        <div className="size-10 animate-pulse rounded bg-surface-container" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-surface-container" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-surface-container" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-surface-container-low" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-surface-container-low" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded bg-surface-container-low"
          />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create-organization dialog                                          */
/* ------------------------------------------------------------------ */

function CreateOrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateOrganization();
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");

  // Reset on close.
  React.useEffect(() => {
    if (!open) {
      // Defer reset so the closing animation doesn't show empty fields.
      const t = setTimeout(() => {
        setName("");
        setDescription("");
      }, 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  const nameTrim = name.trim();
  const canSubmit = nameTrim.length > 0 && !createMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    createMutation.mutate(
      {
        name: nameTrim,
        description: description.trim() || undefined,
      },
      {
        onSuccess: (org) => {
          toast.success(`Organization "${org.name}" created`);
          onOpenChange(false);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error
              ? err.message
              : "Failed to create organization",
          );
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-surface p-0">
        <DialogHeader className="border-b border-outline-variant p-4">
          <DialogTitle className="text-headline-ui-md text-on-surface">
            Create Organization
          </DialogTitle>
          <DialogDescription className="text-body-ui-md text-on-surface-variant">
            Organizations group members, documents, and books for a team or
            project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label
              htmlFor="org-name"
              className="text-label-ui-sm block uppercase tracking-wider text-on-surface-variant"
            >
              Name <span className="text-destructive">*</span>
            </label>
            <input
              id="org-name"
              type="text"
              required
              autoFocus
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Andalus Press"
              className="h-10 w-full rounded border border-outline-variant bg-surface-container-lowest px-3 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="org-description"
              className="text-label-ui-sm block uppercase tracking-wider text-on-surface-variant"
            >
              Description
            </label>
            <textarea
              id="org-description"
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this organization for?"
              className="w-full resize-none rounded border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
          </div>
        </form>

        <DialogFooter className="border-t border-outline-variant p-4 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={createMutation.isPending}
            className="cursor-pointer rounded border border-outline-variant px-4 py-1.5 text-body-ui-md text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded bg-primary px-4 text-body-ui-md font-medium text-on-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-50"
          >
            <Icon
              name={createMutation.isPending ? "progress_activity" : "add"}
              size={16}
              className={createMutation.isPending ? "animate-spin" : ""}
            />
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Manage-members dialog                                               */
/* ------------------------------------------------------------------ */

function ManageMembersDialog({
  org,
  open,
  onOpenChange,
}: {
  org: NuswordOrganization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Keep a local copy of the org so the dialog content stays mounted during
  // the close transition (the parent clears `managedOrgId` immediately on
  // `onOpenChange(false)`, which would otherwise blank the dialog before the
  // exit animation finishes).
  const [stagedOrg, setStagedOrg] = React.useState<NuswordOrganization | null>(
    org,
  );
  React.useEffect(() => {
    if (open && org) setStagedOrg(org);
  }, [open, org]);

  const activeOrg = stagedOrg ?? org;
  // Hooks must be called unconditionally — pass null when there's no org so
  // the inner query disables itself.
  const orgId = activeOrg?.id ?? "";
  const { data: members = [], isLoading } = useOrgMembers(
    open ? orgId : null,
  );

  if (!activeOrg) {
    // Render an invisible dialog host so transitions still work.
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }

  const canManage =
    activeOrg.myRole === "owner" || activeOrg.myRole === "admin";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface p-0">
        <DialogHeader className="border-b border-outline-variant p-4">
          <DialogTitle className="text-headline-ui-md flex items-center gap-2 text-on-surface">
            <Icon name="group" size={20} className="text-primary" />
            {activeOrg.name}
          </DialogTitle>
          <DialogDescription className="text-body-ui-md text-on-surface-variant">
            Invite teammates and manage their roles.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-6 overflow-y-auto p-4">
          {/* Invite form */}
          <InviteMemberForm orgId={orgId} canManage={canManage} />

          {/* Members list */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
                Members
                {members.length > 0 && (
                  <span className="ml-2 text-outline">{members.length}</span>
                )}
              </h4>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded bg-surface-container-low"
                  />
                ))}
              </div>
            ) : members.length === 0 ? (
              <p className="text-body-ui-md rounded border border-dashed border-outline-variant/50 px-4 py-6 text-center text-on-surface-variant">
                No members found.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {members.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    orgId={orgId}
                    canManage={canManage}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-outline-variant p-4 sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded border border-outline-variant px-4 py-1.5 text-body-ui-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Invite form                                                         */
/* ------------------------------------------------------------------ */

function InviteMemberForm({
  orgId,
  canManage,
}: {
  orgId: string;
  canManage: boolean;
}) {
  const inviteMutation = useInviteMember(orgId);
  const [email, setEmail] = React.useState("");
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState<OrgRole>("editor");

  const emailTrim = email.trim();
  const canSubmit =
    canManage &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim) &&
    !inviteMutation.isPending;

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    inviteMutation.mutate(
      {
        email: emailTrim,
        name: name.trim() || undefined,
        role,
      },
      {
        onSuccess: (m) => {
          toast.success(`Invited ${m.email} as ${ROLE_META[m.role].label}`);
          setEmail("");
          setName("");
          setRole("editor");
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to invite member",
          );
        },
      },
    );
  };

  return (
    <form
      onSubmit={handleInvite}
      className="rounded-lg border border-outline-variant bg-surface-container-lowest p-3"
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon name="person_add" size={18} className="text-primary" />
        <span className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
          Invite Member
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={!canManage || inviteMutation.isPending}
          className="h-9 w-full rounded border border-outline-variant bg-surface px-3 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          disabled={!canManage || inviteMutation.isPending}
          className="h-9 w-full rounded border border-outline-variant bg-surface px-3 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <label
            htmlFor={`invite-role-${orgId}`}
            className="text-label-ui-sm text-on-surface-variant"
          >
            Role
          </label>
          <Select
            value={role}
            onValueChange={(v) => setRole(v as OrgRole)}
            disabled={!canManage || inviteMutation.isPending}
          >
            <SelectTrigger
              id={`invite-role-${orgId}`}
              className="h-9 w-40 border-outline-variant bg-surface text-body-ui-md text-on-surface"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface">
              {INVITE_ROLES.map((r) => {
                const meta = ROLE_META[r];
                return (
                  <SelectItem key={r} value={r}>
                    <span className="flex items-center gap-2">
                      <Icon name={meta.icon} size={14} className={meta.color} />
                      {meta.label}
                    </span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded bg-primary px-4 text-body-ui-md font-medium text-on-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-50"
        >
          <Icon
            name={inviteMutation.isPending ? "progress_activity" : "send"}
            size={16}
            className={inviteMutation.isPending ? "animate-spin" : ""}
          />
          {inviteMutation.isPending ? "Inviting…" : "Send Invite"}
        </button>
      </div>

      {!canManage && (
        <p className="text-label-ui-sm mt-2 flex items-center gap-1 text-on-surface-variant">
          <Icon name="lock" size={12} />
          Only owners and admins can invite members.
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Member row                                                          */
/* ------------------------------------------------------------------ */

function MemberRow({
  member,
  orgId,
  canManage,
}: {
  member: NuswordOrgMember;
  orgId: string;
  canManage: boolean;
}) {
  const updateMutation = useUpdateMember(orgId);
  const removeMutation = useRemoveMember(orgId);
  const [confirmingRemove, setConfirmingRemove] = React.useState(false);
  const roleMeta = ROLE_META[member.role];
  const isOwner = member.role === "owner";
  // Owners can't be removed or have their role changed.
  const immutable = isOwner;
  const canChangeRole = canManage && !immutable;

  const handleRoleChange = (next: OrgRole) => {
    if (next === member.role) return;
    updateMutation.mutate(
      { memberId: member.id, role: next },
      {
        onSuccess: () => {
          toast.success(`${member.email} is now ${ROLE_META[next].label}`);
        },
        onError: (err) => {
          toast.error(
            err instanceof Error ? err.message : "Failed to update role",
          );
        },
      },
    );
  };

  const handleRemove = () => {
    removeMutation.mutate(member.id, {
      onSuccess: () => {
        toast.success(`${member.email} removed`);
        setConfirmingRemove(false);
      },
      onError: (err) => {
        toast.error(
          err instanceof Error ? err.message : "Failed to remove member",
        );
      },
    });
  };

  const displayName = member.name?.trim() || member.email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <li className="flex items-center gap-3 rounded-lg border border-outline-variant/60 bg-surface px-3 py-2.5 transition-colors hover:border-outline-variant">
      {/* Avatar */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-body-ui-md font-semibold",
          isOwner
            ? "bg-primary text-on-primary"
            : "bg-primary-container text-on-primary-container",
        )}
        aria-hidden="true"
      >
        {initial}
      </div>

      {/* Name + email */}
      <div className="min-w-0 flex-1">
        <div className="text-body-ui-md truncate font-medium text-on-surface">
          {member.name || displayName}
        </div>
        <div className="text-label-ui-sm truncate text-on-surface-variant">
          {member.email}
        </div>
      </div>

      {/* Role select / badge */}
      {canChangeRole ? (
        <Select
          value={member.role}
          onValueChange={(v) => handleRoleChange(v as OrgRole)}
          disabled={updateMutation.isPending}
        >
          <SelectTrigger
            className="h-8 w-32 border-outline-variant/60 bg-surface-container-low text-label-ui-sm"
            aria-label={`Change role for ${member.email}`}
          >
            <span className="flex items-center gap-1.5">
              <Icon
                name={roleMeta.icon}
                size={14}
                className={roleMeta.color}
              />
              <SelectValue />
            </span>
          </SelectTrigger>
          <SelectContent className="bg-surface">
            {ALL_ROLES.map((r) => {
              const meta = ROLE_META[r];
              return (
                <SelectItem key={r} value={r}>
                  <span className="flex items-center gap-2">
                    <Icon name={meta.icon} size={14} className={meta.color} />
                    {meta.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      ) : (
        <RoleBadge role={member.role} />
      )}

      {/* Remove */}
      {canManage && !immutable ? (
        confirmingRemove ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleRemove}
              disabled={removeMutation.isPending}
              aria-label={`Confirm remove ${member.email}`}
              className="flex size-8 cursor-pointer items-center justify-center rounded bg-destructive text-white transition-colors hover:bg-destructive/90 disabled:cursor-wait disabled:opacity-50"
            >
              <Icon
                name={removeMutation.isPending ? "progress_activity" : "check"}
                size={16}
                className={removeMutation.isPending ? "animate-spin" : ""}
              />
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRemove(false)}
              disabled={removeMutation.isPending}
              aria-label="Cancel remove"
              className="flex size-8 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingRemove(true)}
            aria-label={`Remove ${member.email}`}
            className="flex size-8 cursor-pointer items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-error-container/40 hover:text-on-error-container"
          >
            <Icon name="person_remove" size={18} />
          </button>
        )
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Role badge                                                          */
/* ------------------------------------------------------------------ */

function RoleBadge({ role }: { role: OrgRole }) {
  const meta = ROLE_META[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-outline-variant/60 bg-surface-container-low px-2 py-0.5 text-label-ui-sm",
        meta.color,
      )}
    >
      <Icon name={meta.icon} size={12} />
      {meta.label}
    </span>
  );
}
