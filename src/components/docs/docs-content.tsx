"use client";

import * as React from "react";
import { Icon } from "../nusword/icon";
import { cn } from "@/lib/utils";
import type { DocSection, DocBlock } from "@/lib/docs-content";

interface DocsContentProps {
  sections: DocSection[];
}

/**
 * DocsContent — renders all documentation sections.
 * Long-form content with headings, paragraphs, lists, tables, and callouts.
 */
export function DocsContent({ sections }: DocsContentProps) {
  return (
    <main className="flex-1 overflow-y-auto px-4 py-8 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-3xl">
        {sections.map((section) => (
          <section key={section.id} className="mb-16">
            {/* Section heading */}
            <div className="mb-6 flex items-center gap-3 border-b border-outline-variant pb-4">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary-fixed text-on-primary-fixed">
                <Icon name={section.icon} size={20} />
              </div>
              <div>
                <h2 className="text-headline-ui-lg text-on-surface">
                  {section.title}
                </h2>
                <p className="text-body-ui-md text-on-surface-variant">
                  {section.description}
                </p>
              </div>
            </div>

            {/* Subsections */}
            <div className="space-y-12">
              {section.subsections.map((sub) => (
                <div key={sub.id} id={sub.id} className="scroll-mt-20">
                  <h3 className="text-headline-ui-md mb-4 text-on-surface">
                    {sub.title}
                  </h3>
                  <div className="space-y-3">
                    {sub.blocks.map((block, i) => (
                      <DocBlockRenderer key={i} block={block} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Footer */}
        <div className="mt-16 border-t border-outline-variant pt-8 text-center">
          <p className="text-body-ui-md text-on-surface-variant">
            NUSWORD Documentation · Updated regularly with each new feature.
          </p>
          <p className="text-label-ui-sm mt-2 text-outline">
            Need help? Contact support or open an issue on GitHub.
          </p>
        </div>
      </div>
    </main>
  );
}

/** Render a single documentation block. */
function DocBlockRenderer({ block }: { block: DocBlock }) {
  switch (block.type) {
    case "paragraph":
      return (
        <p
          className="text-body-ui-md text-on-surface-variant"
          style={{ fontFamily: "var(--font-source-serif-4), serif", lineHeight: 1.7 }}
        >
          {block.text}
        </p>
      );

    case "heading":
      return (
        <h4
          className="text-headline-ui-md mt-4 text-on-surface"
          style={{ fontWeight: 600 }}
        >
          {block.text}
        </h4>
      );

    case "list":
      return (
        <ul className="space-y-1.5">
          {block.items?.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-body-ui-md text-on-surface-variant"
              style={{ fontFamily: "var(--font-source-serif-4), serif", lineHeight: 1.7 }}
            >
              <Icon name="circle" size={6} className="mt-2 shrink-0 text-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-lg border border-outline-variant">
          <table className="w-full text-left text-body-ui-md">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                {block.rows?.[0]?.map((cell, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 font-semibold text-on-surface"
                    style={{ fontFamily: "var(--font-hanken-grotesk), sans-serif" }}
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows?.slice(1).map((row, i) => (
                <tr key={i} className="border-b border-outline-variant/50 last:border-0">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="px-4 py-2.5 text-on-surface-variant"
                      style={{ fontFamily: "var(--font-source-serif-4), serif" }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "callout":
      return (
        <div
          className={cn(
            "rounded-lg border p-4",
            block.variant === "warning"
              ? "border-amber-300 bg-amber-50"
              : block.variant === "tip"
                ? "border-primary/30 bg-primary-fixed/20"
                : "border-outline-variant bg-surface-container-low",
          )}
        >
          <div className="flex items-start gap-2">
            <Icon
              name={
                block.variant === "warning"
                  ? "warning"
                  : block.variant === "tip"
                    ? "lightbulb"
                    : "info"
              }
              size={18}
              className={cn(
                "mt-0.5 shrink-0",
                block.variant === "warning"
                  ? "text-amber-600"
                  : "text-primary",
              )}
            />
            <p
              className="text-body-ui-md text-on-surface"
              style={{ fontFamily: "var(--font-source-serif-4), serif", lineHeight: 1.6 }}
            >
              {block.text}
            </p>
          </div>
        </div>
      );

    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg border border-outline-variant bg-surface-container p-4">
          <code className="text-mono-ui text-on-surface">{block.text}</code>
        </pre>
      );

    default:
      return null;
  }
}
