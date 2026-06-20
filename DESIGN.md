# Design Brief

## Direction

LXMF Ledger — a dark, botanical-themed dashboard for managing decentralized mesh-network HTLC payments on the Internet Computer.

## Tone

Tech-forward with an editorial edge: deep forest tones, geometric precision, and cryptographic trust signals.

## Differentiation

A dark forest-black canvas with vivid botanical-green data accents and warm amber CTAs — it feels like a secure terminal in a living ecosystem.

## Color Palette

| Token      | OKLCH         | Role                          |
| ---------- | ------------- | ----------------------------- |
| background | 0.13 0.02 155 | forest black canvas           |
| foreground | 0.92 0.01 150 | crisp off-white text          |
| card       | 0.17 0.022 155 | slightly elevated surfaces    |
| primary    | 0.65 0.18 155 | vivid botanical green (CTAs)  |
| accent     | 0.7 0.12 85   | warm gold highlights          |
| muted      | 0.21 0.025 155 | secondary backgrounds         |
| destructive| 0.55 0.22 25  | refund / error states         |
| success    | 0.6 0.16 150  | released / ok states          |
| warning    | 0.72 0.15 85  | expiry / pending states       |
| border     | 0.26 0.022 155 | subtle structural lines       |
| ring       | 0.65 0.18 155 | focus / active indicators     |

## Typography

- Display: Space Grotesk — bold headings, hero labels, dashboard title
- Body: DM Sans — forms, lists, body copy, UI labels
- Mono: Geist Mono — LXMF hashes, payment hashes, event log, balances
- Scale: hero `text-5xl md:text-7xl font-bold tracking-tight`, h2 `text-3xl md:text-5xl font-bold tracking-tight`, label `text-sm font-semibold tracking-widest uppercase`, body `text-base`

## Elevation & Depth

Cards sit on `bg-card` with `shadow-subtle`; active HTLC cards use `shadow-elevated` on hover. No full-page gradients — depth via layered surfaces and border contrast.

## Structural Zones

| Zone          | Background    | Border        | Notes                                      |
| ------------- | ------------- | ------------- | ------------------------------------------ |
| Header        | bg-card       | border-b      | sticky, title + hash input + faucet CTA    |
| Balance Card  | bg-card       | border        | glassmorphism hint, large mono balance       |
| HTLC Form     | bg-card       | border        | sharp inputs, amber submit button          |
| HTLC List     | bg-muted/30   | —             | alternating row surfaces, status badges      |
| Event Log     | bg-card       | border-l      | monospace scrollback, timestamp + entry    |
| Footer        | bg-muted/40   | border-t      | minimal, demo disclaimer                   |

## Spacing & Rhythm

Section gap `py-8` (32px). Card internal padding `p-6` (24px). Micro spacing `gap-3` (12px) inside forms. Rhythm: header → balance → form → list → log, each separated by consistent section gap.

## Component Patterns

- Buttons: `rounded-md`, primary actions in `bg-primary` with `text-primary-foreground`, secondary in `bg-secondary`; destructive actions (refund) in `bg-destructive`
- Cards: `rounded-lg`, `bg-card`, `border`, `shadow-subtle`, hover lifts to `shadow-elevated`
- Badges: `rounded-sm`, `px-2 py-0.5`, status colors: Locked = `bg-warning/20 text-warning`, Released = `bg-success/20 text-success`, Refunded = `bg-destructive/20 text-destructive`
- Inputs: `rounded-sm`, `bg-input`, `border`, focus `ring-2 ring-ring`

## Motion

- Entrance: cards stagger-fade in from below, `0.3s ease-out` each
- Hover: buttons and cards lift with `shadow-elevated`, `transition-smooth`
- Decorative: active HTLC items pulse-glow subtly to draw attention

## Constraints

- Dark mode only; no light mode variant
- No signature-verification UI (trust caller)
- No real ICP ledger integration visuals (faucet only)

## Signature Detail

The event log panel uses Geist Mono with a left `border-l-2 border-accent` accent line, making every state change feel like a timestamped terminal entry — a nod to the mesh-network hacker aesthetic.
