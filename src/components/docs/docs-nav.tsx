"use client";

import * as React from "react";
import { Icon } from "../nusword/icon";
import { cn } from "@/lib/utils";
import type { DocSection } from "@/lib/docs-content";

interface DocsNavProps {
  sections: DocSection[];
}

/**
 * DocsNav — sidebar navigation for the documentation page.
 * Sticky, scrollable, with active section highlighting.
 */
export function DocsNav({ sections }: DocsNavProps) {
  const [activeId, setActiveId] = React.useState<string>("");

  // Track scroll position to highlight active section.
  React.useEffect(() => {
    const handler = () => {
      const scrollY = window.scrollY + 100;
      for (const section of sections) {
        for (const sub of section.subsections) {
          const el = document.getElementById(sub.id);
          if (el) {
            const top = el.offsetTop;
            const bottom = top + el.offsetHeight;
            if (scrollY >= top && scrollY < bottom) {
              setActiveId(sub.id);
              return;
            }
          }
        }
      }
    };
    window.addEventListener("scroll", handler);
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, [sections]);

  return (
    <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-outline-variant bg-surface py-4 md:block">
      <nav className="space-y-4">
        {sections.map((section) => (
          <div key={section.id}>
            {/* Section header */}
            <div className="flex items-center gap-2 px-4 pb-1">
              <Icon name={section.icon} size={16} className="text-primary" />
              <span className="text-label-ui-sm font-semibold uppercase tracking-wider text-on-surface">
                {section.title}
              </span>
            </div>
            {/* Subsections */}
            <ul className="space-y-0.5">
              {section.subsections.map((sub) => (
                <li key={sub.id}>
                  <a
                    href={`#${sub.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = document.getElementById(sub.id);
                      if (el) {
                        window.scrollTo({
                          top: el.offsetTop - 70,
                          behavior: "smooth",
                        });
                      }
                    }}
                    className={cn(
                      "block border-l-2 py-1 pl-4 pr-2 text-body-ui-md transition-colors",
                      activeId === sub.id
                        ? "border-primary bg-primary-fixed/20 font-medium text-primary"
                        : "border-transparent text-on-surface-variant hover:border-outline-variant hover:bg-surface-container-low hover:text-on-surface",
                    )}
                  >
                    {sub.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
