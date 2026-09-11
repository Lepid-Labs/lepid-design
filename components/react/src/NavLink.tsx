import type { AnchorHTMLAttributes } from "react";

export type NavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement>;

/** The switchboard-style uppercase link with chevron and glow hover. */
export function NavLink({ className, ...rest }: NavLinkProps) {
  return <a className={className ? `ld-link ${className}` : "ld-link"} {...rest} />;
}
