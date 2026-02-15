# Phase 7: Performance Optimization - Research

**Researched:** 2026-02-13
**Domain:** Next.js App Router performance, Supabase pagination, Recharts optimization
**Confidence:** HIGH

## Summary

Phase 7 focuses on scaling FitFast to 1000+ clients without performance degradation. The two primary areas are: (1) implementing efficient pagination for the admin clients list, and (2) adding date range filters to progress charts to limit data loading.

The existing codebase already has strong foundations: proper database indexes on `user_id` and `created_at`, SWR for client-side caching, and dynamic imports for chart components. The main gaps are server-side pagination (currently loads all clients) and date range filtering for chart data.

**Primary recommendation:** Use Supabase's `.range()` method with URL search params for pagination, add a date range filter UI component to the progress page that filters data client-side (already uses `useMemo`), and verify query performance with PostgreSQL EXPLAIN ANALYZE if needed.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase JS | 0.8 (SSR) | Pagination via `.range()` | Native PostgreSQL LIMIT/OFFSET, built-in count support |
| Next.js | 16.1.6 | Server Components + searchParams | RSC eliminates client JS, searchParams enable URL-based pagination |
| SWR | 2.4.0 | Client-side cache invalidation | Automatic revalidation, request deduplication, stale-while-revalidate |
| Recharts | 3.7.0 | Chart rendering | Already in use, SVG-based, good performance <100k points |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | Not installed | Date range calculations | If complex date math needed (currently using native Date) |
| shadcn/ui Pagination | N/A | Pagination UI components | Pre-built accessible pagination controls |
| shadcn/ui Select | N/A | Page size selector | Dropdown for 10/25/50/100 items per page |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `.range()` offset | Cursor-based pagination | More efficient at large offsets (>10k rows), but complex implementation; offset is fine for 1000 clients |
| SWR | TanStack Query | More features (mutations, devtools), but SWR already integrated and sufficient |
| Client-side filtering | Server-side date filtering | Reduces payload but adds DB queries; client-side works since charts already filter in `useMemo` |

**Installation:**
```bash
# Optional: Only if date math becomes complex
pnpm add date-fns

# shadcn/ui components (if not already installed)
npx shadcn@latest add pagination select
```

## Architecture Patterns

### Recommended Pagination Structure

**Server Component Pattern (Admin Clients List)**
```tsx
// src/app/[locale]/(admin)/admin/(panel)/clients/page.tsx

interface PageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const pageSize = parseInt(params.pageSize || "25");

  const supabase = await createClient();

  // Calculate range indices (zero-based, inclusive)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch with count for total pages
  const { data: clients, count } = await supabase
    .from("profiles")
    .select("id,full_name,phone,status,plan_tier,plan_start_date,plan_end_date,created_at", { count: 'estimated' })
    .eq("is_coach", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  const totalPages = count ? Math.ceil(count / pageSize) : 0;

  return (
    <div>
      <ClientsList clients={clients ?? []} />
      <PaginationControls
        currentPage={page}
        totalPages={totalPages}
        pageSize={pageSize}
      />
    </div>
  );
}
```

**Client Component Pagination Controls**
```tsx
// src/app/[locale]/(admin)/admin/(panel)/clients/pagination-controls.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function PaginationControls({ currentPage, totalPages, pageSize }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updatePage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  }

  function updatePageSize(newSize: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", newSize);
    params.set("page", "1"); // Reset to page 1
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex items-center justify-between">
      <Select value={pageSize.toString()} onValueChange={updatePageSize}>
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="10">10 / page</SelectItem>
          <SelectItem value="25">25 / page</SelectItem>
          <SelectItem value="50">50 / page</SelectItem>
          <SelectItem value="100">100 / page</SelectItem>
        </SelectContent>
      </Select>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => updatePage(currentPage - 1)}
              disabled={currentPage === 1}
            />
          </PaginationItem>
          {/* Page numbers... */}
          <PaginationItem>
            <PaginationNext
              onClick={() => updatePage(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
```

### Pattern 2: Chart Date Range Filtering (Client-Side)

