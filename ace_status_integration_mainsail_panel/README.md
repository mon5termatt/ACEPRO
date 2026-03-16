# ACE Status — Mainsail Dashboard Panel

This is a **duplicate** of the ACE status integration, modified to provide a **compact panel** that fits on the main Mainsail dashboard (similar in concept to the [AFC-Klipper-Add-On](https://github.com/ArmoredTurtle/AFC-Klipper-Add-On) Mainsail integration).

The **original** files in `ace_status_integration/` are left unchanged. This folder contains only the panel-specific web assets and instructions.

## What you get

- **Compact ACE panel**: device status, dryer, slot strip (Load per slot), and quick actions in a single card-style layout.
- **Dashboard-friendly**: designed to be embedded as an iframe or opened in a panel so it fits alongside other Mainsail dashboard widgets.
- **Same backend**: uses the same Moonraker component and API as the full ACE dashboard (`/server/ace/status`, `/server/ace/command`). You do **not** need to duplicate the Moonraker component.

## Prerequisites

1. **Moonraker ACE status component** already installed (from the main `ace_status_integration`):
   - `ace_status_integration/moonraker/ace_status.py` → symlinked into `~/moonraker/moonraker/components/ace_status.py`
   - `[ace_status]` configured in `moonraker.conf`
2. **Mainsail** installed and serving from a directory (e.g. `~/mainsail`).

## Installation

### 1. Link the panel files into Mainsail

From your ACEPRO repo root, symlink the panel assets into your Mainsail directory so they are served at the same origin (required for API/WebSocket):

```bash
# Set your Mainsail path if different
MAINSAIL_DIR=~/mainsail
REPO_DIR=~/ACEPRO

ln -sf "$REPO_DIR/ace_status_integration_mainsail_panel/web/ace-panel.html" "$MAINSAIL_DIR/ace-panel.html"
ln -sf "$REPO_DIR/ace_status_integration_mainsail_panel/web/ace-panel.js"    "$MAINSAIL_DIR/ace-panel.js"
ln -sf "$REPO_DIR/ace_status_integration_mainsail_panel/web/ace-panel.css"   "$MAINSAIL_DIR/ace-panel.css"
ln -sf "$REPO_DIR/ace_status_integration_mainsail_panel/web/ace-panel-config.js" "$MAINSAIL_DIR/ace-panel-config.js"
```

If you already have the full ACE dashboard linked (`ace.html`, `ace-dashboard.js`, etc.), the panel uses its own filenames (`ace-panel.*`) so both can coexist.

### 2. Add the panel to the Mainsail dashboard

Mainsail does not have a built-in “custom URL” panel type like AFC’s native integration. You can still put the ACE panel on the dashboard in one of these ways:

#### Option A: Iframe panel (if your setup supports it)

Some Mainsail setups or custom themes allow adding a panel that loads a URL in an iframe. If you have that option:

1. In Mainsail go to **Settings → Dashboard** (or **Interface Settings → Dashboard**).
2. Add a new panel.
3. Choose the option that lets you set a **URL** or **iframe** (e.g. “Webcam” with a custom URL, or “Custom” if available).
4. Set the URL to the panel page, same origin as Mainsail, e.g.:
   - `./ace-panel.html`  
   - or `https://your-mainsail-host/ace-panel.html`

The panel is sized to work inside an iframe (compact layout, no full-page chrome).

#### Option B: Direct link on the dashboard

1. Add a **“Custom”** or **“Link”** panel (if your Mainsail version offers it) that points to `ace-panel.html`.
2. Or add a panel that opens a new tab/window to `/ace-panel.html` so the ACE panel is one click away from the main dashboard.

#### Option C: Sidebar tab (recommended)

Add **ACE** as a tab on the left sidebar using Mainsail’s **Custom Navigation**. See [Add ACE as a tab in the left sidebar](#add-ace-as-a-tab-in-the-left-sidebar) below.

### 3. Add ACE as a tab in the left sidebar

Mainsail supports [Custom Navigation](https://docs.mainsail.xyz/overview/features/themes/custom-navigation): you can add your own items to the left sidebar (same place as Dashboard, Webcam, Console, etc.).

1. In Mainsail, open **Settings** (gear icon).
2. Go to **General** (or **Interface** / **Theme**, depending on your Mainsail version).
3. Find **Custom navigation** (or **Custom Navigation** / **Custom menu links**). It may be under a “Theme” or “Customization” subsection.
4. You’ll see a JSON array (or a form that builds it). **Add** one of the following entries (or merge with existing ones).

   **ACE Panel only (compact):**
   ```json
   {
     "title": "ACE Panel",
     "href": "/ace-panel.html",
     "target": "_self",
     "position": 25,
     "icon": "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2M12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
   }
   ```

   **Full ACE dashboard only:**
   ```json
   {
     "title": "ACE",
     "href": "/ace.html",
     "target": "_self",
     "position": 25,
     "icon": "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2M12 20c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"
   }
   ```

   **Both** (panel + full dashboard): use an array with two items, e.g.:
   ```json
   [
     { "title": "ACE Panel", "href": "/ace-panel.html", "target": "_self", "position": 25 },
     { "title": "ACE Full", "href": "/ace.html", "target": "_self", "position": 26 }
   ]
   ```

5. If your Custom navigation already has other entries, **merge** this with the existing array (add the new object(s) to the array). Valid format is always a **JSON array** of objects.
6. Save. The new tab(s) appear on the left sidebar. Default positions are in steps of 10 (Dashboard 10, Webcam 20, Console 30, …), so `position: 25` places ACE between Webcam and Console; change as you like.

- **`target: "_self"`** — open in the same tab (recommended so the ACE panel replaces the current view).
- **`target: "_blank"`** — open in a new tab.
- **`icon`** — optional; the value above is a clock-style icon (Material Design Icons path). You can omit `icon` for a text-only label, or pick another path from [pictogrammers.com/library/mdi](https://pictogrammers.com/library/mdi/).

A ready-to-paste JSON file with one entry is in `web/mainsail-custom-nav-ace.json` in this folder.

### 4. Open full dashboard

From the panel, use the **“Open full dashboard”** link to open the full ACE dashboard (`ace.html`) for full slot editing, color picker, feed/retract dialogs, etc.

## File layout (this folder)

```
ace_status_integration_mainsail_panel/
├── README.md                           # This file
└── web/
    ├── ace-panel.html                  # Panel page (compact layout)
    ├── ace-panel.js                    # Panel Vue app (same API as full dashboard)
    ├── ace-panel.css                   # Compact card styling
    ├── ace-panel-config.js             # API base URL etc. (same pattern as ace-dashboard-config.js)
    └── mainsail-custom-nav-ace.json    # Ready-to-paste Custom Navigation entry for Mainsail sidebar
```

No Moonraker component is duplicated; the panel talks to the same `ace_status` component as the full dashboard.

## Configuration

Edit `ace-panel-config.js` (or the copy in Mainsail) if you need a fixed API base URL instead of `window.location.origin`. Same options as the full dashboard config.

## Reference

- Full ACE dashboard: `ace_status_integration/web/ace.html`
- [AFC-Klipper-Add-On](https://github.com/ArmoredTurtle/AFC-Klipper-Add-On) — Mainsail integration concept
- [Mainsail](https://www.mainsail.xyz/) — web interface
