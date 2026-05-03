# Testing Best Practices for Trama

## Overview

All tests in Trama use **Vitest** with a consistent pattern across packages.

## Test Organization

Tests live alongside source code:

```
packages/core/src/
  ├── session.ts
  ├── session.test.ts
  ├── ranking.ts
  └── ranking.test.ts
```

Or in a dedicated `__tests__` directory for larger packages:

```
packages/core/src/
  ├── session.ts
  ├── ranking.ts
  └── __tests__/
      ├── session.test.ts
      └── ranking.test.ts
```

## Writing Tests

### Basic Pattern

```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../myModule';

describe('myModule', () => {
  it('should do the expected thing', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Fixture Pattern

For reusable test data, create fixtures:

```typescript
// packages/core/src/__tests__/fixtures.ts
export const mockSession = {
  id: 'session-1',
  completions: [],
  skips: [],
  feedback: {},
};

export const mockCandidates = [
  { id: 'track-1', title: 'Song A', duration: 180 },
  { id: 'track-2', title: 'Song B', duration: 200 },
];
```

Then import and use:

```typescript
import { mockSession, mockCandidates } from './fixtures';

describe('ranking', () => {
  it('should rank candidates', () => {
    const result = rankCandidates(mockCandidates, mockSession);
    expect(result.length).toBe(2);
  });
});
```

## Testing Ranking Logic

When testing the ranking engine, always verify:

1. **Scores are calculated**
   ```typescript
   expect(ranked[0].score).toBeGreaterThan(0);
   ```

2. **Reasons are provided**
   ```typescript
   expect(ranked[0].reasons.length).toBeGreaterThan(0);
   ```

3. **Behavior is deterministic**
   ```typescript
   const result1 = rankCandidates(candidates, session);
   const result2 = rankCandidates(candidates, session);
   expect(result1).toEqual(result2);
   ```

4. **Edge cases are handled**
   ```typescript
   expect(rankCandidates([], session)).toEqual([]);
   ```

## Running Tests

### Run all tests
```bash
pnpm test
```

### Run tests for a specific package
```bash
pnpm -F packages/core test
```

### Run in watch mode
```bash
pnpm test --watch
```

### Run with coverage
```bash
pnpm test --coverage
```

## Coverage Goals

Target minimum coverage per package:

- **@trama/core**: 80% (business logic is critical)
- **@trama/db**: 70% (repository layer)
- **@trama/demo-fixtures**: 60% (test data)
- **@trama/spotify-adapter**: 70% (needs external API mocking)
- **@trama/shared**: 80% (utilities)

## Mocking Strategies

### Mock External APIs

```typescript
import { vi } from 'vitest';

vi.mock('@trama/spotify-adapter', () => ({
  createSpotifyClient: vi.fn(() => ({
    getCurrentPlayback: vi.fn(() => Promise.resolve({})),
  })),
}));
```

### Mock Database

```typescript
const mockDb = {
  prepare: vi.fn(),
  exec: vi.fn(),
};
```

## Testing Database Code

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('SessionRepository', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Use in-memory database for tests
    db = new Database(':memory:');
    setupSchema(db);
  });

  it('should create a session', () => {
    const repo = new SessionRepository(db);
    repo.create('session-1');
    const session = repo.find('session-1');
    expect(session.id).toBe('session-1');
  });
});
```

## CI/CD Integration

Tests run automatically on:
- Every push to `main` or `develop`
- Every PR to `main` or `develop`

Test must pass before merging.

## Debugging Tests

### Run a single test
```bash
pnpm test session.test.ts
```

### Run tests matching a pattern
```bash
pnpm test --grep "ranking"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Vitest",
  "runtimeExecutable": "pnpm",
  "runtimeArgs": ["test", "--inspect-brk", "--no-coverage"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Best Practices

1. **One assertion per test** (or closely related assertions)
2. **Descriptive test names** — use `should` pattern
3. **Arrange-Act-Assert** — setup, execute, verify
4. **No test dependencies** — tests should run in any order
5. **Mock external dependencies** — keep tests fast and isolated
6. **Test behavior, not implementation** — focus on inputs and outputs
7. **Keep fixtures minimal** — only what's needed for the test

## Adding Tests to Existing Code

When adding tests to a module without them:

1. Create test file next to source
2. Start with the most critical functions
3. Use fixtures for shared test data
4. Aim for 70%+ coverage initially
5. Expand as you refactor
