# Daikin Supplier Portal

A mono-repo containing **four independent React (Vite) projects**:

| Folder                    | What it is                                   | Dev URL               |
|---------------------------|----------------------------------------------|-----------------------|
| `base-app/`               | Landing page with a tile for each app        | http://localhost:5173 |
| `advance-shipment-notes/` | Advance Shipment Notes (ASN)                 | http://localhost:5174 |
| `schedule-release/`       | Schedule Release                             | http://localhost:5175 |
| `purchase-order/`         | Purchase Order                               | http://localhost:5176 |

Each folder has its own `package.json`, `node_modules`, build and README, so any
app can be developed, built and deployed on its own.

## Folder structure

```
daikin/
├── README.md
├── package.json              # helper scripts to run/build everything at once
├── .gitignore
├── base-app/
│   ├── public/favicon.svg
│   ├── src/
│   │   ├── components/       # Header, Footer, AppTile
│   │   ├── config/apps.js    # list of tiles + their URLs
│   │   ├── pages/            # LandingPage
│   │   ├── styles/           # global.css
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── advance-shipment-notes/
│   ├── src/
│   │   ├── components/       # Header, DataTable, StatusBadge, SummaryCards
│   │   ├── config/app.js     # app name + portal URL
│   │   ├── data/mockData.js  # sample data
│   │   ├── pages/            # ListPage
│   │   ├── services/api.js   # swap in real API calls here
│   │   └── styles/
│   └── ... (same files as base-app)
├── schedule-release/         # same structure
└── purchase-order/           # same structure
```

## Running locally

Requires Node.js 20.19+ (or 22.12+).

**Everything at once** (from the `daikin/` folder):

```bash
npm install          # installs the 'concurrently' helper
npm run install:all  # installs each app's dependencies
npm run dev          # starts all four apps
```

Then open http://localhost:5173 and click a tile.

**One app only:**

```bash
cd purchase-order
npm install
npm run dev
```

## How the apps are linked

- The portal's tiles are defined in `base-app/src/config/apps.js`. Each tile's URL
  comes from an env variable (`VITE_ASN_URL`, `VITE_SCHEDULE_RELEASE_URL`,
  `VITE_PURCHASE_ORDER_URL`) and falls back to the localhost port above.
- Each child app has a "Back to Portal" link using `VITE_PORTAL_URL`.
- For staging/production, copy `.env.example` to `.env` in each app and set the
  real URLs before running `npm run build`.

## Adding a new app

1. Copy one of the child app folders and rename it.
2. Change `name` in its `package.json`, the port in `vite.config.js` and the name in `src/config/app.js`.
3. Add an entry to `base-app/src/config/apps.js` (and its env variable).
4. Add the folder to the scripts in the root `package.json`.

## Building

```bash
npm run build:all    # each app outputs to its own dist/ folder
```
