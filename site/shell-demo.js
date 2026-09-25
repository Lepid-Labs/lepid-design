// Plain-HTML stand-in for the React AppShell's nav behaviour — copy it into a
// no-build app. The theme CSS reads two presence attributes on .ld-shell:
// data-ld-nav-collapsed (wide: icon rail) and data-ld-nav-open (narrow:
// drawer). The toggle flips whichever one fits the viewport.
(() => {
  const NARROW = matchMedia("(max-width: 48rem)"); // the CSS breakpoint

  for (const shell of document.querySelectorAll(".ld-shell")) {
    const toggles = () => shell.querySelectorAll(".ld-shell__toggle");
    const sync = () => {
      const expanded = NARROW.matches
        ? shell.hasAttribute("data-ld-nav-open")
        : !shell.hasAttribute("data-ld-nav-collapsed");
      for (const t of toggles()) t.setAttribute("aria-expanded", String(expanded));
      // on the rail the labels are clipped, so let them surface as tooltips
      const rail = !NARROW.matches && shell.hasAttribute("data-ld-nav-collapsed");
      for (const item of shell.querySelectorAll(".ld-shell__nav .ld-sidenav__item")) {
        if (rail) item.title = item.querySelector(".ld-sidenav__label")?.textContent ?? "";
        else item.removeAttribute("title");
      }
    };
    const close = () => {
      shell.removeAttribute("data-ld-nav-open");
      sync();
    };
    shell.addEventListener("click", (e) => {
      if (e.target.closest(".ld-shell__toggle")) {
        shell.toggleAttribute(NARROW.matches ? "data-ld-nav-open" : "data-ld-nav-collapsed");
        sync();
      } else if (e.target.closest(".ld-shell__scrim")) {
        close();
      } else if (NARROW.matches && e.target.closest(".ld-shell__nav a")) {
        close(); // following a link out of the drawer
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && shell.hasAttribute("data-ld-nav-open")) close();
    });
    NARROW.addEventListener("change", close);
    sync();
  }

  // Showcase only: "#" links just move the current-page marker.
  document.addEventListener("click", (e) => {
    const item = e.target.closest('a[href="#"]:is(.ld-sidenav__item, .ld-topnav__item)');
    if (!item) return;
    e.preventDefault();
    const group = item.closest(".ld-sidenav, .ld-topnav");
    for (const a of group.querySelectorAll("[aria-current]")) a.removeAttribute("aria-current");
    item.setAttribute("aria-current", "page");
  });
})();
