import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { ClientsList } from "./clients-list";
import { PaginationControls } from "./pagination-controls";
import { Suspense } from "react";

interface PageProps {
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}

export default async function AdminClientsPage({ searchParams }: PageProps) {
  const t = await getTranslations("admin");
  const supabase = await createClient();

  // Await searchParams (Next.js 16+ pattern)
  const params = await searchParams;

  // Parse and validate page and pageSize
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);

  // Validate pageSize to be one of allowed values
  const requestedPageSize = parseInt(params.pageSize ?? "25", 10);
  const pageSize = [10, 25, 50, 100].includes(requestedPageSize)
    ? requestedPageSize
    : 25;

  // Calculate range indices (zero-based inclusive)
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch clients with pagination using .range()
  const { data: clients, count } = await supabase
    .from("profiles")
    .select(
      "id,full_name,phone,status,plan_tier,plan_start_date,plan_end_date,created_at",
      { count: "estimated" }
    )
    .eq("is_coach", false)
    .order("created_at", { ascending: false })
    .range(from, to);

  // Calculate total pages
  const totalPages = Math.ceil((count ?? 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900">
          {t("clients")}
        </h1>
        <p className="text-sm text-stone-500 mt-1">
          {count ?? 0} {t("totalClients").toLowerCase()}
        </p>
      </div>

      <ClientsList clients={clients ?? []} />

      <Suspense fallback={null}>
        <PaginationControls
          currentPage={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalCount={count ?? 0}
        />
      </Suspense>
    </div>
  );
}
