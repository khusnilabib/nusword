---
name: NuScribe
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#414848'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#717878'
  outline-variant: '#c1c8c7'
  surface-tint: '#446464'
  primary: '#012425'
  on-primary: '#ffffff'
  primary-container: '#1a3a3a'
  on-primary-container: '#83a4a3'
  inverse-primary: '#abcdcc'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#33190d'
  on-tertiary: '#ffffff'
  tertiary-container: '#4c2e20'
  on-tertiary-container: '#c09582'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c7e9e8'
  primary-fixed-dim: '#abcdcc'
  on-primary-fixed: '#002020'
  on-primary-fixed-variant: '#2d4c4c'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffdbcc'
  tertiary-fixed-dim: '#ebbca8'
  on-tertiary-fixed: '#2e1509'
  on-tertiary-fixed-variant: '#603f30'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-doc:
    fontFamily: Source Serif 4
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-ui-lg:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-ui-md:
    fontFamily: Hanken Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-doc-main:
    fontFamily: Source Serif 4
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-ui-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-ui-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  mono-ui:
    fontFamily: jetbrainsMono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
  sidebar-width: 280px
  toolbar-height: 56px
---

## Brand & Style

The design system is built on the philosophy of the "Invisible Interface." It prioritizes the act of creation and the precision of typesetting above all else. Drawing from **Minimalism** and **Modern Corporate** aesthetics, the UI recedes to the background, functioning as a sophisticated toolset that empowers rather than distracts.

The brand personality is authoritative yet quiet, mirroring the focused environment of a high-end editorial studio. It targets academics, publishers, and authors who require a professional workspace that feels both timeless and technologically advanced. The emotional response is one of clarity, reliability, and calm focus.

## Colors

The palette is intentionally restrained to maintain an academic and professional tone. 

- **Primary (Deep Teal):** Used sparingly for primary actions, active states, and brand touchpoints. It represents precision and depth.
- **Neutral Scale:** A range of architectural grays. Deep charcoal (#0F172A) is used for typography to reduce eye strain compared to pure black, while soft grays define the UI structure.
- **Canvas & Paper:** The interface distinguishes between the "Canvas" (the application background) and the "Paper" (the document workspace). The Paper is always pure white to ensure accurate color representation for print-ready content.

## Typography

This system employs a dual-typeface strategy to separate "Tools" from "Content."

- **Interface (Hanken Grotesk):** A modern, high-legibility sans-serif used for all functional UI elements, sidebars, and menus. It provides a sharp, professional contrast to the document content.
- **Content (Source Serif 4):** A professional-grade serif designed for long-form reading and academic publishing. It reflects the "bookish" nature of the platform and provides the necessary weight for print-ready layouts.
- **Technical (JetBrains Mono):** Used for metadata, coordinates, and typesetting values where character alignment is critical.

Document headings should use tight letter-spacing, while UI labels use slight tracking for increased legibility at small sizes.

## Layout & Spacing

The layout follows a **Fixed Grid** philosophy for the document workspace to simulate physical paper, while the surrounding UI utilizes a **Fluid Functional** model.

- **The Workspace:** Centered document view with generous "dead space" on either side to minimize peripheral distraction.
- **The Utility Panels:** Fixed-width sidebars (Left for navigation, Right for properties) that can be collapsed to enter a "Zen Mode."
- **Rhythm:** A 4px baseline grid governs all UI components. Consistent 24px gutters ensure that complex property panels remain readable and organized.
- **Mobile Adaptation:** Sidebars transform into bottom sheets or full-screen overlays; the document view scales to fit width while maintaining font-size legibility.

## Elevation & Depth

To maintain the "clean canvas" feel, this design system avoids heavy shadows and instead uses **Tonal Layers** and **Low-Contrast Outlines**.

- **Level 0 (Canvas):** The base application background, using a subtle off-white or cool gray.
- **Level 1 (Panels):** Sidebars and toolbars, separated by a 1px border (#E2E8F0) rather than a shadow.
- **Level 2 (The Paper):** The document itself, using a very soft, diffused ambient shadow (0px 4px 20px rgba(0,0,0,0.04)) to provide a subtle "lift" from the canvas.
- **Level 3 (Overlays):** Contextual menus and modals use a crisp 1px border and a medium-diffused shadow to indicate interactivity and temporary state.

## Shapes

The shape language is "Soft-Modular." 

Elements use a conservative 4px (`0.25rem`) corner radius. This creates a professional look that feels modern but avoids the "bubbliness" of consumer-grade social apps. 

- **Inputs & Buttons:** 4px radius.
- **Cards & Modals:** 8px radius (`rounded-lg`).
- **Active Indicators:** 0px (Sharp) for vertical tab indicators to maintain the structural grid alignment.

## Components

- **Buttons:** Primary buttons use the Deep Teal background with white text. Secondary buttons use a 1px border with neutral text. Action icons should be stroke-based (1.5px weight) for a technical feel.
- **Input Fields:** Minimalist design—bottom border only in default state, transitioning to a full 1px teal outline on focus. Labels are always persistent in the `label-ui-sm` style.
- **Property Controls:** Used in the right sidebar. Compact height (32px) with monospaced values for numerical inputs (font sizes, margins, leading).
- **The Ruler:** A critical component for a print-ready platform. It should be positioned at the top and left of the document, using `mono-ui` typography and 1px increments.
- **Chips/Badges:** Used for document tags or status (e.g., "Draft", "Print-Ready"). These should be rectangular with a subtle 2px radius and light gray backgrounds.
- **Lists:** Clean, no-divider lists in the sidebar. Active items are indicated by a subtle background tint and a primary-colored vertical leading edge.