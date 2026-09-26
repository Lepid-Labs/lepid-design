# lepid-design

Shared UX/design system for Lepid Labs apps. Two layers:

- **`styles/`** (`@lepid-labs/styles`) — framework-agnostic CSS: design tokens,
  base styles, and component classes, organized per theme. Any app (React,
  Svelte, plain HTML) can adopt this layer immediately.
- **`components/react/`** (`@lepid-labs/ui-react`) — React components that render
  the style layer's classes. For behavior-heavy UI as apps standardize on React.

**Showcase:** https://lepid-labs.github.io/lepid-design/ — every component rendered
live, with a style selector, plus full-page app shell and layout previews. Deployed from `site/` on push to main.

## Themes

| Theme | Scheme | Description |
| --- | --- | --- |
| `neon-butterfly` | dark | Dark navy + lilac + neon lime, JetBrains Mono, glass surfaces with glow hovers. Derived from the switchboard landing page. |
| `summer-cloud` | light | Light sky gradient + vivid violet + sky blue, Plus Jakarta Sans / Inter / JetBrains Mono, frosted glass with bouncy pill buttons. Derived from the Summer Cloud retail UI system. |
| `luminous-precision` | dark | Deep obsidian + vibrant orchid + electric teal, Sora headlines over JetBrains Mono, glass panes with lit top edges and glow-based elevation. Professional evolution of neon-butterfly, derived from the InfraPulse Stitch mockups. |

Each theme ships a `design.md` — a Stitch-compatible written spec of the
aesthetic (palette, typography, shape rules, component inventory). Read it
before designing new screens; feed it to Stitch to generate on-system mockups.

`styles/manifest.json` (exported as `@lepid-labs/styles/manifest`) is the
machine-readable roster: every theme's name, scheme, and webfont links.
Consumers that validate a configured theme name or inject font links should
read it instead of hardcoding a list — a new theme then works by name alone.

## Consuming

Packages publish to the public npm registry (`@lepid-labs/styles`,
`@lepid-labs/ui-react`) — no registry config or auth needed to install.

**Since 0.3.0 every rule is scoped:** nothing applies until an element carries
`data-ld-style="<theme>"`. Put it on `<html>` for a whole page, or on any
container to theme just that subtree (safe for embedding into pages you don't
own — the CSS is inert everywhere else, and the guards are zero-specificity
`:where()`, so any of your own rules override). Because of the scoping, several
themes can load at once and swapping is one attribute flip.

### Styles (any app)

```css
@import "@lepid-labs/styles/luminous-precision";        /* full theme */
@import "@lepid-labs/styles/luminous-precision/tokens"; /* tokens only */
@import "@lepid-labs/styles/all";                       /* every theme, for runtime switching */
```

```html
<html data-ld-style="luminous-precision">
```

The same subpaths work as side-effect imports in JS/TS (`import
"@lepid-labs/styles/luminous-precision"`). Every CSS export carries a `types`
condition, so TypeScript 6 (which requires side-effect imports to resolve to
typed modules) needs no local `declare module` shim.

No-build apps can pull from jsDelivr instead:

```html
<link rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/lepid-labs/lepid-design@v1.0.0/styles/luminous-precision/index.css">
```

The same works at runtime for themes newer than an app's installed dep: fetch
`.../styles/manifest.json` for the roster, add the theme's stylesheet link,
set the attribute.

Webfonts are not bundled; include the Google Fonts links (exact URLs are in
`manifest.json`) or self-host. Every font stack falls back to a system family.

| Theme | Fonts |
| --- | --- |
| `neon-butterfly` | JetBrains Mono (450, 700) |
| `summer-cloud` | Plus Jakarta Sans (400, 600, 700, 800), Inter (400, 600), JetBrains Mono (500, 700) |
| `luminous-precision` | Sora (500, 600, 700), JetBrains Mono (400, 600, 700) |

`summer-cloud` also expects `.ld-bg` on `<body>` — the sky gradient is what its
frosted-glass surfaces read against (an `.ld-shell` paints it for you).

### Migrating from 0.3.x

1.0.0 renames the `nb-` prefix to `ld-` everywhere: classes (`.ld-card`),
tokens (`--ld-primary`), keyframes, and the scoping attribute
(`data-ld-style`). Nothing else changed. Run the codemod over your app and
you are done:

