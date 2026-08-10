"use client";

/**
 * ShareDialog — share a NUSWORD document with collaborators.
 *
 * Lists existing shares (email + role + revoke button), exposes an invite
 * form (email + role select), and toasts the result of every mutation.
 *
 * Hooks: `useDocumentShares`, `useShareDocument`, `useRevokeShare` from
 * `@/hooks/use-saas` (Phase 7 SaaS layer). Roles are restricted to the
 * ShareRole subset (`editor` | `commenter` | `viewer`) and rendered via
 * `SHARE_ROLE_META` so each option carries an icon + description.
 *
 * PRD §19 (RBAC): share roles exclude owner/admin — collaborators get at
 * most edit access via this dialog.
 */
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  useDocumentShares,
  useShareDocument,
  useRevokeShare,
} from "@/hooks/use-saas";
import {
  SHARE_ROLE_META,
  type ShareRole,
} from "@/types/saas";
import { relativeTime } from "@/lib/nusword/time";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
}

/** All share roles in stable display order. */
const SHARE_ROLES: ShareRole[] = ["editor", "commenter", "viewer"];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ShareDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
}: ShareDialogProps) {
  const { data: shares = [], isLoading } = useDocumentShares(
    open ? documentId : null,
  );
  const shareMutation = useShareDocument(documentId);
  const revokeMutation = useRevokeShare(documentId);

  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<ShareRole>("viewer");
  const [emailTouched, setEmailTouched] = React.useState(false);

  // Reset the form whenever the dialog is closed.
  React.useEffect(() => {
    if (!open) {
      setEmail("");
      setRole("viewer");
      setEmailTouched(false);
    }
  }, [open]);

  const emailValid = EMAIL_RE.test(email.trim());
  const showEmailError = emailTouched && email.length > 0 && !emailValid;
  const canSubmit =
    emailValid && !shareMutation.isPending && email.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid) {
      setEmailTouched(true);
      return;
    }
    shareMutation.mutate(
      { email: email.trim(), role },
      {
        onSuccess: (share) => {
          toast.success(`Shared with ${share.sharedWithEmail}`, {
            description: `Role: ${SHARE_ROLE_META[share.role].label}`,
          });
          setEmail("");
          setRole("viewer");
          setEmailTouched(false);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to share";
          // 400/409 from the API arrive as "400: {\"error\":\"...\"}".
          const cleaned = msg.replace(/^\d{3}:\s*/, "").trim();
          try {
            const parsed = JSON.parse(cleaned);
            toast.error(parsed.error ?? "Failed to share");
          } catch {
            toast.error(cleaned || "Failed to share");
          }
        },
      },
    );
  };

  const handleRevoke = (shareId: string, email: string) => {
    revokeMutation.mutate(shareId, {
      onSuccess: () => {
        toast.success(`Revoked access for ${email}`);
      },
      onError: () => {
        toast.error("Failed to revoke access");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-surface p-0">
        <DialogHeader className="border-b border-outline-variant p-4">
          <DialogTitle className="text-headline-ui-md flex items-center gap-2 text-on-surface">
            <Icon name="share" size={20} className="text-primary" />
            Share document
          </DialogTitle>
          <DialogDescription className="text-body-ui-md text-on-surface-variant">
            <span className="text-on-surface">{documentTitle}</span>
            <span className="mx-1.5 text-outline">·</span>
            Invite collaborators by email. They will appear in the list below.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-4">
          {/* Invite form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-outline-variant bg-surface-container-low p-3"
          >
            <label className="text-label-ui-sm mb-2 block uppercase tracking-wider text-on-surface-variant">
              Invite collaborator
            </label>

            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Icon
                  name="mail"
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  type="email"
                  inputMode="email"
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  className={cn(
                    "h-9 w-full rounded border bg-surface pl-10 pr-3 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/70 focus:outline-none",
                    showEmailError
                      ? "border-error focus:border-error"
                      : "border-outline-variant focus:border-primary",
                  )}
                />
              </div>

              <Select
                value={role}
                onValueChange={(v) => setRole(v as ShareRole)}
              >
                <SelectTrigger className="h-9 w-full rounded border-outline-variant bg-surface px-3 text-body-ui-md text-on-surface sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface">
                  {SHARE_ROLES.map((r) => {
                    const meta = SHARE_ROLE_META[r];
                    return (
                      <SelectItem
                        key={r}
                        value={r}
                        className="rounded text-body-ui-md text-on-surface"
                      >
                        <span className="flex items-center gap-2">
                          <Icon
                            name={meta.icon}
                            size={16}
                            className="text-on-surface-variant"
                          />
                          {meta.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <button
                type="submit"
                disabled={!canSubmit}
                className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded bg-primary px-4 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon
                  name={shareMutation.isPending ? "progress_activity" : "send"}
                  size={16}
                  className={shareMutation.isPending ? "animate-spin" : ""}
                />
                {shareMutation.isPending ? "Sharing…" : "Share"}
              </button>
            </div>

            {/* Selected role description */}
            <p className="text-label-ui-sm mt-2 flex items-center gap-1.5 text-on-surface-variant">
              <Icon name={SHARE_ROLE_META[role].icon} size={14} />
              <span className="font-medium text-on-surface">
                {SHARE_ROLE_META[role].label}:
              </span>
              <span>{SHARE_ROLE_META[role].description}</span>
            </p>

            {showEmailError && (
              <p className="text-label-ui-sm mt-2 flex items-center gap-1 text-error">
                <Icon name="error" size={14} />
                Enter a valid email address.
              </p>
            )}
          </form>

          {/* Role legend */}
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            {SHARE_ROLES.map((r) => {
              const meta = SHARE_ROLE_META[r];
              return (
                <div
                  key={r}
                  className="flex items-start gap-2 rounded border border-outline-variant bg-surface px-2.5 py-2"
                >
                  <Icon
                    name={meta.icon}
                    size={18}
                    className="mt-0.5 text-on-surface-variant"
                  />
                  <div className="min-w-0">
                    <p className="text-label-ui-sm font-medium text-on-surface">
                      {meta.label}
                    </p>
                    <p className="text-label-ui-sm text-on-surface-variant">
                      {meta.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Current shares */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
                People with access
              </span>
              {shares.length > 0 && (
                <span className="text-label-ui-sm text-outline">
                  {shares.length}{" "}
                  {shares.length === 1 ? "person" : "people"}
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="space-y-1.5">
                {[0, 1].map((i) => (
                  <div
                    key={i}
                    className="h-14 animate-pulse rounded border border-outline-variant/40 bg-surface-container-low"
                  />
                ))}
              </div>
            ) : shares.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest/50 px-6 py-8 text-center">
                <div className="mb-2 flex size-9 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
                  <Icon name="group_off" size={20} />
                </div>
                <p className="text-body-ui-md font-medium text-on-surface">
                  No collaborators yet
                </p>
                <p className="text-label-ui-sm mt-0.5 text-on-surface-variant">
                  Invite someone above to start sharing this document.
                </p>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {shares.map((share) => {
                  const meta = SHARE_ROLE_META[share.role];
                  return (
                    <li
                      key={share.id}
                      className="flex items-center justify-between rounded border border-outline-variant bg-surface px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                          <Icon name="person" size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-ui-md truncate font-medium text-on-surface">
                            {share.sharedWithEmail}
                          </p>
                          <p className="text-label-ui-sm flex items-center gap-1 text-on-surface-variant">
                            <Icon name={meta.icon} size={12} />
                            {meta.label}
                            <span className="text-outline">·</span>
                            <span title={new Date(share.createdAt).toISOString()}>
                              {relativeTime(share.createdAt)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleRevoke(share.id, share.sharedWithEmail)
                        }
                        disabled={revokeMutation.isPending}
                        aria-label={`Revoke access for ${share.sharedWithEmail}`}
                        className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-label-ui-sm text-error transition-colors hover:bg-error-container/30 disabled:cursor-wait disabled:opacity-50"
                      >
                        <Icon
                          name={
                            revokeMutation.isPending &&
                            revokeMutation.variables === share.id
                              ? "progress_activity"
                              : "person_remove"
                          }
                          size={14}
                          className={
                            revokeMutation.isPending &&
                            revokeMutation.variables === share.id
                              ? "animate-spin"
                              : ""
                          }
                        />
                        Revoke
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-outline-variant px-4 py-3">
          <span className="text-label-ui-sm flex items-center gap-1 text-outline">
            <Icon name="link" size={14} />
            Shared links inherit the document's permissions.
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded border border-outline-variant px-4 py-1.5 text-body-ui-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
          >
            Done
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
