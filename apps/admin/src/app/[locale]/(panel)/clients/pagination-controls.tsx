"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "@fitfast/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fitfast/ui/select";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
}

export function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalCount,
}: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("admin");

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`?${params.toString()}`);
  };

  const updatePageSize = (newSize: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", newSize);
    params.set("page", "1"); // Reset to page 1 when changing page size
    router.push(`?${params.toString()}`);
  };

  // Calculate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("ellipsis");
      }

      // Show current page and neighbors
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("ellipsis");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-stone-200 bg-white px-4 py-4 rounded-b-xl">
      {/* Left: Page size selector */}
      <div className="flex items-center gap-2">
        <Select value={pageSize.toString()} onValueChange={updatePageSize}>
          <SelectTrigger className="h-9 w-[110px] border-stone-200 bg-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 {t("perPage")}</SelectItem>
            <SelectItem value="25">25 {t("perPage")}</SelectItem>
            <SelectItem value="50">50 {t("perPage")}</SelectItem>
            <SelectItem value="100">100 {t("perPage")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Center: Pagination */}
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => currentPage > 1 && updatePage(currentPage - 1)}
              className={
                currentPage === 1
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            >
              {t("previous")}
            </PaginationPrevious>
          </PaginationItem>

          {pageNumbers.map((page, index) => (
            <PaginationItem key={`page-${index}`}>
              {page === "ellipsis" ? (
                <PaginationEllipsis />
              ) : (
                <PaginationLink
                  onClick={() => updatePage(page)}
                  isActive={currentPage === page}
                  className="cursor-pointer"
                >
                  {page}
                </PaginationLink>
              )}
            </PaginationItem>
          ))}

          <PaginationItem>
            <PaginationNext
              onClick={() =>
                currentPage < totalPages && updatePage(currentPage + 1)
              }
              className={
                currentPage >= totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            >
              {t("next")}
            </PaginationNext>
          </PaginationItem>
        </PaginationContent>
      </Pagination>

      {/* Right: Showing X-Y of Z */}
      <div className="text-sm text-stone-500">
        {t("showing")} {startItem}-{endItem} {t("of")} {totalCount}
      </div>
    </div>
  );
}
