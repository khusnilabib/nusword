"use client";

/**
 * TemplatesGallery — browse and instantiate NUSWORD templates.
 *
 * Surfaced when the user clicks "Templates" in the dashboard sidebar.
 * Provides:
 *  - Category filter tabs (All + the 5 TEMPLATE_CATEGORIES values).
 *  - Responsive grid of template cards showing title / description /
 *    type badge / category badge / use count and a "Use Template" button.
 *  - Loading skeletons + empty states.
 *  - A "Create Template" action that opens a dialog with a simple form
 *    (title, description, category, type) — uses `useCreateTemplate`.
 *
 * Hooks: `useTemplates(category?)`, `useUseTemplate()`, `useCreateTemplate()`
 * from `@/hooks/use-saas` (Phase 7 SaaS layer).
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
import {
  useTemplates,
  useUseTemplate,
  useCreateTemplate,
} from "@/hooks/use-saas";
import {
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type TemplateType,
  type NuswordTemplate,
} from "@/types/saas";

interface TemplatesGalleryProps {
  /**
   * Called with the newly-created document ID after a successful
   * `useUseTemplate` mutation. The dashboard wires this to its
   * `openDocument(id, title)` action.
   */
  onUseDocument: (documentId: string, documentTitle: string) => void;
}

type CategoryFilter = TemplateCategory | "all";

/** Tabs surfaced above the grid. "All" + one per TEMPLATE_CATEGORIES entry. */
const CATEGORY_TABS: Array<{
  key: CategoryFilter;
  label: string;
  icon: string;
}> = [
  { key: "all", label: "All", icon: "apps" },
  ...TEMPLATE_CATEGORIES.map((c) => ({
    key: c.key as CategoryFilter,
    label: c.label,
    icon: c.icon,
  })),
];

const TYPE_META: Record<TemplateType, { label: string; icon: string }> = {
  document: { label: "Document", icon: "description" },
  book: { label: "Book", icon: "menu_book" },
};

const TEMPLATE_TYPES: TemplateType[] = ["document", "book"];

/** Map a category → its TEMPLATE_CATEGORIES entry (for icon/label). */
function categoryMeta(key: TemplateCategory) {
  return (
    TEMPLATE_CATEGORIES.find((c) => c.key === key) ?? TEMPLATE_CATEGORIES[0]
  );
}

