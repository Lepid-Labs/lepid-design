import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { Button } from "./Button.js";
import { EmptyState } from "./EmptyState.js";
import type { Side } from "./floating.js";
import { IconButton } from "./IconButton.js";
import { Menu, MenuSeparator } from "./Menu.js";
import { Avatar } from "./Presence.js";

/** The signed-in person, as an app's auth layer reports them. */
export interface IdentityUser {
  /** Stable id; picks the avatar colour. */
  id: string;
  name: string;
  email?: string;
  /** Avatar image URL; initials otherwise. */
  avatar?: string;
}

export interface IdentityNameProps extends HTMLAttributes<HTMLSpanElement> {
  user: Pick<IdentityUser, "name" | "email">;
}

/** A person's display name, inline in a sentence, with their email beside it when it says more. */
export function IdentityName({ user, ...rest }: IdentityNameProps) {
  return (
    <span {...rest}>
      <strong>{user.name}</strong>
      {user.email && user.email !== user.name && <span className="ld-muted"> ({user.email})</span>}
    </span>
  );
}

export interface UserMenuProps {
  user: IdentityUser;
  /** The account actions: MenuItems, e.g. one that opens the profile page where the user signs out. */
  children: ReactNode;
  /** Names the trigger, followed by the user's name. Default "Account". */
  label?: string;
  side?: Side;
  className?: string;
}

/** The signed-in user at the end of the app header: an avatar button opening a menu headed by who they are. */
export function UserMenu({ user, children, label = "Account", side, className }: UserMenuProps) {
  const id = useId();
  const trigger = (
    <IconButton label={`${label}: ${user.name}`}>
      <Avatar id={user.id} name={user.name} src={user.avatar} />
    </IconButton>
  );
  return (
    <Menu trigger={trigger} label={label} side={side} className={className}>
      <div role="group" aria-labelledby={id} className="ld-menu__group">
        <div role="presentation" id={id} className="ld-menu__header">
          <Avatar id={user.id} name={user.name} src={user.avatar} aria-hidden="true" />
          <span className="ld-menu__header-text">
            <strong>{user.name}</strong>
            {user.email && user.email !== user.name && <span className="ld-muted">{user.email}</span>}
          </span>
        </div>
        <MenuSeparator />
        {children}
      </div>
    </Menu>
  );
}

export type AccessState = "signed-out" | "no-access" | "unavailable";

export interface AccessPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  /** `signed-out`: no session. `no-access`: signed in, but this account has no role here.
   *  `unavailable`: the sign-in service can't be reached. */
  state: AccessState;
  /** Who is signed in, for `no-access`. */
  user?: Pick<IdentityUser, "name" | "email">;
  /** The app's name, for `no-access` copy. */
  appName?: string;
  /** `signed-out`: start sign-in. */
  onSignIn?: () => void;
  /** `no-access`: where the user switches account or signs out (the identity provider's profile page). */
  switchAccountHref?: string;
  /** `unavailable`: check again. */
  onRetry?: () => void;
  /** Replaces the default title. */
  title?: ReactNode;
  /** Replaces the default body copy. */
  children?: ReactNode;
}

/** What an app shows instead of itself when the visitor can't use it yet, with the one way forward. */
export function AccessPanel({
  state,
  user,
  appName = "this app",
  onSignIn,
  switchAccountHref,
  onRetry,
  title,
  children,
  className,
  ...rest
}: AccessPanelProps) {
  const copy = {
    "signed-out": {
      title: "Sign in to continue",
      body: <>You need to sign in to use {appName}.</>,
      action: onSignIn && (
        <Button variant="primary" onClick={onSignIn}>
          Sign in
        </Button>
      ),
    },
    "no-access": {
      title: "No access",
      body: (
        <>
          {user ? (
            <>
              You're signed in as <IdentityName user={user} />, but this account has
            </>
          ) : (
            "Your account has"
          )}{" "}
          no access to {appName}. Ask an administrator for access, or sign in with another account.
        </>
      ),
      action: switchAccountHref && (
        <a className="ld-btn" href={switchAccountHref}>
          Switch account
        </a>
      ),
    },
    unavailable: {
      title: "Sign-in is unavailable",
      body: <>The sign-in service can't be reached right now. Try again in a moment.</>,
      action: onRetry && <Button onClick={onRetry}>Try again</Button>,
    },
  }[state];
  return (
    <EmptyState
      className={className}
      title={title ?? copy.title}
      titleAs="h2"
      actions={copy.action || undefined}
      role={state === "unavailable" ? "alert" : undefined}
      {...rest}
    >
      {children ?? <p>{copy.body}</p>}
    </EmptyState>
  );
}
