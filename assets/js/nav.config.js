/* ============================================================
   Central navigation config for the main pages.

   TO ADD A NAV ITEM: add one line to PG_NAV below — that's it.
   No CSS or markup to touch; site-nav.js renders it everywhere.

   TO ADD A CONTENT PAGE (markdown workflow):
     1. create  content/<name>.md
     2. put config lines at the top of that file, e.g.:
            ---
            title: Teaching
            nav: teaching
            ---
        # your markdown content …
     3. add an entry here:  { label: "teaching", href: "page.html?doc=teaching" }

   Paths are written relative to the site ROOT; site-nav.js rewrites
   them automatically for pages that live in a sub-folder.
   ============================================================ */
window.PG_NAV = [
    { label: "games",       href: "index.html#games" },
    { label: "multiplayer", href: "multiplayer/multiplayer_landing.html" },
    { label: "wiki",        href: "wiki.html" },
    { label: "teaching",    href: "page.html?doc=teaching" },
    { label: "partners",    href: "partners.html" },
    { label: "developers",  href: "developers.html" },
    { label: "github",      href: "https://github.com/albatrossfake06-star/Partition-Games-3D", external: true },
];
