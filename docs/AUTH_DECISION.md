# Authentication Decision Record

## Current State

- **Package**: `next-auth@5.0.0-beta.30`
- **API Version**: NextAuth.js v5 (Auth.js)
- **Session Strategy**: JWT
- **Provider**: Credentials (email/password with bcrypt)

## Why We Keep v5 Beta

### 1. No Stable v5 Release Exists

As of December 2025, NextAuth v5 has **not been released as stable** on npm:
- `latest` tag: `4.24.13` (v4 - legacy API)
- `beta` tag: `5.0.0-beta.30` (v5 - current)

The v5 API is fundamentally different from v4. Downgrading would require:
- Rewriting `auth.ts` configuration
- Changing middleware approach
- Updating all ~50+ RBAC test files
- Modifying API route patterns

### 2. v5 Beta is Production-Ready

Despite the "beta" label:
- The API is stable and well-documented
- Used in production by many projects
- Auth.js team recommends it for new projects
- No breaking changes expected before stable release

### 3. Migration Cost vs Risk

| Option | Effort | Risk |
|--------|--------|------|
| Stay v5 beta | None | Low (API stable) |
| Downgrade v4 | High (~50 files) | Medium (legacy patterns) |

## Version Lock Strategy

We pin the exact version to prevent accidental upgrades:

```json
"next-auth": "5.0.0-beta.30"
```

**NOT**: `^5.0.0-beta.30` or `@beta`

## Migration Conditions

We will migrate to stable when:

1. **NextAuth v5 stable is published** on npm with `latest` tag
2. **No breaking changes** from current beta API
3. **Migration path documented** by Auth.js team

### Pre-Migration Checklist

Before upgrading:
- [ ] Check Auth.js changelog for breaking changes
- [ ] Review migration guide (if any)
- [ ] Run full test suite: `npm run test`
- [ ] Verify build: `npm run build`
- [ ] Test login/logout flows manually
- [ ] Test RBAC on protected routes

## Verification Procedures

### Automated Tests

```bash
# Run auth contract tests
npm run test -- --testPathPattern=auth-contract

# Run all RBAC tests
npm run test -- --testPathPattern=api/

# Check pinned version
npm run check:auth-version
```

### Manual Verification

1. **Login Flow**
   - Navigate to `/login`
   - Enter valid credentials
   - Verify redirect to `/dashboard`
   - Check session in browser DevTools

2. **Session Persistence**
   - Refresh page after login
   - Verify user stays authenticated
   - Check JWT token in cookies

3. **RBAC Guards**
   - Access admin route as PLAYER (expect 403)
   - Access TD route as PLAYER (expect 403)
   - Access route as correct role (expect 200)

4. **Logout Flow**
   - Click logout
   - Verify redirect to home
   - Verify session cleared

## Architecture Overview

```
src/
├── lib/
│   └── auth.ts              # NextAuth configuration
├── middleware.ts            # Auth middleware (route protection)
├── app/
│   ├── api/auth/[...nextauth]/
│   │   └── route.ts         # Auth API routes
│   └── login/
│       └── page.tsx         # Login page
├── components/providers/
│   └── RootProvider.tsx     # SessionProvider wrapper
└── types/
    └── next-auth.d.ts       # Type augmentations
```

## Related Files

- `package.json` - Version pin
- `scripts/check-auth-version.js` - Version verification script
- `src/__tests__/auth/auth-contract.test.ts` - Contract tests

## References

- [Auth.js Documentation](https://authjs.dev/)
- [NextAuth.js v5 Migration Guide](https://authjs.dev/getting-started/migrating-to-v5)
- [npm next-auth](https://www.npmjs.com/package/next-auth)
