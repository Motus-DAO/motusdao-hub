# Glass surfaces

Chat-MotusAI / Avril **glass-nav-modal** recipe. Source of truth: `--glass-*` in `app/globals.css` (`:root` + `.dark`). Topbar mirrors the same values via Tailwind utilities.

## Variants

| Class | Use | Light | Dark |
| --- | --- | --- | --- |
| `.glass` / `.glass-card` | Cards, panels | `white/55` + `blur(24px) saturate(1.5)` | `white/6` + same blur |
| `.glass-strong` / `.glass-card-strong` | Modals over busy UI | `white/68` + stronger blur | `rgba(4,4,8,0.86)` + subtle sheen |
| `.glass-navbar` | CSS twin of topbar tokens | same as `.glass` | same as `.glass` |
| `.glass-sidebar` | Side nav | same as `.glass` | same as `.glass` |

## Topbar (reference implementation)

```tsx
'rounded-3xl border backdrop-blur-xl backdrop-saturate-150',
light → 'border-black/10 bg-white/55 shadow-[0_8px_40px_…,inset_0_1px_0_…]',
dark  → 'border-white/14 bg-white/[0.06] shadow-[0_8px_40px_…,inset_0_1px_0_…]',
```

No sheen overlays on default glass — **blur + thin fill** creates the frost.

## Rules

1. Use `GlassCard` or `.glass` / `.glass-card` for page surfaces.
2. Modals over stacked content: `variant="strong"` + dim overlay (`bg-black/70 backdrop-blur-sm`).
3. Do not stack extra `bg-white/85` or radial gradients on glass surfaces.
4. Tune globally via `--glass-*` tokens, not one-off component opacity.

## Readability

- **Light/dark cards:** same translucent recipe as topbar; text uses existing `.glass` color overrides.
- **Modals:** stronger variant + backdrop dim — not opaque cards everywhere.
