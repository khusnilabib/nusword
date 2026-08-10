/**
 * Material Symbols icon wrapper.
 * Uses the Google Material Symbols Outlined font (loaded in layout.tsx).
 *
 * Usage: <Icon name="search" size={20} />
 *
 * This keeps the design's stroke-based (1.5px feel via 300 weight) icon style
 * rather than introducing a second icon set.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
}

export const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
  (
    {
      name,
      size = 20,
      filled = false,
      weight = 300,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        aria-hidden="true"
        className={cn("material-symbols-outlined select-none", className)}
        style={{
          fontSize: size,
          fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 20`,
          ...style,
        }}
        {...props}
      >
        {name}
      </span>
    );
  },
);
Icon.displayName = "Icon";
