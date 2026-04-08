# Navigation Audit & Refactor Plan — TWS ERP Portal
> Generated: 2026-03-22 | Stack: React 18 + CRA/craco + Tailwind v3

---

## 1. CURRENT STATE — WHAT'S WRONG

### 1A. Component Inventory

| File | LOC | Used? | Problem tier |
|---|---|---|---|
| `TenantOrgLayout.js` | 993 | ✅ Active | 🔴 God component |
| `ClickUpSidebar.js` | 495 | ✅ Active | 🟡 Minor UX gaps |
| `SoftwareHouseTopNavbar.js` | 358 | ✅ Active | 🟡 Duplicate data |
| `industryMenuBuilder.js` | 509 | ✅ Active | 🟡 Dead export, triple duplication |
| `SupraAdminLayout.js` | 540 | ✅ Active | 🟠 Copy-pasted fullscreen code |
| `CommandPalette.js` | 309 | ✅ Active | 🟡 Duplicate action list |
| `ProjectWorkspaceLayout.js` | 295 | ✅ Active | 🟢 Well-designed |
| `Breadcrumbs.jsx` | 131 | ✅ Active | 🟢 Clean |
| `LoginNavbar.js` | 180 | ✅ Active | 🟢 Simple |
| `Layout.js` | 208 | ⚠️ Legacy | 🔴 Renders 3 sidebars at once |
| `Sidebar.js` | 87 | ⚠️ Legacy | 🟠 Only used in legacy Layout |
| `MobileMenu.js` | 125 | ⚠️ Legacy | 🟠 Only used in legacy Layout |
| `Header.js` | 109 | ⚠️ Legacy | 🟠 Only used in legacy Layout |
| `useMenuFiltering.js` | 243 | ❌ Dead | 🔴 Created but never imported |
| **TOTAL** | **~5,100** | | |

---

### 1B. Critical Issues Found

#### Issue 1 — TRIPLE DUPLICATION: `menuKeyToModules` mapping
The same 25-key object mapping menu keys to module names is copy-pasted in 3 places:
- `TenantOrgLayout.js` lines 401–424
- `useMenuFiltering.js` lines 33–93 (also dead code — never imported)
- `industryMenuBuilder.js` lines 401–424

**Effect:** Changing access rules for one module requires updating 3 files. Bugs are silently inconsistent.

#### Issue 2 — DUPLICATE: Search action arrays defined twice
`getSearchActions()` in `SoftwareHouseTopNavbar.js` and `navigationActions + quickCreateActions` in `CommandPalette.js` define the same 12–14 ERP navigation targets with the same paths and icons. They will inevitably drift.

#### Issue 3 — 6× COPY-PASTED: Fullscreen API boilerplate
```js
// This exact 40-line block exists in TenantOrgLayout, SupraAdminLayout, and Layout:
document.addEventListener('fullscreenchange', handler);
document.addEventListener('webkitfullscreenchange', handler);
document.addEventListener('mozfullscreenchange', handler);
document.addEventListener('MSFullscreenChange', handler);
```
Including the `requestFullscreen` / `exitFullscreen` async functions.

#### Issue 4 — GOD COMPONENT: `TenantOrgLayout` (993 lines, 14+ concerns)
A single component manages:
- Auth redirect guard
- Sidebar collapse state (persisted to localStorage)
- Mobile menu state
- User dropdown state
- Add-quick-action dropdown state
- Fullscreen state + API
- Keyboard shortcuts (4 bindings)
- API calls (fetches departments + permissions)
- Menu item generation (calls industryMenuBuilder)
- Menu filtering (inline permission logic with dual UPR paths)
- Expanded submenu state (persisted to localStorage)
- Theme rendering
- Loading timeout guard
- Section-grouped sidebar rendering (200+ lines of JSX)
- Mobile sidebar rendering (another 100+ lines of JSX)
- Command palette state

#### Issue 5 — DEAD CODE
- `useMenuFiltering.js` — 243 lines, exported, never imported anywhere
- `getIndustryModuleKeys()` in `industryMenuBuilder.js` — exported, never imported
- `Layout.js` renders **3 sidebars simultaneously** (`<MobileMenu>`, `<Sidebar>`, `<ClickUpSidebar>`) — the old ClickUpSidebar is passed wrong props (`navigation` instead of `allModules`)

