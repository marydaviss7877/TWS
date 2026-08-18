# `components/ui/` conventions

This is the one shared primitive library for the app (Tailwind + Radix). Don't add a
second one — if a page needs a component that isn't here yet, add it here first.

## File layout

Every component is a **folder**, not a flat file:

```
components/ui/Button/
  Button.jsx   # the component — named exports only (no `export default` anywhere in this lib)
  index.js     # export * from './Button';
```

**Import directly from the component file, not the barrel**: every existing consumer does
`import { Button } from '.../components/ui/Button/Button'`, never
`from '.../components/ui/Button'`. Several of the original 14 components' `index.js` files
predate this convention and say `export { default } from './X'` even though `X.jsx` has no
default export — those barrels are silently broken (`undefined`) and nothing imports through
them, which is exactly why nobody noticed. Every component added since Phase 5 uses a correct
`export * from './X';` barrel instead, but keep importing the direct path for consistency
with the rest of the codebase regardless.

`npx shadcn add <name>` does **not** follow this — it drops a flat file
(`src/components/ui/tabs.jsx`) styled with shadcn's default CSS-variable color tokens
(`bg-background`, `text-foreground`, `bg-primary`/`text-primary-foreground`, etc.), which
don't exist in this project's Tailwind config. After running it, every time:

1. Move the generated file into `ComponentName/ComponentName.jsx` + add `index.js`.
2. Re-point its `cn`/utils import to `../../../lib/utils` (or the `@/lib/utils` alias).
3. **Replace shadcn's default color tokens with this project's actual palette** — this repo
   uses full Tailwind ramps (`primary-500`, `gray-100 dark:bg-gray-800`, etc.) with explicit
   `dark:` variants per class, not CSS custom properties. Use `Button/Button.jsx` as the
   template for how a `cva()` variant map should look here.
4. Confirm dark mode manually (see checklist below) — nothing here relies on
   `ConfigProvider`-style runtime theming, so there's no automatic dark-mode wiring to lean on.

`components.json` sets `cssVariables: false` and `tsx: false` to get as close as the CLI
allows, but step 3 above is still a manual pass every time — the CLI doesn't know this
project's color ramp.

## Primitives (as of Phase 5)

Original 14: `Avatar`, `Badge`, `Button`, `Card`, `Command`, `Dialog`, `DropdownMenu`,
`EmptyState`, `Input`, `ScrollArea`, `Separator`, `Sheet`, `Spinner`, `Tooltip`.

Added in Phase 5 (built for the Phase 6 antd migration, each mapping to one or more antd
components): `Tabs`, `Select`, `Progress`, `Alert` (+`AlertTitle`/`AlertDescription`),
`Switch`, `Checkbox`, `RadioGroup` (+`RadioGroupItem`), `Popover` (support primitive for
`DatePicker`), `Table` (+`TableHeader`/`Body`/`Row`/`Head`/`Cell`/`Caption` — presentational
only), `DataTable` (wraps `Table` with `@tanstack/react-table`: sorting, row selection,
pagination, per-column filters, expandable subrows via `getSubRows`), `Form`
(+`FormField`/`FormItem`/`FormLabel`/`FormControl`/`FormDescription`/`FormMessage` — the
`react-hook-form` + `zod` pattern, resolved via `@hookform/resolvers`), `DatePicker`
(+`Calendar`, wraps `react-day-picker` v10 — note: v10 ships **no default CSS**, every visual
class comes from `Calendar.jsx`'s `classNames` map).

No `Transfer` or `Tree` primitive was built — both antd usages turned out smaller than they
looked (a dead unused `Transfer` import in `SessionManagement.js`; a shallow 2-level
read-only `Tree` in `DepartmentManagement.js`) and are handled inline during their file's
Phase 6 migration instead.

Added later: `Timeline` (scroll-linked changelog/journey layout, ported from Aceternity UI —
`framer-motion` only, no Radix dependency). `Timeline.demo.jsx` sits alongside it as a usage
reference; it's intentionally not exported from `index.js` and not wired into any route.

`message.*` → already replaced with `react-hot-toast` in Phase 1 — no new toast primitive
needed here.

## Manual QA checklist (per page, no automated test coverage exists on this code)

Run this on any page touched during the antd → Radix migration (Phase 6) or any dark-mode
backfill (Phase 4):

- [ ] Page renders with no console errors, light mode
- [ ] Page renders with no console errors, dark mode (toggle via the shared `ThemeToggle`)
- [ ] Every interactive control (button, input, select, dropdown, modal/dialog, tabs, table
      sort/filter/pagination/row-selection/expand) works in both light and dark
- [ ] Focus states visible via keyboard (Tab) on every interactive control
- [ ] No layout shift or clipped content switching between light/dark
- [ ] Toasts (if the page had `antd.message` calls) fire correctly via `react-hot-toast`
- [ ] Any date/table/form data that used to come from antd renders the same real data,
      unchanged
