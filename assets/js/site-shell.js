/* ============================================================
   PARTITION GAMES 3D — site shell (wiki / developers / multiplayer)
   Authoritative, landing-consistent theme: dark-first, with a
   toggle that matches the home page. Re-asserts to beat any
   late resets from the older script.js.
   ============================================================ */
(function () {
    "use strict";
    if (window.__pgSite) return;
    window.__pgSite = true;

    function isDark() {
        try { return localStorage.getItem("theme") !== "light"; } catch (e) { return true; }
    }
    function apply(dark) {
        if (dark) document.documentElement.setAttribute("data-theme", "dark");
        else document.documentElement.removeAttribute("data-theme");
    }
    function updateLabel(btn, dark) {
        if (!btn) return;
        var sun = '<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>';
        var moon = '<svg class="theme-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8z"/></svg>';
        btn.innerHTML = (dark ? sun + "[light]" : moon + "[dark]");
    }

    function init() {
        var dark = isDark();
        apply(dark);
        // re-assert after older scripts run on DOMContentLoaded
        setTimeout(function () { apply(isDark()); }, 60);
        setTimeout(function () { apply(isDark()); }, 260);

        var btn = document.getElementById("theme-toggle");
        if (btn) {
            // drop any existing handler from script.js, own the toggle
            var clone = btn.cloneNode(true);
            btn.parentNode.replaceChild(clone, btn);
            updateLabel(clone, dark);
            clone.addEventListener("click", function () {
                var next = document.documentElement.getAttribute("data-theme") !== "dark";
                apply(next);
                try { localStorage.setItem("theme", next ? "dark" : "light"); } catch (e) {}
                updateLabel(clone, next);
            });
        }
    }

    apply(isDark()); // apply ASAP to avoid a flash
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