#### Issue 6 — NO SHADCN/UI
The entire navigation layer uses hand-rolled dropdowns, modals, tooltips, command palettes with:
- No accessibility primitives (no focus traps, no proper ARIA in custom dropdowns)
- No keyboard navigation in search suggestions (SoftwareHouseTopNavbar)
- Raw `document.addEventListener('mousedown')` click-outside handlers
- Inconsistent z-index values (z-40, z-50, z-[60], z-[100], z-[500], z-[9999])

---

## 2. TARGET ARCHITECTURE

```
src/
├── lib/
│   └── utils.js                   ← cn() helper (clsx + tailwind-merge)
│
├── hooks/
│   ├── useFullscreen.js           ← extracted (was 40-line copy-paste ×3)
│   └── useKeyboardShortcuts.js    ← extracted from TenantOrgLayout + SupraAdminLayout
│
├── constants/
│   └── navigationConstants.js     ← NAVIGATION_ACTIONS, MENU_KEY_MODULES, SIDEBAR_SECTIONS
│
├── components/ui/                 ← shadcn/ui primitives (manually installed for CRA)
│   ├── button.jsx
│   ├── dropdown-menu.jsx
│   ├── command.jsx                ← powers CommandPalette
│   ├── dialog.jsx                 ← powers Customize modal
│   ├── sheet.jsx                  ← powers mobile sidebar drawer
│   ├── tooltip.jsx                ← powers icon rail tooltips
│   ├── avatar.jsx
│   ├── badge.jsx
│   ├── separator.jsx
│   ├── scroll-area.jsx
│   └── input.jsx
│
├── shared/components/navigation/
│   ├── Breadcrumbs.jsx            ← keep (already good)
│   ├── AppSidebar.jsx             ← NEW: replaces ClickUpSidebar.js
│   ├── SidebarNav.jsx             ← NEW: replaces inline sidebar JSX in TenantOrgLayout
│   └── [Sidebar.js / MobileMenu.js / Header.js]  ← DELETE (legacy)
│
└── features/tenant/
    ├── components/
    │   ├── TenantOrgLayout.js     ← SLIMMED: orchestration only (~250 lines)
    │   ├── TenantTopBar.jsx       ← NEW: replaces SoftwareHouseTopNavbar (shadcn DropdownMenu)
    │   └── CommandPalette.jsx     ← REWRITTEN: uses shadcn Command primitive
    ├── hooks/
    │   └── useMenuFiltering.js    ← ACTIVATE: currently dead, wire it up
    └── utils/
        └── industryMenuBuilder.js ← keep, remove dead export, remove dup mapping
```

---

## 3. SHADCN/UI SETUP FOR CRA + CRACO

shadcn/ui CLI does not support CRA. Install the primitives manually:

### Step 1 — Install dependencies
```bash
cd TWS/frontend

npm install \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-dialog \
  @radix-ui/react-tooltip \
  @radix-ui/react-avatar \
  @radix-ui/react-separator \
  @radix-ui/react-scroll-area \
  @radix-ui/react-slot \
  tailwind-merge \
  class-variance-authority \
  cmdk
```

> `clsx` already installed ✓
> `@headlessui/react` already installed ✓ (keep for Sheet/mobile drawer or replace with Radix)

