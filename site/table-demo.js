// Static-site demo of interactive table rows. The React TableRow in
// @lepid-labs/ui-react does the same thing; this is the no-build equivalent so
// the showcase can exercise .ld-table--interactive in every theme.
//
// Markup: <table class="ld-table ld-table--interactive" data-table-demo> whose
// body rows carry tabindex="0". Click or Enter/Space moves aria-selected.
(() => {
  for (const table of document.querySelectorAll("[data-table-demo]")) {
    const rows = [...table.tBodies[0].rows];
    const select = (row) => rows.forEach((r) => r.setAttribute("aria-selected", String(r === row)));
    for (const row of rows) {
      row.addEventListener("click", () => select(row));
      row.addEventListener("keydown", (e) => {
        if (e.target !== row || (e.key !== "Enter" && e.key !== " ")) return;
        e.preventDefault();
        select(row);
      });
    }
  }
})();
