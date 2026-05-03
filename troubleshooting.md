# Troubleshooting

Common issues and solutions for Trama development and usage.

---

## Setup and Installation

### `pnpm install` fails

**Problem:** Installation fails with permission errors or network timeouts.

**Solutions:**

1. Clear pnpm cache:
   ```bash
   pnpm store prune
   ```

2. Try installing again:
   ```bash
   pnpm install
   ```

3. If still failing, try clearing node_modules:
   ```bash
   rm -rf node_modules
   rm pnpm-lock.yaml
   pnpm install
   ```

4. Check your internet connection and npm registry status.

---

### Node version mismatch

**Problem:** `pnpm` complains about Node version or modules don't work.

**Solutions:**

1. Check your Node version:
   ```bash
   node --version
   ```
   Trama requires Node 18+.

2. If using nvm:
   ```bash
   nvm install 18
   nvm use 18
   ```

3. If using other version managers (asdf, fnm, etc.), ensure you're on Node 18+.

4. Reinstall dependencies after switching versions:
   ```bash
   pnpm install
   ```

---

### Git clone fails

**Problem:** `git clone` fails with permission or network errors.

**Solutions:**

1. Check internet connection
2. Verify SSH or HTTPS credentials:
   ```bash
   # Try HTTPS if SSH fails
   git clone https://github.com/postigodev/trama.git
   
   # Or SSH if HTTPS fails
   git clone git@github.com:postigodev/trama.git
   ```

3. If SSH fails, add your SSH key to GitHub:
   - Visit https://github.com/settings/keys
   - Add your public key

---

## Development Server

### `pnpm dev` fails to start

**Problem:** Dev server crashes or won't start.

**Solutions:**

1. Check for port conflicts (default: 5173):
   ```bash
   # On macOS/Linux
   lsof -i :5173
   
   # On Windows
   netstat -ano | findstr :5173
   ```

2. Kill the process using the port:
   ```bash
   # macOS/Linux
   kill -9 <PID>
   
   # Windows
   taskkill /PID <PID> /F
   ```

3. Try a different port:
   ```bash
   pnpm dev -- --port 5174
   ```

4. Check for missing environment variables:
   ```bash
   # Verify .env.local exists (if needed for your work)
   ls -la .env.local
   ```

---

### Hot reload not working

**Problem:** Changes don't hot reload in dev mode.

**Solutions:**

1. Verify you're editing files in the correct directory (e.g., `apps/desktop/src/` for UI changes).

2. For some file types (config, types), hot reload may not work. Restart dev server:
   ```bash
   Ctrl+C to stop
   pnpm dev to restart
   ```

3. Check if your IDE is saving files properly.

4. Try clearing the build cache:
   ```bash
   rm -rf dist/
   pnpm dev
   ```

---

### High CPU or memory usage in dev mode

**Problem:** Dev server consumes excessive resources.

**Solutions:**

1. Close other heavy applications.

2. Rebuild once to ensure dependencies are correct:
   ```bash
   pnpm install
   pnpm build
   ```

3. If using many packages, you can run individual packages:
   ```bash
   # Instead of pnpm dev (which may build all), try building one:
   pnpm -F apps/desktop dev
   ```

4. Check for infinite loops or heavy computations in recent code changes.

---

## Demo Mode

### Demo Mode doesn't load

**Problem:** Demo Mode shows error or no mock data appears.

**Solutions:**

1. Verify demo fixtures are imported:
   ```bash
   pnpm -F packages/demo-fixtures test
   ```

2. Check console (Dev Tools or terminal) for errors:
   ```
   Look for error messages starting with "Demo"
   ```

3. Ensure fixtures are valid by checking `packages/demo-fixtures/`:
   ```bash
   ls packages/demo-fixtures/src/
   ```

4. If fixtures were recently changed, rebuild:
   ```bash
   pnpm -F packages/demo-fixtures build
   pnpm dev
   ```

---

## Database Issues

### Database file not found or corrupted

**Problem:** App crashes with database errors or "cannot open database file".

**Solutions:**

1. Check where the database is stored on your system:
   ```txt
   macOS:    ~/Library/Application Support/com.trama.app
   Linux:    ~/.config/trama
   Windows:  %APPDATA%/trama/data
   ```

