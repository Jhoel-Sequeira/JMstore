---
name: Retail Operating System
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
  on-surface-variant: '#464555'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.25rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1rem
    letterSpacing: 0em
  label-lg:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0em
  label-md:
    fontFamily: Inter
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-lg: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers a high-density, utility-driven interface crafted for multi-brand retail operations, inventory management, and fast-paced Point of Sale (POS) environments. The tone is utilitarian, calm, and decisively modern—stripping away visual noise so cashiers, store leads, and multi-location operators can process transactions and parse heavy catalog data with zero cognitive friction.

The style pairs functional corporate SaaS clarity with high-precision ergonomics:
- **Pristine surfaces:** Clean, light canvas with crisp boundaries rather than heavy drop shadows.
- **Data-first hierarchy:** Tabular numerical alignment, compact line heights, and clear semantic indicators.
- **Immediate tactile cues:** Distinct interactive states for touchscreen terminals, bar scanners, and desktop keyboard shortcuts alike.

## Colors

The palette balances clinical legibility with precise situational accents. 

### Core Palette
- **Primary (`#4F46E5`):** Reserved for primary POS actions (Checkout, Apply Discount, Save Product) and high-priority navigations. Hover state transitions to `#4338CA`; soft interactive selections utilize `#EEF2FF`.
- **Secondary / Success (`#10B981`):** Indicates inbound stock, verified payment settlements, positive margins, and online registers. Soft surface tint uses `#ECFDF5`.
- **Tertiary / Warning (`#F59E0B`):** Low inventory levels, pending syncs, and reorder triggers. Soft tint uses `#FFFBEB`.
- **Destructive / Alert (`#EF4444`):** Stock write-offs, returns, voided orders, and failed gateways. Soft tint uses `#FEF2F2`.

### Neutral Surfaces & Typography
- **Backgrounds:** Canvas renders in pure `#FFFFFF`. Subordinate control panels, card headers, and sidebars utilize `#F8FAFC` and `#F1F5F9`.
- **Borders:** Structural grid separators and container lines rely strictly on `#E2E8F0` (standard) and `#CBD5E1` (active/hover).
- **Text & Slates:** High-emphasis data and headings use deep slate `#0F172A`. Body text sits at `#1E293B` and `#334155`. Metadata, timestamps, and column labels use muted slate `#64748B` and `#94A3B8`.

## Typography

The type system runs entirely on **Inter** to maintain optical clarity across high-density desktop screens and touch registers.

- **Tabular Figures:** Always apply `font-feature-settings: "tnum" 1` to currency amounts, SKU sequences, quantities, and barcode figures to prevent visual jitter when numbers change.
- **Scanning Rhythm:** Use uppercase styling with `label-sm` or `label-md` exclusively for table header rows, category badges, and metadata tags to establish distinct visual anchors against lowercase body copy.

## Layout & Spacing

The layout model adapts to high-density desktop back-office screens and split-screen touch registers.

- **Grid Strategy:** A fluid 12-column grid layout for inventory and store-analytics dashboards. In POS terminal mode, standard layout splits into a 7:5 ratio (catalog browse grid on the left, running transaction cart panel on the right).
- **Breakpoint Rules:**
  - `Desktop (>= 1280px)`: Fixed 240px collateral navigation sidebar, fluid data grid, 24px canvas margins (`margin-lg`).
  - `Tablet / Terminal (768px - 1279px)`: Collapsible navigation bar to 64px icon-rail, 16px gutters (`gutter`), dual-column checkout layouts.
  - `Mobile / Handheld (< 768px)`: Single column stacking with full-bleed data rows, fixed bottom action tray, 16px margins (`margin`).

## Elevation & Depth

Visual separation relies predominantly on structural line work and subtle tone differences rather than dramatic spatial projection:

- **Level 0 (Base Canvas):** Pure `#FFFFFF` or `#F8FAFC`. Completely flat with 1px `#E2E8F0` divisional borders.
- **Level 1 (Cards, Data Blocks):** `#FFFFFF` surface with a 1px border of `#E2E8F0` and `box-shadow: 0 1px 2px 0 rgba(15, 23, 42, 0.05)`.
- **Level 2 (Popovers, Select Menus, Tooltips):** Elevated slightly above tables with `box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` and a subtle `#CBD5E1` border.
- **Level 3 (Modals, Slide-over Drawers):** Modal cards sit atop a `#0F172A` backdrop dimmed to 40% opacity, accompanied by `box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.08)`.

## Shapes

The interface embraces a compact, soft geometry (`roundedness: 1`):

- **Micro elements:** Checkboxes, badge tags, and nested icons use `0.25rem` (4px).
- **Controls & Inputs:** Buttons, dropdowns, and form fields use `0.375rem` (6px) to `0.5rem` (8px).
- **Surfaces & Cards:** Modals, product cards, and floating panels use `0.5rem` (8px) to `0.75rem` (12px).
- **Pill overrides:** Interactive filter toggles, stock status badges, and brand category chips utilize full rounded edges (`9999px`) to create clear contrast against structured, rectangular data tables.

## Components

### Buttons
- **Primary:** Solid `#4F46E5` with `#FFFFFF` text, `0.375rem` radius, padding `0.5rem 1rem`. Active click scales to 0.98. Focus rings use `2px solid #EEF2FF` offset by `2px #4F46E5`.
- **Secondary:** Surface `#FFFFFF` with 1px border `#E2E8F0`, text `#1E293B`. Hover shifts background to `#F8FAFC`.
- **Destructive:** Subtle tint `#FEF2F2` with `#EF4444` text and border for standard states; switches to solid `#EF4444` with `#FFFFFF` text for irreversible actions.

### Data Tables
- **Headers:** Background `#F8FAFC`, uppercase `label-sm` text in `#64748B`, 1px solid bottom border in `#E2E8F0`. Height is fixed at 40px.
- **Rows:** Alternating zebra or solid white with hover transition to `#F8FAFC`. Cell height 48px standard, 36px in compact view. Numeric data aligned right with monospace figures.

### Status Badges & Pills
- **Stock In / Available:** `#ECFDF5` background, `#065F46` text, subtle dot indicator `#10B981`.
- **Low Stock / Flagged:** `#FFFBEB` background, `#92400E` text.
- **Return / Void:** `#FEF2F2` background, `#991B1B` text.
- Padding: `0.125rem 0.5rem`, rounded-full, typography `label-sm`.

### Form Fields & Search Bars
- Standard height: 38px (desktop), 44px (POS touch terminals).
- Background `#FFFFFF`, border 1px `#CBD5E1`. On focus: border shifts to `#4F46E5` with an outer halo of `rgba(79, 70, 229, 0.15)`.
- Barcode/SKU inputs feature a left-aligned scanner icon in `#94A3B8` and a right-aligned clear shortcut button.

### POS Quick-Tap Grid Cards
- Touch-optimized product squares featuring brand badge, item title (`body-sm`), stock level indicator, and price (`label-lg`). Border 1px `#E2E8F0`, hover or tap produces immediate 1px border `#4F46E5`.