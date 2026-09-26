// Style picker shared by every showcase page. The roster comes from the
// manifest — a new styles/<name>/ shows up here (and in any consumer that
// reads it) with no site change. The choice rides along in ?style= and is
// copied onto links between showcase pages, so the theme survives navigation.
(() => {
  const select = document.getElementById("style-select");
  if (!select) return;
  const apply = () => {
    document.documentElement.dataset.ldStyle = select.value;
    const url = new URL(location.href);
    url.searchParams.set("style", select.value);
    history.replaceState(null, "", url);
    for (const a of document.querySelectorAll('a[href$=".html"], a[href*=".html?"]')) {
      const href = new URL(a.getAttribute("href"), location.href);
      if (href.origin !== location.origin) continue;
      href.searchParams.set("style", select.value);
      a.href = href.pathname.split("/").pop() + href.search;
    }
  };
  fetch(new URL("styles/manifest.json", document.baseURI))
    .then((r) => r.json())
    .then(({ themes }) => {
      const names = Object.keys(themes);
      for (const s of names) select.add(new Option(s, s));
      const requested = new URLSearchParams(location.search).get("style");
      select.value = names.includes(requested) ? requested : document.documentElement.dataset.ldStyle;
      select.addEventListener("change", apply);
      apply();
    });
})();