**Current Implementation** (already efficient):
The progress page at `src/app/[locale]/(dashboard)/progress/page.tsx` already implements this pattern correctly:

- Date range state: `useState<DateRange>("30")`
- Date range buttons: 30 / 90 / all days
- Client-side filtering: `useMemo` with date comparison
- Filtered data passed to charts

**What's working:**
- `filteredCheckIns` uses `useMemo` to avoid recalculation
- `weightChartData` and `adherenceStats` derive from filtered data
- Dynamic import with `ssr: false` for Recharts (client-only)

**No changes needed** - this pattern is already optimal for the dataset size (check-ins are small, ~50-200 records max per user).

### Pattern 3: Recharts Performance Optimization

**When to optimize:**
- If chart data exceeds 1000 points (unlikely for check-ins)
- If rendering lags during date range changes

**Optimization techniques:**
```tsx
// 1. Memoize chart component
const MemoizedProgressCharts = React.memo(ProgressCharts);

// 2. Use useMemo for chart props (already done in progress page)
const chartProps = useMemo(() => ({
  weightChartData,
  measurementChartData,
  adherenceStats
}), [weightChartData, measurementChartData, adherenceStats]);

// 3. In ProgressCharts.tsx, add performance props
<LineChart
  data={weightChartData}
  throttleDelay={0} // Reduce rerenders during resize
>
  {/* ... */}
</LineChart>
```

### Anti-Patterns to Avoid

- **Loading all data then filtering client-side for large lists:** Use server-side `.range()` for admin clients list (1000+ rows). Client-side filtering is fine for user's own check-ins (<200 rows).
- **Using `.select()` without limiting fields:** Always specify exact columns to reduce payload size.
- **Forgetting to order before pagination:** Supabase `.range()` requires `.order()` for consistent results across pages.
- **Not providing total count:** Users need to know total pages; use `{ count: 'estimated' }` for performance (avoid `'exact'` on large tables).
- **Prop drilling searchParams:** In deeply nested components, use `useSearchParams()` hook instead of passing props through every layer.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Pagination UI | Custom prev/next buttons with manual state | shadcn/ui Pagination + PaginationLink | Accessibility, keyboard nav, disabled states, Next.js Link integration |
| Page size selector | Custom dropdown with onClick handlers | shadcn/ui Select component | Accessible, styled, controlled component pattern |
| Date range calculations | Manual date math with new Date() loops | date-fns (subDays, isAfter, isBefore) | Edge cases (DST, leap years, timezones) |
| URL state management | Manual query string parsing | Next.js useSearchParams + URLSearchParams API | Type-safe, handles encoding, plays well with RSC |
| Chart data decimation | Custom downsampling algorithm | Recharts built-in data throttling or LTTB library | Complex math, visual accuracy, tested algorithms |

**Key insight:** Pagination is deceptively complex (page boundary math, total count, URL sync, back button support). Use proven libraries to avoid edge cases like "page 5 of 3" or lost state on refresh.

## Common Pitfalls

### Pitfall 1: Offset Pagination Performance at Large Offsets

**What goes wrong:** At page 100 with 25 items/page, PostgreSQL must skip 2,475 rows before returning results. This becomes slow at very large offsets.

**Why it happens:** `.range(from, to)` maps to `LIMIT x OFFSET y`. PostgreSQL still scans all preceding rows.

**How to avoid:**
- For 1000 clients, offset pagination is fine (max ~40 pages at 25/page)
- Only switch to cursor-based pagination if performance degrades (unlikely)
- Use `count: 'estimated'` not `'exact'` to avoid full table scan

**Warning signs:**
- Admin clients list load time >2 seconds at later pages
- PostgreSQL slow query logs showing high execution time for profiles queries

### Pitfall 2: Missing `.order()` Before `.range()`

**What goes wrong:** Results change across pages—clients appear on multiple pages or disappear.

**Why it happens:** Without explicit ordering, PostgreSQL returns rows in undefined order (often by physical storage). Inserting new rows can shift page boundaries.

**How to avoid:** Always call `.order()` before `.range()`:
```tsx
.order("created_at", { ascending: false })
.range(from, to)
```

