# Local Development Setup

This guide walks you through setting up Trama for local development.

---

## Prerequisites

Before starting, make sure you have:

```txt
Node.js 18+
pnpm 8+ (package manager)
Git
SQLite3 (usually included)
```

For Tauri desktop app development, you may need:

```txt
Rust toolchain
Platform-specific build tools (see Tauri docs)
```

### Installing pnpm

If you don't have pnpm installed:

```bash
npm install -g pnpm
```

Verify:

```bash
pnpm --version
```

---

## Cloning the repository

```bash
git clone https://github.com/postigodev/trama.git
cd trama
```

---

## Installing dependencies

From the project root:

```bash
pnpm install
```

This installs dependencies for all workspaces (packages and apps).

---

## Project structure

After setup, your directory should look like:

```txt
trama/
├── apps/
│   └── desktop/              # Tauri + React desktop app
├── packages/
│   ├── core/                 # Ranking engine
│   ├── db/                   # Database & migrations
│   ├── spotify-adapter/      # Spotify integration (optional)
│   ├── demo-fixtures/        # Mock data for testing
│   └── shared/               # Shared utilities
├── docs/                     # Documentation
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
└── package.json
```

---

## Running in development mode

### Option 1: Demo Mode (recommended for getting started)

Demo Mode works without Spotify setup:

```bash
pnpm dev
```

This starts the desktop app in development mode with mock data and mock sessions.

You should be able to:
- See demo tracks and sessions
- Test the ranking engine
- Interact with feedback buttons
- View recommendation explanations
- All without any external API setup

### Option 2: With Spotify integration

If you want to work on Spotify adapter features:

1. [Create a Spotify Developer app](https://developer.spotify.com/dashboard)
2. Add a local redirect URI in your app settings:
   ```
   http://127.0.0.1:5173/auth/spotify/callback
   ```
3. Copy your Client ID
4. Create a `.env.local` file in the project root:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   ```
5. Run:
   ```bash
   pnpm dev
   ```

---

## Running tests

### Run all tests

```bash
pnpm test
```

### Run tests for a specific package

```bash
pnpm -F packages/core test
pnpm -F apps/desktop test
```

### Run tests in watch mode

```bash
pnpm test --watch
```

### Test coverage

Some packages may support coverage:

```bash
pnpm test --coverage
```

---

## Linting and formatting

### Lint all packages

```bash
pnpm lint
```

### Fix lint issues

```bash
pnpm lint --fix
```

### Type checking

```bash
pnpm typecheck
```

---

## Building for production

### Build all packages

```bash
pnpm build
```

### Build specific packages

```bash
pnpm -F packages/core build
pnpm -F apps/desktop build
```

---

## Database setup

Trama uses local SQLite for session tracking.

### Initialize database

The database is created automatically on first run.

### Database location

By default, the database is stored locally in the app's data directory.

On different platforms:

```txt
macOS:    ~/Library/Application Support/com.trama.app
Linux:    ~/.config/trama
Windows:  %APPDATA%/trama/data
```

### Database migrations

If you make schema changes, migrations are handled automatically.

To create a new migration:

```bash
pnpm -F packages/db migration:create --name your_migration_name
```

---

## Common development tasks

### Add a new ranking scoring function

1. Create the function in `packages/core/src/scoring/`
2. Add tests in `packages/core/src/scoring/__tests__/`
3. Export from `packages/core/src/index.ts`
4. Update `docs/ranking-engine.md` if needed
5. Run tests:
   ```bash
   pnpm -F packages/core test
   ```

### Add a new UI component

1. Create the component in `apps/desktop/src/components/`
2. Add stories or test fixtures if applicable
3. Import in relevant pages/layouts
4. Test in Demo Mode:
   ```bash
   pnpm dev
   ```

### Add demo fixtures

1. Create mock data in `packages/demo-fixtures/src/`
2. Export from `packages/demo-fixtures/src/index.ts`
3. Use in demo scenarios
4. Test fixtures:
   ```bash
   pnpm -F packages/demo-fixtures test
   ```

### Work on Spotify adapter

1. Read `docs/spotify-integration.md`
2. Set up your Spotify Developer app
3. Add to `.env.local`
4. Implement in `packages/spotify-adapter/`
5. Test manually with `pnpm dev`
6. Add integration tests where possible

---

## Environment variables

### Development environment file

Create `.env.local` in the project root:

```env
# Spotify (optional, only if working on Spotify adapter)
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://127.0.0.1:5173/auth/spotify/callback

# Demo mode (usually enabled by default)
VITE_DEMO_MODE=true
```

Never commit `.env.local` or any file with real credentials.

---

## Workspaces commands

Trama uses pnpm workspaces. Helpful commands:

### Run a command in a specific package

```bash
pnpm -F packages/core test
pnpm -F apps/desktop build
pnpm -F @trama/demo-fixtures lint
```

### Run a command in all packages

```bash
pnpm -r test
pnpm -r lint
```

### Add a dependency to a specific package

```bash
pnpm add lodash -F packages/core
```

---

## Debugging

### Debug mode in desktop app

The desktop app includes a Dev Tools panel for debugging:

- Right-click → Inspect (in development)
- View console for logs
- Check network tab for API calls
- Use Lab Mode to inspect ranking internals

### Console logging

Add logs in your code:

```typescript
console.log('Debug info:', value);
```

Visible in terminal (if running dev server) or Dev Tools.

### Database debugging

Inspect local SQLite database:

```bash
# On macOS/Linux
sqlite3 ~/.config/trama/trama.db

# On Windows
sqlite3 %APPDATA%\trama\data\trama.db
```

Then in SQLite:

```sql
.tables
SELECT * FROM sessions LIMIT 5;
SELECT * FROM events LIMIT 10;
```

---

## Troubleshooting setup issues

See `troubleshooting.md` for common issues and solutions.

---

## Next steps

After setup:

1. Read `CONTRIBUTING.md` to understand contribution guidelines
2. Check `docs/architecture.md` for project structure
3. Look at `AGENTS.md` if using AI tools for development
4. Start with a `good first issue` if you want to contribute
5. Use Demo Mode to explore the application

---

## Getting help

If you run into issues:

1. Check `troubleshooting.md`
2. Search existing issues on GitHub
3. Open a new issue with:
   - What you tried
   - What went wrong
   - Your OS and Node version
   - Relevant error messages