```bash
curl -fsSL https://raw.githubusercontent.com/lepid-labs/lepid-design/main/scripts/rename-nb-prefix.sh \
  | bash -s -- src index.html
```

It rewrites `--nb-*` → `--ld-*`, `data-nb-style` → `data-ld-style`,
`dataset.nbStyle` → `dataset.ldStyle`, and any
`nb-` that starts an identifier → `ld-` (CSS, HTML, JS/TS/JSX, Svelte, Vue,
Markdown, JSON). It is idempotent, and it skips `node_modules`, `dist`, and
`.git`. Review the diff; identifiers of your own that happen to start with
`nb-` are renamed too.

### React components

```tsx
import { Button, Card, NavLink } from "@lepid-labs/ui-react";
```

Import a theme's CSS once at the app root; components carry only class names
(`ld-btn`, `ld-card`, `ld-link`), so themes stay swappable.

`HoldButton` is the hold-to-confirm variant: press and hold, a ring fills over
the theme's `--ld-hold-duration` (or the `duration` prop), and `onConfirm`
fires once when it completes — release early and nothing happens. Keyboard
users hold Space/Enter; set `confirmOnKeyboardTap` to let a plain tap fire
instead (pair it with a `Dialog` in `onConfirm`).

```tsx
<HoldButton variant="danger" hint="hold 300 ms" icon={<TrashIcon />} onConfirm={remove}>
  Hold to delete
</HoldButton>
```

`ButtonGroup` is one long track (a pill, under summer-cloud) with `Button`s
lined up inside it — the theme strips the segments' own chrome. Use it as an
action toolbar, or as a segmented toggle by setting `aria-pressed` on each
`Button`: the theme lights the pressed segment, the state stays yours.
`block` fills the row with equal-width segments.

With a single pressed segment (and in `Tabs`) the highlight is one sliding
indicator rather than per-item chrome: it is pinned to the active item with
CSS anchor positioning and its two edges move on different timing, so it
stretches toward the new item and snaps back to shape. The components stamp
`data-ld-dir="forward" | "back"` on the track to say which edge leads; in
plain HTML set it yourself when the selection changes (the site demo does),
or skip it for a plain slide. Browsers without anchor positioning, and groups
with several pressed segments, keep the static highlight; reduced motion drops
the travel. Timing is per theme: `--ld-slide-lead` / `--ld-slide-trail`.

```tsx
<ButtonGroup aria-label="View">
  {["list", "board", "timeline"].map((v) => (
    <Button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{v}</Button>
  ))}
</ButtonGroup>
```

`IconButton` is the chromeless square for icon-only actions. `label` is
required — it becomes the `aria-label` and the hover tooltip. It renders a
`<button type="button">`; pass `as="a"` (or a router Link) for navigation,
where `active` also sets `aria-current="page"`. For a toggle, pass
`aria-pressed`. `variant="danger"` reddens the glyph on hover.

```tsx
<IconButton label="Settings" as="a" href="#/settings" active={route === "/settings"}>
  <SettingsIcon />
</IconButton>
<IconButton label="Delete" variant="danger" onClick={remove}><TrashIcon /></IconButton>
```

`Table` styles a native `<table>`; compose `thead`/`tbody`/`th`/`td` inside it.
Every table hovers its rows; the pointer cursor is what marks rows as
clickable. For that, pass `interactive` and give body rows `TableRow` with
`onActivate`: the row joins the tab order, activates on click or
Enter/Space, and ignores clicks on nested links/buttons/inputs and text
selections. `selected` sets `aria-selected` and lights the row. Plain HTML
gets the same look from `.ld-table--interactive`, but must add
`tabindex="0"` and the key handling itself.

```tsx
<Table interactive>
  <thead><tr><th>Name</th><th>State</th></tr></thead>
  <tbody>
    {rows.map((r) => (
      <TableRow key={r.id} selected={r.id === selectedId} onActivate={() => select(r.id)}>
        <td>{r.name}</td><td>{r.state}</td>
      </TableRow>
    ))}
  </tbody>
</Table>
```

`LogBlock` is the terminal/log well (`.ld-pre.ld-pre--log`): capped at
420px (`maxHeight` overrides via `--ld-log-max-height`), scrolls, and wraps
long lines. With `follow` it keeps the newest line in view — but only while
the reader is already at the bottom, so scrolling up to read history isn't
yanked back. It is a `role="log"` live region; pass `live={false}` for very
chatty streams. Fetching/streaming stays in the app.

