import type { ReactNode } from "react";
import { Alert, Spinner } from "./feedback.js";
import { errorMessage } from "./format.js";
import { useLoadingIndicator } from "./useLoadingIndicator.js";

/** The part of a react-query result (or any loader) DataState reads. */
export interface QueryLike<T> {
  data: T | undefined;
  error: unknown;
  isPending: boolean;
}

export interface DataStateProps<T> {
  query: QueryLike<T>;
  /** Renders the loaded data. */
  children: (data: T) => ReactNode;
  /** Shown instead of `children` when the data is an empty array: an EmptyState. */
  empty?: ReactNode;
  /** Shown while loading, once the wait is long enough to need it. Default a Spinner. */
  loading?: ReactNode;
}

/** The loading, error, empty and loaded states of one query. Loading shows nothing for a
 *  fast answer and never flashes (useLoadingIndicator). An error with no data replaces the
 *  content; an error on a refetch is shown above the data it could not refresh. */
export function DataState<T>({ query, children, empty, loading }: DataStateProps<T>) {
  const showLoading = useLoadingIndicator(query.isPending);
  if (showLoading) return <>{loading ?? <Spinner />}</>;
  if (query.isPending) return null;
  const { data, error } = query;
  const alert = error != null && <Alert variant="danger">{errorMessage(error)}</Alert>;
  if (data === undefined) return <>{alert}</>;
  return (
    <>
      {alert}
      {empty !== undefined && Array.isArray(data) && data.length === 0 ? empty : children(data)}
    </>
  );
}
