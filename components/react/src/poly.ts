import type { ComponentPropsWithoutRef, ElementType } from "react";

/** Props of a component that renders `as` (default `<a>`) — pass a router's
 *  Link to keep client-side navigation. Own props win over the element's. */
export type PolyProps<E extends ElementType, Own> = Own & { as?: E } & Omit<ComponentPropsWithoutRef<E>, keyof Own | "as">;