```tsx
<LogBlock follow maxHeight={320}>
  {lines.length ? lines.join("\n") : "(waiting for logs…)"}
</LogBlock>
```

`CodeBlock` is an `.ld-pre` with a copy-to-clipboard control
(`.ld-pre-wrap` + `.ld-pre-copy`, an `.ld-icon-btn`) in its top-right corner:
hidden until hover or focus, always shown on touch. It copies the block's
text; for 1.5s the button shows a check (danger tint if the clipboard write
fails) and a polite live region announces the result. `className` goes on the
`<pre>`, so `className="ld-pre--log"` gives a copyable log.

```tsx
<CodeBlock>{`pnpm add @lepid-labs/styles`}</CodeBlock>
```

No build step? The styles package ships only CSS, so plain-HTML hosts use
this markup (icons from your own set — any two inline `<svg>`s) plus the
script below once per page. The theme reads `data-ld-copy="copied"|"failed"`.

```html
<div class="ld-pre-wrap">
  <pre class="ld-pre">pnpm add @lepid-labs/styles</pre>
  <button type="button" class="ld-icon-btn ld-pre-copy" aria-label="Copy code" title="Copy code">
    <svg class="ld-pre-copy__icon" aria-hidden="true">…copy glyph…</svg>
    <svg class="ld-pre-copy__check" aria-hidden="true">…check glyph…</svg>
  </button>
  <span class="ld-pre-copy-status" aria-live="polite"></span>
</div>
<script>
document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".ld-pre-copy");
  const wrap = btn?.closest(".ld-pre-wrap");
  if (!wrap) return;
  let state = "copied";
  try { await navigator.clipboard.writeText(wrap.querySelector("pre").textContent); }
  catch { state = "failed"; }
  const status = wrap.querySelector(".ld-pre-copy-status");
  if (status) status.textContent = state === "copied" ? "Copied to clipboard" : "Copy failed";
  btn.dataset.ldCopy = state;
  clearTimeout(btn._ldCopyTimer);
  btn._ldCopyTimer = setTimeout(() => {
    delete btn.dataset.ldCopy;
    if (status) status.textContent = "";
  }, 1500);
});
</script>
```

The clipboard API needs a secure context (HTTPS or localhost); elsewhere the
control reports "Copy failed". `site/copy-demo.js` is the same script.

`StatusCard` is the dense dashboard card (generalized from pulse's repo
card): `tone` colors the left edge, `attention` adds a glow ring (`true` is
warning), and bumping `changedAt` replays a fade-out flash. `prefix`/`title`
(a link when `href` is set), `meta` badges, and a faint `note` fill the head;
`StatusCardRows`/`StatusCardRow`, `StatusCardFooter`, and `StatusCardEmpty`
make the body. `Badge` gained `size="sm"` and `pulse` for the meta row.

```tsx
<StatusCard prefix="lepid-labs" title="pulse" href={url} external tone="success"
  attention={reviews > 0} changedAt={changedAt} note="2h ago"
  meta={<Badge size="sm" pulse>{reviews} PRs · Review</Badge>}>
  <StatusCardRows>
    <StatusCardRow href={issue.url} leading="#42" trailing={<Badge size="sm">bug</Badge>}>
      {issue.title}
    </StatusCardRow>
  </StatusCardRows>
  <StatusCardFooter href={issuesUrl}>4 more…</StatusCardFooter>
</StatusCard>
```

`Stepper` is the horizontal milestone rail (a delivery tracker, a checkout
flow). Pass `steps` and the `current` index; earlier steps render complete,
later ones upcoming, and the theme fills the rail up to the current node —
nothing to compute. Icons are optional (a check mark once complete, the step
number otherwise); pass `steps.length` as `current` when everything is done.

```tsx
<Stepper current={2} steps={[
  { id: "placed", label: "Order placed" },
  { id: "packed", label: "Packed" },
  { id: "out", label: "Out for delivery", icon: <TruckIcon /> },
  { id: "delivered", label: "Delivered" },
]} />
```

### App shell and page layouts