2. Delete corrupted database (you'll lose local session history):
   ```bash
   # macOS/Linux
   rm ~/.config/trama/trama.db
   
   # Windows
   del %APPDATA%\trama\data\trama.db
   ```

3. Restart the app. A new database will be created.

---

### Migration errors

**Problem:** App fails with "migration version mismatch" or schema errors.

**Solutions:**

1. If you're switching between branches with different schemas, the database may be incompatible.

2. Delete the old database:
   ```bash
   # See database location above
   rm [database-path]/trama.db
   ```

3. Restart the app to create a fresh database.

4. If working on migrations, check that your migration files are valid:
   ```bash
   ls packages/db/src/migrations/
   ```

---

## Spotify Integration

### Spotify auth fails with "Invalid Client"

**Problem:** Spotify connection shows "Invalid Client ID" or "Client Not Found".

**Solutions:**

1. Verify your Spotify Developer app:
   - Visit https://developer.spotify.com/dashboard
   - Create a new app if needed

2. Check your `.env.local`:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_client_id_here
   ```
   Make sure the ID matches exactly (copy-paste from dashboard).

3. Verify redirect URI in your Spotify app settings:
   ```
   http://127.0.0.1:5173/auth/spotify/callback
   ```
   (The port should match your dev server port.)

4. Restart dev server after updating `.env.local`:
   ```bash
   Ctrl+C
   pnpm dev
   ```

---

### Spotify auth fails with "Redirect URI mismatch"

**Problem:** Browser shows "The redirect_uri you provided does not match".

**Solutions:**

1. Your Spotify app settings must list the exact redirect URI.

2. Check both places:
   - Spotify Dashboard → Your App → Redirect URIs
   - `.env.local` → VITE_SPOTIFY_REDIRECT_URI

3. They must match exactly, including port and protocol:
   ```
   http://127.0.0.1:5173/auth/spotify/callback
   ```
   Not:
   ```
   http://localhost:5173/auth/spotify/callback  ✗ (different domain)
   https://127.0.0.1:5173/auth/spotify/callback ✗ (wrong protocol)
   ```

4. Update your `.env.local` and restart the dev server.

---

### Spotify connection succeeds but playback fails

**Problem:** "Start playback and try again" or queue insertion fails.

**Solutions:**

1. Spotify Premium may be required for add-to-queue. Use a Premium account or test in Demo Mode.

2. Start playback in Spotify (a different app):
   - Open Spotify desktop, web, or mobile
   - Start playing a song
   - Return to Trama and try again

3. Check if your account is allowlisted for your Spotify Developer app:
   - For development-mode apps, Spotify limits users
   - Add your Spotify email to the allowlist in the Dashboard

4. If errors persist, check the browser console for specific Spotify API errors.

---

### Spotify adapter gets 403 Forbidden

**Problem:** Requests to Spotify fail with 403 (Forbidden).

**Solutions:**

1. Your Spotify account may not be allowlisted. Verify in the Spotify Dashboard:
   - Go to your app settings
   - Check "Users and Access" or "Testing users"
   - Add your Spotify email if not already listed

2. Check your scopes are correct in `.env.local` or config.

3. Try refreshing the Spotify connection:
   - Log out of Trama
   - Close the browser session
   - Log back in

4. If your app is in development mode, Spotify may have daily rate limits. Wait and try again later.

---

## Tests

### Tests fail to run

**Problem:** `pnpm test` exits with errors.

**Solutions:**

1. Clear test cache:
   ```bash
   pnpm test -- --clearCache
   ```

2. Ensure all dependencies are installed:
   ```bash
   pnpm install
   ```

3. Check for syntax errors in test files:
   ```bash
   pnpm lint
   ```

4. Try running tests for one package:
   ```bash
   pnpm -F packages/core test
   ```

---

### Tests timeout

**Problem:** Tests hang or timeout.

**Solutions:**

1. Increase the timeout in your test configuration (jest.config.js or vitest.config.ts).

2. Check for infinite loops or unresolved promises in test code.

3. For async tests, ensure promises resolve:
   ```typescript
   it('should do something', async () => {
     const result = await asyncFunction();
     expect(result).toBeDefined();
   });
   ```

4. Kill the test process and try again:
   ```bash
   pnpm test
   ```

---

## Linting and Type Checking

### Lint fails with style errors

**Problem:** `pnpm lint` reports formatting or style issues.

**Solutions:**

1. Auto-fix issues:
   ```bash
   pnpm lint --fix
   ```

2. If you prefer to fix manually, lint output shows line numbers:
   ```
   src/index.ts:5:2: error: unexpected spaces
   ```

3. Check your editor's ESLint plugin to see issues inline (VS Code, etc.).

---

### Type checking fails

**Problem:** `pnpm typecheck` reports TypeScript errors.

**Solutions:**

1. Read the error message carefully. Example:
   ```
   src/index.ts:10:5 - error TS7006: Parameter 'x' implicitly has an 'any' type.
   ```

2. Add type annotations:
   ```typescript
   // Before
   const fn = (x) => x + 1;
   
   // After
   const fn = (x: number) => x + 1;
   ```

3. If the error is in a dependency, check tsconfig.json.

4. For complex types, use `as` carefully:
   ```typescript
   const value = someFunction() as MyType;
   ```

---

## Performance

### Ranking is slow

**Problem:** Getting next recommendations takes too long.

**Solutions:**

1. Check how many candidates are being scored:
   - Use Lab Mode to view candidate count
   - Reducing candidates improves speed

2. Profile the ranking function (for developers):
   ```typescript
   console.time('rankCandidates');
   rankCandidates(candidates, session);
   console.timeEnd('rankCandidates');
   ```

3. Check for expensive computations in scoring functions (e.g., nested loops).

4. For Demo Mode, ensure mock data is reasonable size.

---

### UI is laggy

**Problem:** UI feels slow or unresponsive.

**Solutions:**

1. Check if ranking is blocking the UI (see above).

2. Use browser Dev Tools → Performance tab to profile:
   - Look for long JavaScript tasks
   - Check for excessive re-renders

3. Ensure React components use `useMemo` or `useCallback` if needed.

4. Check for large lists without virtualization.

---

## Build Issues

### Build fails

**Problem:** `pnpm build` exits with errors.

**Solutions:**

1. Check type errors first:
   ```bash
   pnpm typecheck
   ```

2. Check lint errors:
   ```bash
   pnpm lint
   ```

3. Clear build artifacts:
   ```bash
   pnpm clean  # if defined in package.json
   rm -rf dist/
   ```

4. Reinstall dependencies:
   ```bash
   pnpm install
   ```

5. Try building one package at a time:
   ```bash
   pnpm -F packages/core build
   ```

---

### Build succeeds but app doesn't work

**Problem:** App builds but crashes at runtime.

**Solutions:**

1. Check browser console for runtime errors.

2. Verify environment variables are set during build (if needed):
   ```bash
   VITE_SPOTIFY_CLIENT_ID=xxx pnpm build
   ```

3. Check that all imports exist:
   ```bash
   pnpm typecheck
   ```

4. Review recent code changes for missing exports or imports.

---

## Platform-Specific Issues

### macOS: App won't start

**Problem:** Tauri app fails to launch on macOS.

**Solutions:**

1. Ensure Rust is installed:
   ```bash
   rustc --version
   ```

2. If using Apple Silicon (M1/M2), check arch:
   ```bash
   uname -m
   ```
   Should be `arm64`. If not, you may need Rosetta or different setup.

3. Check system logs:
   ```bash
   log show --predicate 'process == "Trama"' --last 1h
   ```

---

### Windows: Building fails

**Problem:** Build errors on Windows (usually Tauri-related).

**Solutions:**

1. Ensure you have C++ build tools installed:
   - Install "Desktop development with C++" from Visual Studio Installer

2. Restart your terminal and try again:
   ```bash
   pnpm build
   ```

3. Check Windows Defender doesn't block compilation.

---

### Linux: Permission errors

**Problem:** "Permission denied" when building or running.

**Solutions:**

1. Ensure you own the trama directory:
   ```bash
   sudo chown -R $(whoami) ~/trama
   ```

2. Try installing with sudo (not recommended, but as last resort):
   ```bash
   sudo pnpm install
   ```

3. Check file permissions:
   ```bash
   ls -la packages/
   ```

---

## Architecture and Code Issues

### "Core engine imports provider-specific code" error

**Problem:** Your linter or reviewer flags this violation.

**Cause:** You accidentally imported Spotify-specific types or functions into `packages/core/`.

**Solution:**

1. Review your imports in `packages/core/`:
   ```typescript
   // ✗ Bad
   import { SpotifyTrack } from '@trama/spotify-adapter';
   
   // ✓ Good
   import { CandidateTrack } from '@trama/core';
   ```

2. Convert provider objects to Trama types at the adapter boundary.

3. See `docs/architecture.md` for boundaries.

---

### "UI contains ranking logic" warning

**Problem:** Ranking or scoring happens inside a React component.

**Cause:** Business logic should not live in presentational code.

**Solution:**

1. Move ranking logic to `packages/core/`.

2. Have the component call a service or hook:
   ```typescript
   // ✗ Bad: ranking inside component
   const candidates = originalCandidates.sort((a, b) => 
     a.similarity - b.similarity
   );
   
   // ✓ Good: call ranking function
   const candidates = rankCandidates(originalCandidates, session);
   ```

3. See `docs/architecture.md` for proper boundaries.

---

## Getting More Help

### Check documentation

1. `README.md` - Project overview
2. `CONTRIBUTING.md` - Contribution guidelines
3. `docs/architecture.md` - System design
4. `docs/ranking-engine.md` - Ranking logic
5. `local-dev-setup.md` - This setup guide

### Check existing issues

Search GitHub issues for similar problems:
https://github.com/postigodev/trama/issues

### Open a new issue

If you can't find a solution:

1. Include:
   - Your OS and Node version
   - What you tried
   - Full error message
   - Steps to reproduce

2. Tag appropriately (e.g., `bug`, `help wanted`, `setup`)

---

## Quick Reference: Common Commands

```bash
# Setup
git clone https://github.com/postigodev/trama.git
cd trama
pnpm install

# Development
pnpm dev           # Start dev server
pnpm test          # Run tests
pnpm lint          # Check code style
pnpm typecheck     # Check types

# Building
pnpm build         # Build all packages

# Cleanup
rm -rf node_modules pnpm-lock.yaml
pnpm install       # Clean reinstall
```

---

## Still stuck?

1. Re-read the relevant documentation
2. Search existing issues
3. Ask in GitHub discussions
4. Check Discord/community channels if available
