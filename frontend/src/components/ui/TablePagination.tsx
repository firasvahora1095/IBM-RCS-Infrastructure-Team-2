import { useState } from "react";
import { Pagination } from "@carbon/react";

/**
 * Paging for any list that can grow long, the same way Deliveries does it (Carbon Pagination: items per page, range
 * and page picker), instead of a "Show all 125" button that stretches the page without end.
 *
 * `reset` is anything that changes the list (a filter, a sort, a search); the page goes back to 1 when it changes,
 * so a narrower list never opens on a page that no longer exists.
 */
export function usePagination<T>(items: T[], reset: string = "", initialSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);
  const [seen, setSeen] = useState(reset);
  if (seen !== reset) {
    setSeen(reset);
    setPage(1);
  }
  const last = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, last);
  return {
    rows: items.slice((current - 1) * pageSize, current * pageSize),
    total: items.length,
    page: current,
    pageSize,
    setPage,
    setPageSize,
  };
}

type PagedState = ReturnType<typeof usePagination>;

/** Shown only when there is more than one page of items. */
export function TablePagination({ paged }: { paged: Pick<PagedState, "page" | "pageSize" | "total" | "setPage" | "setPageSize"> }) {
  if (paged.total <= 10) return null;
  return (
    <Pagination
      page={paged.page}
      pageSize={paged.pageSize}
      pageSizes={[10, 25, 50]}
      totalItems={paged.total}
      onChange={({ page, pageSize }) => {
        paged.setPage(page);
        paged.setPageSize(pageSize);
      }}
    />
  );
}