`AppShell` is the application frame: an optional sticky header, an optional
left-hand nav, main, and an optional footer. Leave a part out and its grid
track collapses — there are no "has header" modifiers. The shell paints the
theme's page background itself (the same treatment as `.ld-bg`, also applied
to the `<body>` around it), and the header and nav are unfilled — hairline
borders over that background, the header blurring what scrolls beneath it —
so no class on `<body>` is needed. The header always spans the full width
above the nav, toggle and brand at its left, so they never move as the nav
collapses or hides.

On wide screens the header's toggle collapses the nav to an icon rail. Below
48rem the nav becomes a drawer opened from that toggle, or — with
`mobileNav="tabbar"`, the default when there is no header — a bottom tab bar.
Items render `<a>`; pass `as={Link}` for a router. `active` sets
`aria-current="page"`, which is what the theme lights (router links that set
it themselves work as-is).

```tsx
<AppShell
  header={<AppHeader brand={<><Logo /> pulse</>} brandHref="/"
    nav={<TopNav aria-label="Sections"><TopNavItem href="/" active>Repos</TopNavItem></TopNav>}
    actions={<Button size="sm">Sign out</Button>} />}
  nav={<SideNav aria-label="Main" footer={<SideNavItem href="/settings" icon={<GearIcon />}>Settings</SideNavItem>}>
    <SideNavSection title="Workspace">
      <SideNavItem as={Link} to="/" icon={<HomeIcon />} active>Overview</SideNavItem>
      <SideNavItem as={Link} to="/prs" icon={<InboxIcon />} badge={<Badge size="sm">3</Badge>}>Reviews</SideNavItem>
    </SideNavSection>
  </SideNav>}
  footer={<span>© Lepid Labs</span>}
>
  <Page title="Overview" eyebrow="Workspace" actions={<Button variant="primary">New</Button>}>
    <Grid min="18rem">{cards}</Grid>
  </Page>
</AppShell>
```

Page layouts go inside main: `Page` (a centered column — `width` narrow
48rem, default 72rem, wide 96rem, full — with an optional `PageHeader`),
`Grid` (dashboard cards, `min` column width), `Split` (list + detail),
`AsideLayout` (content + sticky right aside, e.g. a table of contents), and
`Center` (sign in, empty states). `Split` and `AsideLayout` stack by
themselves when the wide pane would drop below 60% — no breakpoint. In plain
HTML, the showcase pages are the reference markup, and `site/shell-demo.js`
is the toggle/drawer behaviour to copy.

## Developing

```
pnpm install
pnpm build
pnpm --filter @lepid-labs/styles test   # theme contract, TS consumer, and release-bump tests
pnpm --filter @lepid-labs/ui-react test # hold-to-confirm controller behaviour
```

The contract test enforces the theme rules: every selector guarded by its
`data-ld-style`, keyframe names unique, the baseline token set complete, and
manifest/exports/directories in sync. A new theme that passes it works in
every manifest-reading consumer.

## Publishing

Manual. When main is ready to ship, run the `release` workflow from the
Actions tab (**Run workflow**). It bumps both package versions (patch by
default; a `type!:` subject or `BREAKING CHANGE:` footer in an unreleased
commit bumps the major), tags, creates the GitHub release, and the tag
triggers `publish.yml` — npm trusted publishing (OIDC, no stored token). If
nothing under `styles/` or `components/` changed since the last tag, the run
exits without releasing.

To pin a specific version (a milestone like 1.0.0), set it in both
`package.json` files in the PR; the release workflow publishes an untagged
pinned version as-is instead of bumping past it.

## Agent skill

[skills/design-system/SKILL.md](skills/design-system/SKILL.md) teaches coding
agents to consume this system instead of writing ad-hoc styles. Install it in
an app repo by symlinking or copying into `.claude/skills/design-system/`.

## Layout

```
styles/                    @lepid-labs/styles
  manifest.json            theme roster: name, scheme, font links
  all.css                  every theme in one import
  css.d.ts                 types target for every CSS export (TS 6 side-effect imports)
  neon-butterfly/          tokens.css, base.css, components/*.css, index.css, design.md
  summer-cloud/            same layout, same --ld-* token names, different values
  test/                    theme contract, TS consumer, and release-bump tests (node:test)
components/
  react/                   @lepid-labs/ui-react (tsc → dist/)
site/                      GH Pages showcase (no build; styles copied in by CI)
skills/design-system/      agent skill for consuming the system
scripts/                   consumer codemods (rename-nb-prefix.sh)
```
