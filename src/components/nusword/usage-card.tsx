"use client";

/**
 * UsageCard — compact usage-stats card for the NUSWORD dashboard.
 *
 * Surfaces the four headline success metrics (documents, books, exports,
 * templates) and the last 5 recent activity events. Designed to sit in the
 * dashboard sidebar or directly below the greeting.
 *
 * Data: `useUsageStats()` from `@/hooks/use-saas` (cached under the
 * `["usage-stats"]` TanStack Query key).
 *
 * Layout:
 *  - Header: title + "Last 7 days" sub-label
 *  - 2×2 stat grid (icon + count + label)
 *  - Recent activity list (icon + label + relative time, max 5 items)
 *  - Skeleton while loading; muted empty-state when there are no events
 */
import * as React from "react";
import { Icon } from "./icon";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/nusword/time";
import { useUsageStats } from "@/hooks/use-saas";
import type { UsageStats } from "@/types/saas";

/* ------------------------------------------------------------------ */
/* Stat tile definitions                                               */
/* ------------------------------------------------------------------ */

interface StatDef {
  key: keyof Pick<
    UsageStats,
    "documentsCreated" | "booksCreated" | "exportsRun" | "templatesUsed"
  >;
  label: string;
  icon: string;
}

const STATS: StatDef[] = [
  { key: "documentsCreated", label: "Documents", icon: "description" },
  { key: "booksCreated", label: "Books", icon: "menu_book" },
  { key: "exportsRun", label: "Exports", icon: "file_export" },
  { key: "templatesUsed", label: "Templates", icon: "dashboard_customize" },
];

/* ------------------------------------------------------------------ */
/* Recent event metadata                                               */
/* ------------------------------------------------------------------ */

interface EventMeta {
  label: string;
  icon: string;
}

const EVENT_META: Record<string, EventMeta> = {
  "organization.create": { label: "Created organization", icon: "corporate_fare" },
  "organization.member.invite": { label: "Invited member", icon: "person_add" },
  "document.share": { label: "Shared document", icon: "share" },
  "template.create": { label: "Created template", icon: "dashboard_customize" },
  "template.use": { label: "Used template", icon: "add_circle" },
};

const DEFAULT_EVENT_META: EventMeta = { label: "Activity", icon: "history" };

function getEventMeta(type: string): EventMeta {
  return EVENT_META[type] ?? DEFAULT_EVENT_META;
}

/* ------------------------------------------------------------------ */
/* Root component                                                      */
/* ------------------------------------------------------------------ */

export function UsageCard({ className }: { className?: string }) {
  const { data, isLoading, isError } = useUsageStats();

  if (isError) {
    return (
      <section
        className={cn(
          "rounded-lg border border-outline-variant bg-surface p-4",
          className,
        )}
        aria-label="Usage statistics"
      >
        <header className="mb-3 flex items-center justify-between">
          <h3 className="text-headline-ui-md text-on-surface">Usage</h3>
          <Icon name="error" size={16} className="text-on-surface-variant" />
        </header>
        <p className="text-body-ui-md text-on-surface-variant">
          Couldn&apos;t load usage stats.
        </p>
      </section>
    );
  }

  if (isLoading || !data) {
    return <UsageCardSkeleton className={className} />;
  }

  const recent = data.recentEvents.slice(0, 5);

  return (
    <section
      className={cn(
        "rounded-lg border border-outline-variant bg-surface p-4",
        className,
      )}
      aria-label="Usage statistics"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="insights" size={18} className="text-primary" />
          <h3 className="text-headline-ui-md text-on-surface">Usage</h3>
        </div>
        <span className="text-label-ui-sm uppercase tracking-wider text-on-surface-variant">
          Last 7 days
        </span>
      </header>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-2">
        {STATS.map((stat) => (
          <StatTile
            key={stat.key}
            icon={stat.icon}
            label={stat.label}
            value={data[stat.key]}
          />
        ))}
      </div>

      {/* Recent activity */}
      <div className="mt-4">
        <h4 className="text-label-ui-sm mb-2 uppercase tracking-wider text-on-surface-variant">
          Recent Activity
        </h4>
        {recent.length === 0 ? (
          <p className="text-body-ui-md rounded border border-dashed border-outline-variant/50 px-3 py-4 text-center text-on-surface-variant">
            No activity yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {recent.map((event, i) => {
              const meta = getEventMeta(event.type);
              return (
                <li
                  key={`${event.type}-${event.date}-${i}`}
                  className="flex items-center gap-2.5 rounded px-1.5 py-1.5 transition-colors hover:bg-surface-container-low"
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
                    <Icon name={meta.icon} size={14} />
                  </span>
                  <span className="text-body-ui-md flex-1 truncate text-on-surface">
                    {meta.label}
                  </span>
                  <span className="text-label-ui-sm shrink-0 text-outline">
                    {event.count > 1 ? `${event.count}× · ` : ""}
                    {relativeTime(event.date)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stat tile                                                           */
/* ------------------------------------------------------------------ */

function StatTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded bg-surface-container-low p-3">
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

/* ------------------------------------------------------------------ */
/* Skeleton                                                            */
/* ------------------------------------------------------------------ */

function UsageCardSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        "rounded-lg border border-outline-variant/40 bg-surface p-4",
        className,
      )}
      aria-hidden="true"
    >
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-5 animate-pulse rounded bg-surface-container" />
          <div className="h-4 w-16 animate-pulse rounded bg-surface-container" />
        </div>
        <div className="h-3 w-20 animate-pulse rounded bg-surface-container" />
      </header>
      <div className="grid grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded bg-surface-container-low"
          />
        ))}
      </div>
      <div className="mt-4 space-y-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-7 animate-pulse rounded bg-surface-container-low"
          />
        ))}
      </div>
    </section>
  );
}

export default UsageCard;
