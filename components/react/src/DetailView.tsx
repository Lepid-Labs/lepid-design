import type { ReactNode } from "react";
import { DataState, type QueryLike } from "./DataState.js";
import { Page, PageHeader } from "./Page.js";
import { useViewActions, type ViewAction } from "./view-action.js";

export interface DetailViewProps<T> {
  /** Any `{ data, error, isPending }` whose data is the item: a react-query result. */
  query: QueryLike<T>;
  title: (item: T) => ReactNode;
  /** One line under the title: id, created, last seen. */
  subtitle?: (item: T) => ReactNode;
  /** Above the title: a back link or the section name. */
  eyebrow?: ReactNode;
  /** Header buttons, each with its confirm, busy state and error toast. */
  actions?: ViewAction<T>[];
  /** The rest of the page: sections and cards about the item. */
  children?: (item: T) => ReactNode;
}

/** A page about one item: loading and error states, a header from the item, and its actions. */
export function DetailView<T>({ query, title, subtitle, eyebrow, actions = [], children }: DetailViewProps<T>) {
  const act = useViewActions();
  return (
    <Page>
      <DataState query={query}>
        {(item) => (
          <>
            <PageHeader
              title={title(item)}
              eyebrow={eyebrow}
              subtitle={subtitle?.(item)}
              actions={actions.length > 0 ? actions.map((a, i) => act.button(a, item, String(i))) : undefined}
            />
            {children?.(item)}
          </>
        )}
      </DataState>
      {act.dialog}
    </Page>
  );
}