**Warning signs:** Users report "I saw the same client on page 2 and page 3" or "client disappeared after refresh."

### Pitfall 3: Not Resetting to Page 1 When Changing Filters

**What goes wrong:** User searches for a name, result set shrinks to 3 matches, but URL is still `?page=10` so they see "No results."

**Why it happens:** Filters reduce total items, making current page number invalid.

**How to avoid:** When updating search/filters/pageSize, always reset to page 1:
```tsx
params.set("pageSize", newSize);
params.set("page", "1"); // <-- Critical
router.push(`?${params.toString()}`);
```

**Warning signs:** Users change filters and see empty results despite matches existing.

### Pitfall 4: Recharts ResponsiveContainer in React 19 Production

**What goes wrong:** Charts render incorrectly in production (wrong width, not responsive).

**Why it happens:** React 19 production builds cause ResponsiveContainer's chart detection to fail (known issue #5173).

**How to avoid:**
- Use fixed width/height instead of percentage in ResponsiveContainer if issues appear
- Or wrap chart in a container with explicit dimensions
- Monitor for updates in Recharts 3.8+ that may fix this

**Warning signs:** Charts look fine in development but broken in production build.

### Pitfall 5: Unnecessary Server Roundtrips for Chart Date Filtering

**What goes wrong:** Developer fetches new data from Supabase every time user changes date range (30/90/all).

**Why it happens:** Misunderstanding when to use server vs. client filtering.

**How to avoid:**
- Fetch ALL check-ins once (small dataset, <200 per user)
- Filter in `useMemo` client-side (already implemented correctly)
- Only refetch on mutations (new check-in submitted)

**Warning signs:** Network tab shows Supabase requests every time date range button is clicked.

## Code Examples

Verified patterns from official sources and current codebase:

### Supabase Pagination with Count

