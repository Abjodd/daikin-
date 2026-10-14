# Daikin – Base App (Portal)

Login page + landing page with a tile for each application. Runs on **http://localhost:5173**.

```bash
npm install
npm run dev
```

## Login (demo / hardcoded)

| Username   | Password       | Name / email                          | Role                 |
|------------|----------------|---------------------------------------|----------------------|
| arbeel     | arbeel123      | Arbeel Wani · waniarbeel786@gmail.com | Portal Administrator |
| supplier   | Supplier@123   | Ritik Patra · supplier@daikin.com     | Supplier             |

You can sign in with either the username or the email.

Users live in `src/config/users.js`. The session is kept in `localStorage`
(`daikin.session`) so a refresh keeps you signed in; **Sign out** is in the user menu (top right).

> ⚠️ This is demo-only auth. Before going live, replace the body of `login()` in
> `src/auth/AuthContext.jsx` with a call to your real auth API and delete `users.js`.

## Structure

```
src/
├── auth/AuthContext.jsx     # login / logout / current user (React context)
├── components/
│   ├── Navbar.jsx           # sticky top bar + pill-shaped nav
│   ├── UserMenu.jsx         # avatar, name, role + dropdown (profile, sign out)
│   ├── AppTile.jsx          # one application tile
│   ├── Footer.jsx
│   └── Icons.jsx            # inline SVG icon set
├── config/
│   ├── apps.js              # tiles + their URLs (from .env)
│   └── users.js             # hardcoded demo users
├── data/dashboard.js        # sample KPIs, activity, announcements
├── pages/
│   ├── LoginPage.jsx
│   └── LandingPage.jsx
├── styles/
│   ├── global.css           # design tokens (colours, radius, shadows, font)
│   ├── login.css
│   └── landing.css
├── App.jsx                  # shows Login until signed in, then Landing
└── main.jsx
```

App URLs are read from `.env` (see `.env.example`); if not set, localhost defaults are used.
