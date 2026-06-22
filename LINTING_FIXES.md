# Linting Fixes Required

## Summary
26 linting issues found: 15 errors, 11 warnings

---

## Critical Errors to Fix

### 1. React Hook - Function Declaration Order

**Files:**
- `components/dashboard/EmailUsageMonitor.tsx` (line 20)
- `components/vault/AssetGrantsDialog.tsx` (line 49)

**Problem:** Function accessed before declaration in useEffect

**Fix Pattern:**
```typescript
// BEFORE (WRONG)
useEffect(() => {
  loadData();
}, []);

async function loadData() {
  // ...
}

// AFTER (CORRECT)
const loadData = async () => {
  // ...
};

useEffect(() => {
  loadData();
}, []);
```

### 2. Unescaped Apostrophes in JSX

**Files:**
- `components/dashboard/EmailUsageMonitor.tsx` (line 149)
- `components/settings/SettingsForm.tsx` (lines 115, 117, 178, 209, 213)
- `components/vault/AssetGrantsDialog.tsx` (lines 261, 326)

**Fix:** Replace `'` with `&apos;`

```tsx
// BEFORE
You'll have access
They can't see this

// AFTER
You&apos;ll have access
They can&apos;t see this
```

### 3. Explicit `any` Types

**Files:**
- `app/(dashboard)/audit/page.tsx` (line 123)
- `app/(trustee)/portal/page.tsx` (line 90)
- `supabase/functions/checkin-scanner/index.ts` (lines 62, 72)

**Fix:**
```typescript
// BEFORE
JSON.stringify(log.metadata)

// AFTER
JSON.stringify(log.metadata as Record<string, unknown>)
```

---

## Warnings to Fix

### 4. Unused Imports

**Files:**
- `app/(auth)/login/page.tsx` (line 6)
- `app/(auth)/signup/page.tsx` (line 6)
- `components/dashboard/CheckinButton.tsx` (line 5)

**Fix:** Remove unused `createClient` import

```typescript
// REMOVE this import if not used
import { createClient } from '@/lib/supabase/client';
```

### 5. Unused Import in API Route

**File:** `app/api/auth/login/route.ts` (line 5)

**Fix:** Remove unused `getClientIdentifier` from imports

```typescript
// BEFORE
import {
  checkRateLimit,
  getClientIdentifier,
  RATE_LIMITS,
} from '@/lib/rate-limit';

// AFTER
import {
  checkRateLimit,
  RATE_LIMITS,
} from '@/lib/rate-limit';
```

### 6. Unused Variables in Edge Function

**File:** `supabase/functions/checkin-scanner/index.ts`

**Lines:** 9, 15, 68, 69

**Fix:** Either use the variables or remove them

```typescript
// If not used, remove:
// - Owner interface (line 9)
// - DMSState interface (line 15)
// - checkinIntervalHours (line 68)
// - gracePeriodHours (line 69)
```

### 7. Missing Hook Dependency

**File:** `components/vault/AssetGrantsDialog.tsx` (line 50)

**Fix:** Add `loadData` to dependency array

```typescript
useEffect(() => {
  loadData();
}, [assetId, loadData]);
```

### 8. Unused Variable in Component

**File:** `components/trustee/TrusteeAcceptanceFlow.tsx` (line 26)

**Fix:** Either use `authenticatedEmail` or remove it

---

## Quick Fix Commands

### Apply ESLint Auto-Fix
```bash
npm run lint -- --fix
```

This will automatically fix many issues like:
- Unused imports
- Some formatting issues

### Manual Fixes Required

ESLint can't auto-fix these, you'll need to manually change:
1. Apostrophes in JSX (`'` → `&apos;`)
2. Function declaration order (move before useEffect)
3. Type assertions for `any` types
4. Hook dependency arrays

---

## Verification

After fixes, run:
```bash
npm run lint
npm run build
npm run test:unit
```

All should pass with zero errors.

---

## Priority Order

1. **Critical:** Fix function declaration order (breaks React hooks)
2. **Critical:** Fix explicit `any` types (TypeScript errors)
3. **High:** Fix unescaped entities (React warnings)
4. **Medium:** Remove unused imports (warnings)
5. **Low:** Add missing hook dependencies (optimization)

---

## Example: Complete Fix for EmailUsageMonitor.tsx

```typescript
export function EmailUsageMonitor() {
  const [quota, setQuota] = useState<EmailQuota | null>(null);
  const [loading, setLoading] = useState(true);

  // MOVE FUNCTION BEFORE useEffect
  const loadQuota = async () => {
    try {
      const supabase = createClient();

      const [dailyResult, monthlyResult] = await Promise.all([
        supabase.rpc('check_daily_email_quota'),
        supabase.rpc('check_monthly_email_quota'),
      ]);

      if (dailyResult.data && monthlyResult.data) {
        const daily = dailyResult.data[0];
        const monthly = monthlyResult.data[0];

        setQuota({
          emails_sent_today: daily.emails_sent_today,
          daily_limit_reached: daily.limit_reached,
          daily_warning: daily.warning,
          emails_sent_this_month: monthly.emails_sent_this_month,
          monthly_limit_reached: monthly.limit_reached,
          monthly_warning: monthly.warning,
        });
      }
    } catch (error) {
      console.error('Failed to load email quota:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuota();
  }, []); // Now loadQuota is defined before this

  // ... rest of component

  // Fix apostrophes in JSX
  return (
    // ... JSX with &apos; instead of '
  );
}
```

---

## Files Needing Changes (15 files total)

1. `app/(auth)/login/page.tsx` - Remove unused import
2. `app/(auth)/signup/page.tsx` - Remove unused import
3. `app/(dashboard)/audit/page.tsx` - Fix `any` type
4. `app/(trustee)/portal/page.tsx` - Fix `any` type
5. `app/api/auth/login/route.ts` - Remove unused import
6. `components/dashboard/CheckinButton.tsx` - Remove unused import
7. `components/dashboard/EmailUsageMonitor.tsx` - Fix function order + apostrophes
8. `components/settings/SettingsForm.tsx` - Fix apostrophes (5 places)
9. `components/trustee/TrusteeAcceptanceFlow.tsx` - Remove unused variable
10. `components/vault/AssetGrantsDialog.tsx` - Fix function order + apostrophes + dependencies
11. `supabase/functions/checkin-scanner/index.ts` - Fix `any` types + remove unused
12. `tests/integration/auth-api.test.ts` - Remove unused import

---

Once you've applied these fixes, the GitHub Action should pass successfully.