Source: [Supabase Pagination Guide](https://makerkit.dev/blog/tutorials/pagination-supabase-react), [Official Docs](https://supabase.com/docs/reference/javascript/range)

```tsx
const PAGE_SIZE = 25;
const currentPage = 1; // From searchParams

const from = (currentPage - 1) * PAGE_SIZE;
const to = from + PAGE_SIZE - 1;

const { data, count, error } = await supabase
  .from("profiles")
  .select("id,full_name,phone,status,plan_tier,created_at", { count: 'estimated' })
  .eq("is_coach", false)
  .order("created_at", { ascending: false })
  .range(from, to);

const totalPages = count ? Math.ceil(count / PAGE_SIZE) : 0;
```

**Why `count: 'estimated'`:** Uses PostgreSQL's table statistics (fast) instead of full COUNT(*) query. Acceptable for pagination ("~1000 clients" vs "1,042 clients").

### Next.js Server Component with searchParams

Source: [Next.js Official Docs](https://nextjs.org/docs/app/api-reference/file-conventions/page), [App Router Tutorial](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination)

```tsx
interface PageProps {
  searchParams: Promise<{ page?: string; pageSize?: string; search?: string }>;
}

export default async function Page({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const pageSize = parseInt(params.pageSize || "25", 10);

  // Fetch data using page/pageSize...

  return <Component />;
}
```

**Note:** searchParams is a Promise in Next.js 16+, must be awaited.

### Client-Side Pagination Controls with useRouter

Source: [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params)

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function PaginationControls({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function goToPage(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  }

  return (
    <div>
      <button
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </button>
      <span>Page {currentPage} of {totalPages}</span>
      <button
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
    </div>
  );
}
```

### Date Range Filtering (Current Pattern - Already Optimal)

Source: `src/app/[locale]/(dashboard)/progress/page.tsx`

```tsx
const [dateRange, setDateRange] = useState<"30" | "90" | "all">("30");

// Fetch all check-ins once
const { data: checkIns = [] } = useSWR(
  user ? ["check-ins", user.id] : null,
  () => fetchCheckIns(user?.id)
);

// Filter client-side with memoization
const filteredCheckIns = useMemo(() => {
  if (dateRange === "all") return checkIns;
  const days = dateRange === "30" ? 30 : 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return checkIns.filter((checkIn) => new Date(checkIn.created_at) >= cutoffDate);
}, [checkIns, dateRange]);

// Derive chart data from filtered set
const weightChartData = useMemo(() => {
  return filteredCheckIns
    .filter((checkIn) => checkIn.weight)
    .map((checkIn) => ({
      date: new Date(checkIn.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: checkIn.weight,
    }));
}, [filteredCheckIns]);
```

**Why this works:** Check-ins are small (<200 records per user), filtering is fast, no network overhead, instant UI updates.

### PostgreSQL Index Verification

Source: [PostgreSQL EXPLAIN ANALYZE](https://www.enterprisedb.com/blog/postgresql-query-optimization-performance-tuning-with-explain-analyze)

```sql
-- Via Supabase SQL Editor or Postgres dashboard
EXPLAIN ANALYZE
SELECT id, full_name, phone, status, plan_tier, created_at
FROM profiles
WHERE is_coach = false
ORDER BY created_at DESC
LIMIT 25 OFFSET 0;

-- Look for:
-- 1. "Index Scan" (good) vs "Seq Scan" (bad)
-- 2. Actual time vs estimated rows (should be close)
-- 3. Rows removed by filter (should be low)
```

**Current indexes** (from `001_initial_schema.sql`):
- `idx_profiles_status` on `profiles(status)` ✓
- No index on `profiles(is_coach)` - may need one
- No composite index on `profiles(is_coach, created_at)` - optimal for this query

**Potential optimization:**
```sql
CREATE INDEX idx_profiles_client_list
ON public.profiles(is_coach, created_at DESC)
WHERE is_coach = false;
```

This is a **partial index** (only indexes clients) with correct column order for the admin query.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side filtering for all lists | Server-side pagination with `.range()` | Ongoing (2020+) | Reduces payload, faster initial load for large datasets |
| `count: 'exact'` for total | `count: 'estimated'` | Supabase best practice (2023+) | 10-100x faster on large tables, acceptable accuracy |
| Offset-only pagination | Cursor-based (for infinite scroll) | 2024+ (when needed) | Better performance at large offsets, but complex |
| React Query dominant | SWR + TanStack Query both popular | 2024-2026 | SWR simpler API, TQ more features; both valid |
| Recharts for all charts | Recharts (small data) + Victory/Nivo (large) | 2025+ | Recharts great for <100k points; alternatives for more |
| Manual date math | date-fns v4 with TZ support | Jan 2025 | Built-in timezone handling, smaller bundle |

**Deprecated/outdated:**
- **Fetching without count:** Old tutorials omit `{ count: 'estimated' }`, making total pages calculation impossible.
- **Using `page.tsx` as client component:** Next.js 13+ App Router defaults to server components; use for data fetching, pass to client components for interactivity.
- **Recharts React 18 patterns:** React 19 changed displayName behavior; ResponsiveContainer may need workarounds (issue #5173).

## Open Questions

1. **Should we add composite index `(is_coach, created_at DESC)`?**
   - What we know: Current schema has separate indexes; query may use only one
   - What's unclear: Whether PostgreSQL query planner optimally combines indexes
   - Recommendation: Run EXPLAIN ANALYZE on admin clients query. If "Seq Scan" appears or query >500ms, add composite index. Otherwise, defer.

2. **Will 1000 clients fit in offset pagination or need cursor-based?**
   - What we know: Offset works for most apps <10k rows; cursor is complex
   - What's unclear: Actual performance at page 40 (1000th client)
   - Recommendation: Implement offset first, load test with 1000 seed profiles. Only switch to cursor if >2s load time.

3. **Should we pre-aggregate adherence stats or compute on demand?**
   - What we know: Current implementation queries `meal_completions` and `workout_completions` on every date range change
   - What's unclear: Query cost with 1000 clients × 90 days of data
   - Recommendation: Keep current approach (client-side), monitor query time. If >1s, add materialized view or cron job to pre-aggregate.

## Sources

### Primary (HIGH confidence)

#### Supabase Pagination
- [Supabase JavaScript Range Reference](https://supabase.com/docs/reference/javascript/range) - Official API docs
- [Supabase Pagination Guide (Makerkit)](https://makerkit.dev/blog/tutorials/pagination-supabase-react) - Implementation patterns
- [Supabase Agent Skills: Data Pagination](https://github.com/supabase/agent-skills/blob/main/skills/supabase-postgres-best-practices/references/data-pagination.md) - Best practices
- [Managing Indexes in PostgreSQL (Supabase)](https://supabase.com/docs/guides/database/postgres/indexes) - Index optimization

#### Next.js App Router
- [Next.js page.js API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/page) - searchParams prop
- [Next.js App Router Tutorial: Pagination](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) - Official implementation guide
- [Next.js useSearchParams](https://nextjs.org/docs/app/api-reference/functions/use-search-params) - Client-side URL state
- [Next.js 16 Release Notes](https://nextjs.org/blog/next-16) - React Compiler, Turbopack stable

#### PostgreSQL Performance
- [PostgreSQL EXPLAIN ANALYZE Tutorial (OneUpTime)](https://oneuptime.com/blog/post/2026-01-21-postgresql-explain-analyze/view) - Query optimization
- [PostgreSQL Indexing Playbook (Sachith Dassanayake)](https://www.sachith.co.uk/postgresql-indexing-playbook-practical-guide-feb-12-2026/) - 2026 best practices
- [How to Create Effective Indexes in PostgreSQL (OneUpTime)](https://oneuptime.com/blog/post/2026-01-21-postgresql-indexes/view) - Index design

#### Recharts Optimization
- [Recharts Performance Optimization](https://recharts.github.io/en-US/guide/performance/) - Official guide
- [Recharts GitHub Issue #5173](https://github.com/recharts/recharts/issues/5173) - React 19 ResponsiveContainer bug
- [Recharts ResponsiveContainer API](https://recharts.github.io/en-US/api/ResponsiveContainer/) - Component reference

#### shadcn/ui Components
- [shadcn/ui Pagination Component](https://ui.shadcn.com/docs/components/radix/pagination) - Official docs
- [shadcn/ui Select Component](https://www.shadcn.io/ui/pagination) - Dropdown for page size
- [shadcn-next-link-pagination](https://github.com/bryaneaton13/shadcn-next-link-pagination) - Next.js integration

### Secondary (MEDIUM confidence)
- [Next.js Performance Optimization Guide (Medium)](https://medium.com/@shirkeharshal210/next-js-performance-optimization-app-router-a-practical-guide-a24d6b3f5db2) - Practical patterns
- [SWR GitHub Repository](https://github.com/vercel/swr) - Library overview
- [date-fns Official Documentation](https://date-fns.org/) - Date utility library
- [React Stack Patterns 2026](https://www.patterns.dev/react/react-2026/) - State of the ecosystem

### Tertiary (LOW confidence - context from search)
- [Recharts vs Chart.js Performance Comparison](https://www.oreateai.com/blog/recharts-vs-chartjs-navigating-the-performance-maze-for-big-data-visualizations/4aff3db4085050dc635fd25267846922) - Large dataset handling
- [PostgreSQL Best Practices (WriterDock)](https://writerdock.in/blog/postgres-best-practices-for-performance-and-scalability) - General guidance

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** - All libraries already in use, versions confirmed, official docs verified
- Architecture: **HIGH** - Supabase pagination is well-documented; Next.js searchParams is official pattern; existing chart filtering already optimal
- Pitfalls: **MEDIUM-HIGH** - Common issues documented in GitHub issues and tutorials; React 19 ResponsiveContainer issue confirmed but workarounds exist
- Performance claims: **MEDIUM** - General benchmarks available; actual performance with 1000 FitFast clients needs verification

**Research date:** 2026-02-13
**Valid until:** ~2026-04-13 (60 days - stable domain, but Next.js/React 19 ecosystem still evolving)

**Key assumptions:**
- Admin clients list currently loads all profiles (verified in code)
- Progress charts already use client-side filtering optimally (verified in code)
- Database has existing indexes on `user_id`, `created_at` (verified in migration)
- No index on `is_coach` or composite `(is_coach, created_at)` (verified - may need addition)