### Step 2 — Create `cn()` utility
`src/lib/utils.js`
```js
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### Step 3 — Update `tailwind.config.js`
Add shadcn CSS variables layer (already using Tailwind v3 ✓):
```js
// Add to content array:
"./src/components/ui/**/*.{js,jsx}"
```

### Step 4 — Copy shadcn component source files
Get from `shadcn/ui` GitHub (MIT licensed, can copy directly):
- `src/components/ui/button.jsx`
- `src/components/ui/dropdown-menu.jsx`
- `src/components/ui/command.jsx`
- `src/components/ui/dialog.jsx`
- `src/components/ui/tooltip.jsx`
- `src/components/ui/avatar.jsx`
- `src/components/ui/badge.jsx`
- `src/components/ui/separator.jsx`
- `src/components/ui/scroll-area.jsx`
- `src/components/ui/input.jsx`
- `src/components/ui/sheet.jsx`

---

## 4. IMPLEMENTATION PLAN — PHASE BY PHASE

### Phase 1: Shared Foundation (No visual changes)
**Goal:** Extract duplicated logic. Zero UI impact.

| Task | Action | Files touched |
|---|---|---|
| P1-1 | Create `src/lib/utils.js` with `cn()` | new |
| P1-2 | Create `src/hooks/useFullscreen.js` | new |
| P1-3 | Create `src/hooks/useKeyboardShortcuts.js` | new |
| P1-4 | Create `src/constants/navigationConstants.js` | new |
| P1-5 | Wire `useMenuFiltering.js` into `TenantOrgLayout` | modify 1 file |
| P1-6 | Remove `menuKeyToModules` from `TenantOrgLayout` | modify |
| P1-7 | Remove dead `getIndustryModuleKeys()` from `industryMenuBuilder.js` | modify |
| P1-8 | Install shadcn/ui dependencies | package.json |

**Deliverables:**
```js
// useFullscreen.js
export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => { /* single source of truth */ }, []);
  return { isFullscreen, requestFullscreen, exitFullscreen };
}

// navigationConstants.js
export const NAVIGATION_ACTIONS = (tenantSlug) => [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, category: 'Navigate',
    path: `/${tenantSlug}/org/dashboard` },
  { id: 'projects',  label: 'Projects',  icon: FolderIcon, category: 'Navigate',
    path: `/${tenantSlug}/org/projects` },
  // ... all 14 actions unified in one place
];

export const MENU_KEY_MODULES = {
  hr:       ['hr', 'attendance', 'employees', 'payroll'],
  finance:  ['finance'],
  projects: ['projects'],
  // ... single source of truth
};

export const SIDEBAR_SECTIONS = [
  { label: null,      keys: ['dashboard', 'my-work'] },
  { label: 'Work',    keys: ['projects', 'clients', 'time-tracking', 'development', 'operations'] },
  { label: 'People',  keys: ['hr', 'users', 'departments', 'roles', 'permissions', 'employee-portal'] },
  { label: 'Finance', keys: ['finance', 'payroll'] },
  { label: 'Insights',keys: ['analytics', 'reports', 'audit'] },
  { label: 'Content', keys: ['documents'] },
  { label: 'Settings',keys: ['settings'] },
];
```

---

### Phase 2: Install shadcn/ui Primitives
**Goal:** Get the component library in place. Still no visual refactor.

Copy these shadcn/ui source files into `src/components/ui/`:
- `button.jsx` — used by: every nav button
- `dropdown-menu.jsx` — replaces: all custom dropdown implementations
- `command.jsx` — replaces: CommandPalette internal logic
- `dialog.jsx` — replaces: Customize modal in ClickUpSidebar
- `sheet.jsx` — replaces: Headless UI Transition in MobileMenu
- `tooltip.jsx` — replaces: custom tooltip in ClickUpSidebar
- `avatar.jsx` — for user avatars in topbar
- `badge.jsx` — notification count, shortcut order numbers
- `separator.jsx` — section dividers in sidebar
- `scroll-area.jsx` — sidebar scroll wrapper
- `input.jsx` — search inputs

No existing components changed in this phase.

---

### Phase 3: Refactor `CommandPalette.jsx`
**Goal:** Replace hand-rolled modal + filter with `cmdk` (shadcn Command primitive).

**Before (309 lines):**
- Custom modal with backdrop
- Manual keyboard handler (arrow up/down, Enter)
- Manual scroll-into-view
- Hard-coded `navigationActions` + `quickCreateActions` arrays

**After (~120 lines):**
```jsx
import { Command, CommandInput, CommandList, CommandGroup,
         CommandItem, CommandEmpty } from '../../../components/ui/command';
import { Dialog, DialogContent } from '../../../components/ui/dialog';
import { NAVIGATION_ACTIONS } from '../../../constants/navigationConstants';

