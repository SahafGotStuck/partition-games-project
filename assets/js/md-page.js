/* ============================================================
   Renders a markdown file from /content into the unified style.
   Usage:  page.html?doc=<name>   →  fetches content/<name>.md

   Front-matter (config lines) at the top of the .md file:
       ---
       title: Teaching
       nav: teaching
       ---
   ============================================================ */
(function () {
    "use strict";
    function parseFrontMatter(text) {
        var meta = {}, body = text;
        var m = /^---\s*\n([\s\S]*?)\n---\s*\n?/.exec(text);
        if (m) {
            m[1].split("\n").forEach(function (line) {
                var i = line.indexOf(":");
                if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
            });
            body = text.slice(m[0].length);
        }
        return { meta: meta, body: body };
    }

    function render() {
        var root = document.getElementById("md-root");
        if (!root) return;
        var doc = new URLSearchParams(location.search).get("doc") || "teaching";
        doc = doc.replace(/[^a-z0-9_-]/gi, "");   // safe filename only
        fetch("content/" + doc + ".md")
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); })
            .then(function (text) {
                var parsed = parseFrontMatter(text);
                if (parsed.meta.title) document.title = parsed.meta.title + " | Partition Games · GRASP";
                var html = (window.marked ? window.marked.parse(parsed.body) : ("<pre>" + parsed.body + "</pre>"));
                root.innerHTML = '<article class="md-article">' + html + "</article>";
            })
            .catch(function () {
                root.innerHTML = '<article class="md-article"><h1>Page not found</h1>' +
                    '<p>No content file <code>content/' + doc + '.md</code>. Add one and link it from ' +
                    '<code>assets/js/nav.config.js</code>.</p></article>';
            });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render);
    else render();
})();