export function TemplatesGallery({ onUseDocument }: TemplatesGalleryProps) {
  const [category, setCategory] = React.useState<CategoryFilter>("all");
  const [createOpen, setCreateOpen] = React.useState(false);

  const templatesQuery = useTemplates(
    category === "all" ? null : (category as TemplateCategory),
  );
  const templates = templatesQuery.data ?? [];
  const useMutation = useUseTemplate();

  const handleUse = (template: NuswordTemplate) => {
    useMutation.mutate(template.id, {
      onSuccess: (doc) => {
        toast.success(`Created "${doc.title}" from template`, {
          description: `Based on "${template.title}"`,
        });
        onUseDocument(doc.id, doc.title);
      },
      onError: () => {
        toast.error("Failed to create document from template");
      },
    });
  };

  return (
    <section className="flex flex-col gap-6">
      {/* Heading row */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-headline-ui-lg text-on-surface">Templates</h1>
          <p className="text-body-ui-md mt-1 text-on-surface-variant">
            Start fast from a pre-built structure. Pick a category, then use
            a template to create a new document.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 cursor-pointer items-center gap-2 self-start rounded bg-primary px-4 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container"
        >
          <Icon name="add" size={18} />
          Create Template
        </button>
      </div>

      {/* Category tabs */}
      <div
        role="tablist"
        aria-label="Filter templates by category"
        className="flex flex-wrap gap-1.5 border-b border-outline-variant pb-px"
      >
        {CATEGORY_TABS.map((tab) => {
          const active = category === tab.key;
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              type="button"
              onClick={() => setCategory(tab.key)}
              className={cn(
                "flex cursor-pointer items-center gap-1.5 rounded-t border-b-2 px-3 py-2 text-label-ui-sm uppercase tracking-wider transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface",
              )}
            >
              <Icon name={tab.icon} size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {templatesQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <TemplateCardSkeleton key={i} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          category={category}
          onCreate={() => setCreateOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onUse={() => handleUse(tpl)}
              isUsing={
                useMutation.isPending && useMutation.variables === tpl.id
              }
            />
          ))}
        </div>
      )}

      {/* Create-template dialog */}
      <CreateTemplateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Template card                                                       */
/* ------------------------------------------------------------------ */

function TemplateCard({
  template,
  onUse,
  isUsing,
}: {
  template: NuswordTemplate;
  onUse: () => void;
  isUsing: boolean;
}) {
  const typeMeta = TYPE_META[template.type];
  const catMeta = categoryMeta(template.category);

  return (
    <article className="group flex h-64 flex-col overflow-hidden rounded-lg border border-outline-variant bg-surface transition-all hover:border-outline hover:shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      {/* Thumbnail */}
      <div className="relative flex h-32 items-center justify-center overflow-hidden border-b border-outline-variant/50 bg-surface-container-low p-4">
        <Icon
          name={typeMeta.icon}
          size={44}
          className="text-primary/40 transition-colors group-hover:text-primary/70"
        />

        {/* Type badge (top-left) */}
        <span className="text-label-ui-sm absolute left-2 top-2 flex items-center gap-1 rounded bg-surface-container-highest/85 px-1.5 py-0.5 text-on-surface-variant backdrop-blur-sm">
          <Icon name={typeMeta.icon} size={12} />
          {typeMeta.label}
        </span>

        {/* Category badge (top-right) */}
        <span className="text-label-ui-sm absolute right-2 top-2 flex items-center gap-1 rounded bg-primary-fixed/80 px-1.5 py-0.5 text-on-primary-fixed backdrop-blur-sm">
          <Icon name={catMeta.icon} size={12} />
          {catMeta.label}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-headline-ui-md truncate text-on-surface">
          {template.title}
        </h3>
        <p className="text-label-ui-sm mt-1 line-clamp-2 text-on-surface-variant">
          {template.description || "No description provided."}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-label-ui-sm flex items-center gap-1 text-on-surface-variant">
            <Icon name="trending_up" size={14} />
            {template.useCount.toLocaleString("id-ID")}{" "}
            {template.useCount === 1 ? "use" : "uses"}
          </span>
          <button
            type="button"
            onClick={onUse}
            disabled={isUsing}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded bg-primary px-3 text-label-ui-sm font-medium text-on-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-50"
          >
            <Icon
              name={isUsing ? "progress_activity" : "add"}
              size={14}
              className={isUsing ? "animate-spin" : ""}
            />
            {isUsing ? "Creating…" : "Use Template"}
          </button>
        </div>
      </div>
    </article>
  );
}

function TemplateCardSkeleton() {
  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-lg border border-outline-variant/40 bg-surface">
      <div className="h-32 animate-pulse bg-surface-container-low" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-container" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-container" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-surface-container" />
        <div className="mt-auto h-8 w-28 animate-pulse rounded bg-surface-container-high" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({
  category,
  onCreate,
}: {
  category: CategoryFilter;
  onCreate: () => void;
}) {
  const isFiltered = category !== "all";
  const meta =
    category === "all"
      ? null
      : TEMPLATE_CATEGORIES.find((c) => c.key === category);

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-outline-variant/60 bg-surface-container-lowest/50 px-6 py-16 text-center">
      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-surface-container text-on-surface-variant">
        <Icon name={isFiltered ? meta?.icon ?? "search_off" : "dashboard_customize"} size={26} />
      </div>
      <p className="text-headline-ui-md text-on-surface">
        {isFiltered
          ? `No ${meta?.label.toLowerCase()} templates yet`
          : "No templates yet"}
      </p>
      <p className="text-body-ui-md mt-1 max-w-sm text-on-surface-variant">
        {isFiltered
          ? `There are no published templates in the ${meta?.label} category. Try another category or create your own.`
          : "Be the first to publish a reusable template for the workspace."}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded border border-primary px-4 text-body-ui-md text-primary transition-colors hover:bg-surface-container-low"
      >
        <Icon name="add" size={18} />
        Create Template
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Create Template dialog                                              */
/* ------------------------------------------------------------------ */

function CreateTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createMutation = useCreateTemplate();

  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState<TemplateCategory>("academic");
  const [type, setType] = React.useState<TemplateType>("document");
  const [touched, setTouched] = React.useState(false);

  // Reset state on close.
  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setCategory("academic");
      setType("document");
      setTouched(false);
    }
  }, [open]);

  const titleValid = title.trim().length >= 1 && title.trim().length <= 200;
  const showTitleError = touched && !titleValid;
  const canSubmit = titleValid && !createMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleValid) {
      setTouched(true);
      return;
    }
    createMutation.mutate(
      {
        title: title.trim(),
        description: description.trim() || null,
        type,
        category,
      },
      {
        onSuccess: (tpl) => {
          toast.success(`Template "${tpl.title}" created`, {
            description: "It will appear in the gallery once published.",
          });
          onOpenChange(false);
        },
        onError: (err) => {
          const msg = err instanceof Error ? err.message : "Failed to create";
          const cleaned = msg.replace(/^\d{3}:\s*/, "").trim();
          try {
            const parsed = JSON.parse(cleaned);
            toast.error(parsed.error ?? "Failed to create template");
          } catch {
            toast.error(cleaned || "Failed to create template");
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-surface p-0">
        <DialogHeader className="border-b border-outline-variant p-4">
          <DialogTitle className="text-headline-ui-md flex items-center gap-2 text-on-surface">
            <Icon name="dashboard_customize" size={20} className="text-primary" />
            Create Template
          </DialogTitle>
          <DialogDescription className="text-body-ui-md text-on-surface-variant">
            Define a reusable structure. Templates are unpublished by default —
            publish from the template's detail page when ready.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
          {/* Title */}
          <div>
            <label
              htmlFor="tpl-title"
              className="text-label-ui-sm mb-1.5 block uppercase tracking-wider text-on-surface-variant"
            >
              Title <span className="text-error">*</span>
            </label>
            <input
              id="tpl-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              maxLength={200}
              placeholder="e.g. Academic Paper — IMRaD"
              className={cn(
                "h-9 w-full rounded border bg-surface px-3 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/70 focus:outline-none",
                showTitleError
                  ? "border-error focus:border-error"
                  : "border-outline-variant focus:border-primary",
              )}
            />
            {showTitleError && (
              <p className="text-label-ui-sm mt-1 flex items-center gap-1 text-error">
                <Icon name="error" size={14} />
                Title is required (max 200 characters).
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="tpl-description"
              className="text-label-ui-sm mb-1.5 block uppercase tracking-wider text-on-surface-variant"
            >
              Description
            </label>
            <textarea
              id="tpl-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short summary of what this template is for."
              className="w-full rounded border border-outline-variant bg-surface px-3 py-2 text-body-ui-md text-on-surface transition-colors placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Type + Category */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-label-ui-sm mb-1.5 block uppercase tracking-wider text-on-surface-variant">
                Type
              </label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as TemplateType)}
              >
                <SelectTrigger className="h-9 w-full rounded border-outline-variant bg-surface px-3 text-body-ui-md text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface">
                  {TEMPLATE_TYPES.map((t) => {
                    const m = TYPE_META[t];
                    return (
                      <SelectItem
                        key={t}
                        value={t}
                        className="rounded text-body-ui-md text-on-surface"
                      >
                        <span className="flex items-center gap-2">
                          <Icon name={m.icon} size={16} className="text-on-surface-variant" />
                          {m.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-label-ui-sm mb-1.5 block uppercase tracking-wider text-on-surface-variant">
                Category
              </label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as TemplateCategory)}
              >
                <SelectTrigger className="h-9 w-full rounded border-outline-variant bg-surface px-3 text-body-ui-md text-on-surface">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface">
                  {TEMPLATE_CATEGORIES.map((c) => (
                    <SelectItem
                      key={c.key}
                      value={c.key}
                      className="rounded text-body-ui-md text-on-surface"
                    >
                      <span className="flex items-center gap-2">
                        <Icon name={c.icon} size={16} className="text-on-surface-variant" />
                        {c.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Selected category description */}
          <div className="rounded border border-outline-variant bg-surface-container-low px-3 py-2">
            <p className="text-label-ui-sm flex items-start gap-1.5 text-on-surface-variant">
              <Icon
                name={categoryMeta(category).icon}
                size={14}
                className="mt-0.5 text-on-surface-variant"
              />
              <span>{categoryMeta(category).description}</span>
            </p>
          </div>
        </form>

        <DialogFooter className="border-t border-outline-variant p-4 sm:justify-between">
          <span className="text-label-ui-sm text-outline">
            Templates start unpublished.
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer rounded border border-outline-variant px-4 py-1.5 text-body-ui-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex cursor-pointer items-center gap-2 rounded bg-primary px-4 py-1.5 text-body-ui-md text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon
                name={createMutation.isPending ? "progress_activity" : "save"}
                size={16}
                className={createMutation.isPending ? "animate-spin" : ""}
              />
              {createMutation.isPending ? "Creating…" : "Create Template"}
            </button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
