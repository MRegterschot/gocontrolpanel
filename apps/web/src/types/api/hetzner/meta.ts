export interface HetznerPagination {
  page: number;
  per_page: number;
  previous_page: number | null;
  next_page: number | null;
  last_page: number | null;
  total_entries: number | null;
}

export interface HetznerMetaPagination {
  pagination: HetznerPagination;
}