const CommandPalette = ({ isOpen, onClose, tenantSlug }) => {
  const navigate = useNavigate();
  const actions = useMemo(() => NAVIGATION_ACTIONS(tenantSlug), [tenantSlug]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 max-w-xl">
        <Command>
          <CommandInput placeholder="Search pages, actions…" autoFocus />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            {['Navigate', 'Quick Create'].map(category => (
              <CommandGroup key={category} heading={category}>
                {actions.filter(a => a.category === category).map(action => (
                  <CommandItem key={action.id} onSelect={() => {
                    navigate(action.path);
                    onClose();
                  }}>
                    <action.icon className="mr-2 h-4 w-4" />
                    {action.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
};
```

**Gained:** Keyboard navigation free (cmdk handles it), accessibility, fuzzy search, grouping.

---

### Phase 4: Refactor `TenantTopBar.jsx` (replaces `SoftwareHouseTopNavbar`)
**Goal:** Replace hand-rolled dropdowns with `DropdownMenu`, `Avatar`. Remove duplicate action list.

**Before (358 lines):**
- Custom click-outside listener for suggestions
- Custom click-outside for add menu
- Fixed backdrop div for profile close
- Hard-coded `getSearchActions()` duplicating CommandPalette

**After (~180 lines):**
```jsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem,
         DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger }
  from '../../../components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';

// Search bar now just opens CommandPalette (Cmd+K style)
// No more duplicate action list — CommandPalette owns all actions

const TenantTopBar = ({ orgLogoUrl, orgName, user, onSearch, onAddAction,
                        isFullscreen, onFullscreenToggle, isDarkMode, onToggleTheme,
                        onProfile, onLogout }) => {
  const { isFullscreen, requestFullscreen, exitFullscreen } = useFullscreen(); // Phase 1 hook

  return (
    <header className="flex h-10 items-center gap-2 border-b bg-background px-3">
      {/* Logo */}
      <OrgLogo orgLogoUrl={orgLogoUrl} orgName={orgName} />

      {/* Search — opens command palette, doesn't duplicate action list */}
      <Button variant="outline" size="sm" onClick={onSearch}
        className="flex-1 max-w-xs justify-start text-muted-foreground font-normal">
        <MagnifyingGlassIcon className="mr-2 h-4 w-4" />
        Search… <kbd className="ml-auto text-[10px] opacity-50">⌘K</kbd>
      </Button>

      {/* Add quick-create dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="gap-1">
            <PlusIcon className="h-4 w-4" /> Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onAddAction('task')}>Add Task</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddAction('project')}>Create Project</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddAction('user')}>Add User</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAddAction('time')}>Log Time</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme, Fullscreen, Notifications */}
      <ThemeToggle isDarkMode={isDarkMode} onToggle={onToggleTheme} />
      <FullscreenToggle isFullscreen={isFullscreen}
        onToggle={isFullscreen ? exitFullscreen : requestFullscreen} />
      <NotificationBell />

      {/* Profile */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary-500 to-accent-500 text-white">
                {user?.fullName?.[0] ?? 'U'}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <p className="font-semibold">{user?.fullName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onProfile}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={onLogout} className="text-destructive">Sign out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
};
```

**Gained:** No more raw `mousedown` listeners, proper keyboard-navigable dropdowns, ARIA correct.

---

### Phase 5: Refactor `AppSidebar.jsx` (replaces `ClickUpSidebar`)
**Goal:** Replace custom tooltip + modal with shadcn `Tooltip` and `Dialog`.

**Before (495 lines):**
- Custom tooltip div with z-[500] hardcode
- Full-screen "More" flyout (previously fixed, now positioned)
- Custom modal for Customize
- `document.addEventListener('keydown')` for ESC

**After (~280 lines):**
```jsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
  from '../../../components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle }
  from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { ScrollArea } from '../../../components/ui/scroll-area';

// TooltipProvider wraps the whole sidebar
// Each icon button gets <Tooltip> — no custom z-index hacking
// Customize modal becomes <Dialog> — focus trap + ESC built-in
// "More" panel becomes shadcn Popover — positioned, keyboard-aware
```

---

### Phase 6: Refactor `SidebarNav.jsx` (extracted from `TenantOrgLayout`)
**Goal:** Extract the 200-line sidebar rendering block into its own component.

**New file:** `src/shared/components/navigation/SidebarNav.jsx`

```jsx
import { ScrollArea } from '../../../components/ui/scroll-area';
import { Separator } from '../../../components/ui/separator';
import { SIDEBAR_SECTIONS } from '../../../constants/navigationConstants';

const SidebarNav = ({ filteredMenuItems, expandedMenus, toggleMenuExpansion,
                      onMenuClick, isDarkMode, themeStyles }) => (
  <ScrollArea className="flex-1 py-4">
    <div className="px-3 space-y-4">
      {SIDEBAR_SECTIONS.map(section => {
        const items = filteredMenuItems.filter(i => section.keys.includes(i.key));
        if (!items.length) return null;
        return (
          <div key={section.label ?? 'main'}>
            {section.label && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest
                            text-muted-foreground select-none">
                {section.label}
              </p>
            )}
            {items.map(item => (
              <SidebarNavItem key={item.key} item={item}
                isExpanded={expandedMenus[item.key]}
                onToggle={toggleMenuExpansion}
                onNavigate={onMenuClick} />
            ))}
          </div>
        );
      })}
    </div>
  </ScrollArea>
);
```

---

### Phase 7: Slim `TenantOrgLayout.js` to orchestration only
**Goal:** Remove all extracted logic. Result: ~250 lines.

```
BEFORE (993 lines):
  - 14 useState                   → AFTER: 6 useState
  - Fullscreen logic (40 lines)   → DELETED (useFullscreen hook)
  - Keyboard shortcuts (40 lines) → DELETED (useKeyboardShortcuts hook)
  - Menu filtering (80 lines)     → DELETED (useMenuFiltering hook activated)
  - menuKeyToModules (25 lines)   → DELETED (navigationConstants)
  - Sidebar JSX (200 lines)       → DELETED (SidebarNav component)
  - Mobile sidebar JSX (100 lines)→ DELETED (Sheet component)
  - fetchUserDepartments/Permissions (70 lines) → stays (data fetching)
```

**Remaining responsibilities:**
1. Auth guard (redirect if not authenticated)
2. Fetch departments + permissions (2 API calls)
3. Compose layout shell (top bar + sidebars + content area)
4. Pass props down — nothing more

---

### Phase 8: Replace `SupraAdminLayout.js` fullscreen code
**Goal:** Use `useFullscreen` hook. Remove 50 copy-pasted lines.

```js
// Before
const [isFullscreen, setIsFullscreen] = useState(false);
useEffect(() => {
  const handleFullscreenChange = () => { ... };
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', ...);
  // etc.
}, []);
const requestFullscreen = async () => { ... };
const exitFullscreen = async () => { ... };

// After (3 lines)
import { useFullscreen } from '../../hooks/useFullscreen';
const { isFullscreen, requestFullscreen, exitFullscreen } = useFullscreen();
```

---

### Phase 9: Delete Legacy Files
After verifying `Layout.js` routes are migrated or unused:

```
DELETE: src/shared/components/layout/Layout.js     (3 sidebars at once)
DELETE: src/shared/components/navigation/Sidebar.js (legacy, only in Layout.js)
DELETE: src/shared/components/navigation/MobileMenu.js (legacy)
DELETE: src/shared/components/navigation/Header.js (legacy)
```

Check: if any route in `App.js` still uses `<Layout>`, migrate it first.

---

## 5. ISSUE-BY-ISSUE RESOLUTION MAP

| Issue | Root cause | Fix | Phase |
|---|---|---|---|
| `menuKeyToModules` × 3 | No shared constants file | `navigationConstants.js` | P1 |
| Action arrays × 2 | No shared constants file | `NAVIGATION_ACTIONS` in constants | P1 |
| Fullscreen code × 3 | No shared hook | `useFullscreen.js` | P1 |
| `useMenuFiltering` dead | Never wired up | Wire into `TenantOrgLayout` | P1 |
| God component 993 lines | No decomposition | Split into 4 units | P6+P7 |
| No keyboard nav in dropdowns | Hand-rolled dropdowns | shadcn `DropdownMenu` (Radix) | P4 |
| Custom tooltip z-index hacks | Custom tooltip div | shadcn `Tooltip` (Radix) | P5 |
| No focus trap in modals | Hand-rolled modal | shadcn `Dialog` (Radix) | P5 |
| Raw mousedown listeners | Custom click-outside | Radix dismisses automatically | P4+P5 |
| Inconsistent z-index | Ad-hoc values | Radix manages stacking context | P4+P5 |
| Legacy Layout renders 3 sidebars | Abandoned migration | Delete after P9 check | P9 |

---

## 6. ERP-SPECIFIC NAVIGATION CONSIDERATIONS

This is a multi-tenant ERP, not a generic SaaS app. The navigation must support:

### 6A. Context-aware sidebar
The sidebar already correctly hides in project workspaces (`isProjectWorkspace`). Keep this.
Enhance: the icon rail (AppSidebar) should also show project-specific tabs when in a workspace.

### 6B. Role-based visibility
The `useMenuFiltering` hook (currently dead) handles this correctly. Activating it in Phase 1 is the most impactful single change — the logic is already written and tested.

### 6C. Multi-industry support (software_house vs business vs warehouse)
`industryMenuBuilder.js` handles this. Keep it, just clean up the dead export.

### 6D. Permission-aware routing (UPR Phase 2)
The dual-path permission check (`modules` from `/me/permissions` → falls back to `userDepartments`) is correct ERP behavior. Don't simplify this. Just move it to `useMenuFiltering`.

### 6E. Tenant branding
`TenantThemeProvider` + CSS tokens are solid. Keep unchanged.

---

## 7. METRICS — BEFORE vs AFTER

| Metric | Before | After |
|---|---|---|
| Total nav LOC | ~5,100 | ~2,800 (−45%) |
| `TenantOrgLayout` LOC | 993 | ~250 (−75%) |
| Fullscreen code copies | 3 | 1 hook |
| Action array copies | 2 | 1 constant |
| `menuKeyToModules` copies | 3 | 1 constant |
| Hand-rolled `mousedown` listeners | 5 | 0 |
| Hardcoded z-index values | 8 | 0 (Radix manages) |
| Focus traps (accessibility) | 0 | 4 (Dialog, Sheet ×2, Command) |
| Keyboard nav in dropdowns | 0 | All (Radix built-in) |
| Dead files | 5 | 0 |

---

## 8. EXECUTION ORDER (Recommended)

```
Week 1 — Foundation (no visible change, safe)
  P1: Extract constants + hooks
  P2: Install shadcn/ui packages + copy component files

Week 2 — High-value components (visible but isolated)
  P3: CommandPalette rewrite (cmdk)
  P4: TenantTopBar rewrite (replaces SoftwareHouseTopNavbar)

Week 3 — Sidebar refactor
  P5: AppSidebar rewrite (replaces ClickUpSidebar)
  P6: SidebarNav extracted component

Week 4 — Layout cleanup
  P7: Slim TenantOrgLayout
  P8: Fix SupraAdminLayout fullscreen
  P9: Delete legacy files (after route audit)
```

Each phase is independently deployable and testable. No phase depends on the next being complete.

---

## 9. FILES TO CREATE (New)

| Path | Purpose | ~LOC |
|---|---|---|
| `src/lib/utils.js` | `cn()` helper | 5 |
| `src/hooks/useFullscreen.js` | Fullscreen API hook | 35 |
| `src/hooks/useKeyboardShortcuts.js` | Keyboard shortcuts hook | 40 |
| `src/constants/navigationConstants.js` | All nav data constants | 80 |
| `src/components/ui/*.jsx` | shadcn primitives (×11 files) | ~1,200 |
| `src/features/tenant/components/TenantTopBar.jsx` | Top navbar (shadcn) | ~180 |
| `src/shared/components/navigation/AppSidebar.jsx` | Icon rail (shadcn) | ~280 |
| `src/shared/components/navigation/SidebarNav.jsx` | Sidebar nav body | ~150 |

## 10. FILES TO DELETE

| Path | Why |
|---|---|
| `src/shared/components/layout/Layout.js` | Renders 3 sidebars; legacy |
| `src/shared/components/navigation/Sidebar.js` | Only in legacy Layout |
| `src/shared/components/navigation/MobileMenu.js` | Only in legacy Layout |
| `src/shared/components/navigation/Header.js` | Only in legacy Layout |
| `src/features/tenant/hooks/useMenuFiltering.js` | Dead — activate inline instead |
| `src/features/tenant/components/SoftwareHouseTopNavbar.js` | Replaced by TenantTopBar |
| `src/shared/components/navigation/ClickUpSidebar.js` | Replaced by AppSidebar |

---

*Ready to implement any phase. Start with: "implement phase 1" or "implement phase 3" etc.*
