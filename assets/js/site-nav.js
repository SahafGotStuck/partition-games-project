/* ============================================================
   Renders window.PG_NAV (see nav.config.js) into any element that
   has a [data-nav] attribute. Rewrites root-relative hrefs for the
   page's folder depth, so the same config works on every page.
   ============================================================ */
(function () {
    "use strict";
    function prefix() {
        var parts = location.pathname.split("/");
        var depth = Math.max(0, parts.length - 2);   // /index.html → 0, /a/b.html → 1
        return depth > 0 ? new Array(depth + 1).join("../") : "";
    }
    function render(container) {
        var items = window.PG_NAV || [], pre = prefix();
        container.innerHTML = "";
        items.forEach(function (it) {
            var a = document.createElement("a");
            a.className = "nav-link nav-button";
            a.textContent = it.label;
            a.href = it.external ? it.href : (pre + it.href);
            if (it.external) { a.target = "_blank"; a.rel = "noopener"; }
            container.appendChild(a);
        });
    }
    function init() { document.querySelectorAll("[data-nav]").forEach(render); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
    window.PGNav = { render: init };
})();
