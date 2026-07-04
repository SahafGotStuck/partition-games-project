/* ============================================================
   Partners — real interactive world map (Leaflet + OpenStreetMap
   dark tiles via CARTO). Three equal partner institutions; scroll
   to zoom, zoom in to reveal the people pinned at each location,
   click a person to read what they do.
   Edit PARTNERS below to add/adjust institutions or people.
   ============================================================ */
(function () {
    "use strict";

    var PARTNERS = [
        {
            id: "rhodes", kind: "partner", name: "Rhodes College", short: "Rhodes College",
            city: "Memphis, Tennessee", country: "United States",
            lat: 35.1175, lng: -89.9711, accent: "orange",
            website: "https://www.rhodes.edu", logo: "assets/images/logo/Rhodes_College_logo.png",
            members: [
                { name: "Prof. Eric Gottlieb", role: "Faculty · Research lead", initials: "EG", email: "gottlieb@rhodes.edu",
                  bio: "Leads the combinatorial game theory research behind GRASP and supervises the partition games and the impartial-chess (iChess) work." },
                { name: "Labib Muzahid", role: "Developer · Summer ’26", initials: "LM",
                  bio: "Developer working with Prof. Gottlieb — building the GRASP site: the 3D redesign, the iChess games on arbitrary partitions, and the interactive map/systems." },
                { name: "Rubaiya Islam", role: "Developer · Summer ’26", initials: "RI",
                  bio: "Summer ’26 fellow contributing to the GRASP game suite." },
                { name: "Sahaf Mahmud", role: "Developer · Summer ’26", initials: "SM",
                  bio: "Summer ’26 fellow contributing to the GRASP game suite." },
                { name: "Aayan Deb", role: "Collaborator", initials: "AD", email: "debaa-28@rhodes.edu", bio: "Collaborator at Rhodes College." },
                { name: "Soumitro Dwip", role: "Collaborator", initials: "SD", email: "dwiso-28@rhodes.edu", bio: "Collaborator at Rhodes College." },
                { name: "Amalia Bay", role: "Collaborator", initials: "AB", bio: "Collaborator at Rhodes College." },
                { name: "Hannah Meit", role: "Collaborator", initials: "HM", bio: "Collaborator at Rhodes College." },
                { name: "Ismael Qureshi", role: "Collaborator", initials: "IQ", bio: "Collaborator at Rhodes College." }
            ]
        },
        {
            id: "rutgers", kind: "partner", name: "Rutgers University", short: "Rutgers",
            city: "Piscataway, New Jersey", country: "United States",
            lat: 40.5204, lng: -74.4645, accent: "cyan",
            website: "https://www.rutgers.edu", logo: null,
            members: [
                { name: "Collaborating faculty", role: "Faculty", initials: "R",
                  bio: "Collaborating faculty at Rutgers University — names and details to be added." }
            ]
        },
        {
            id: "up", kind: "partner", name: "University of Primorska · FAMNIT", short: "UP · FAMNIT",
            city: "Koper / Capodistria", country: "Slovenia",
            lat: 45.5483, lng: 13.7294, accent: "orange",
            website: "https://www.famnit.upr.si", logo: null,
            members: [
                { name: "Prof. Matjaž Krnc", role: "Faculty", initials: "MK",
                  bio: "Faculty partner at UP FAMNIT, University of Primorska." },
                { name: "Prof. Peter Mursic", role: "Faculty", initials: "PM",
                  bio: "Faculty partner at UP FAMNIT, University of Primorska." },
                { name: "Nino Bašić", role: "Collaborator", initials: "NB", bio: "Collaborator at UP FAMNIT, University of Primorska." },
                { name: "Nina Chiarelli", role: "Collaborator", initials: "NC", bio: "Collaborator at UP FAMNIT, University of Primorska." },
                { name: "Jelena Ilič", role: "Collaborator", initials: "JI", bio: "Collaborator at UP FAMNIT, University of Primorska." }
            ]
        },
        {
            id: "darmstadt", kind: "collaborator", name: "TU Darmstadt", short: "TU Darmstadt",
            city: "Darmstadt", country: "Germany",
            lat: 49.8728, lng: 8.6512, accent: "cyan",
            website: "https://www.tu-darmstadt.de", logo: null,
            members: [
                { name: "Ina Bašić", role: "Collaborator", initials: "IB", bio: "Collaborator at TU Darmstadt." }
            ]
        }
        // University of Minnesota removed for now — re-add once Dr. Sundaram's
        // collaboration formally begins. (id: "minnesota", contact: Sheila Sundaram)
    ];

    var REVEAL_ZOOM = 7;   // members appear at/after this zoom level

    function build() {
        var root = document.getElementById("partners-root");
        if (!root) return;
        root.innerHTML =
            '<div class="pt-hero">' +
              '<p class="pt-eyebrow">a three-way partnership</p><h1>Partners</h1>' +
              '<p>GRASP is built together by <strong>Rhodes College</strong>, <strong>Rutgers University</strong>, and the ' +
              '<strong>University of Primorska (FAMNIT)</strong> — three equal partners across two continents — ' +
              'with collaborators at institutions worldwide. Scroll to zoom into a campus and meet the people behind the project.</p>' +
            '</div>' +
            '<div class="pt-map">' +
              '<div id="pt-leaflet"></div>' +
              '<div class="pt-hint">⊕ scroll to zoom · click a campus to fly in</div>' +
              '<button class="pt-reset" id="pt-reset">⤢ world view</button>' +
              '<div class="pt-detail" id="pt-detail"></div>' +
            '</div>' +
            '<div class="pt-strip" id="pt-strip"></div>' +
            '<h2 class="pt-collabs-title">Collaborators</h2>' +
            '<div class="pt-collabs" id="pt-collabs"></div>';

        var detail = document.getElementById("pt-detail");
        var strip = document.getElementById("pt-strip");

        if (!window.L) {   // Leaflet failed to load — graceful fallback
            document.getElementById("pt-leaflet").innerHTML =
                '<div style="display:grid;place-items:center;height:100%;color:#8aa0c0;font-family:var(--s-mono);font-size:13px;text-align:center;padding:24px">' +
                'Map library unavailable offline — see the partner list below.</div>';
        } else {
            var map = L.map("pt-leaflet", { scrollWheelZoom: true, worldCopyJump: true, minZoom: 2, zoomControl: true });
            L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: "abcd", maxZoom: 19
            }).addTo(map);

            var bounds = L.latLngBounds(PARTNERS.map(function (p) { return [p.lat, p.lng]; }));
            function worldView() { map.fitBounds(bounds, { padding: [70, 70] }); }
            worldView();

            var allMemberMarkers = [];   // every researcher marker, with its institution + show/hide state
            PARTNERS.forEach(function (p) {
                var logoHtml = p.logo
                    ? '<span class="pt-mk-pin pt-mk-logo"><img src="' + p.logo + '" alt=""></span>'
                    : '<span class="pt-mk-pin"></span>';
                var inst = L.divIcon({
                    className: "pt-divicon " + p.accent + " " + (p.kind || "partner"), iconSize: [16, 16], iconAnchor: [8, 8],
                    html: logoHtml + '<span class="pt-mk-label"><b>' + p.short + '</b> · <i>' +
                          p.members.length + (p.members.length === 1 ? " member" : " members") + '</i></span>'
                });
                var instMarker = L.marker([p.lat, p.lng], { icon: inst, title: p.name }).addTo(map)
                    .on("click", function () { map.flyTo([p.lat, p.lng], 13, { duration: 1.2 }); });

                var rad = 0.006 + p.members.length * 0.0013;   // wider ring for bigger teams
                var thisInstituteMembers = [];
                p.members.forEach(function (mem, i) {
                    var ang = (i / p.members.length) * Math.PI * 2;
                    var ll = [p.lat + Math.sin(ang) * rad, p.lng + Math.cos(ang) * rad * 1.4];
                    // One consistent researcher-marker style for everyone (black, orange outline)
                    // rather than varying it by institution accent color.
                    var ic = L.divIcon({
                        className: "pt-memicon", iconSize: [0, 0],
                        html: '<div class="pt-mem"><span class="blk">' + mem.initials + '</span>' +
                              '<span class="nm">' + mem.name.replace(/^Prof\.\s*/, "") + '</span></div>'
                    });
                    var memMarker = L.marker(ll, { icon: ic })
                        .on("click", function () { openMember(p, mem); });
                    thisInstituteMembers.push(memMarker);
                    allMemberMarkers.push(memMarker);
                });

                function showThese() { thisInstituteMembers.forEach(function (m) { if (!map.hasLayer(m)) m.addTo(map); }); }
                function hideThese() { if (map.getZoom() >= REVEAL_ZOOM) return; thisInstituteMembers.forEach(function (m) { if (map.hasLayer(m)) map.removeLayer(m); }); }
                // Hovering the institution marker (or its label) reveals its
                // researchers immediately, in addition to the zoom-based reveal.
                instMarker.on("mouseover", showThese).on("mouseout", hideThese);
            });

            function refreshMembers() {
                var show = map.getZoom() >= REVEAL_ZOOM;
                allMemberMarkers.forEach(function (m) {
                    if (show && !map.hasLayer(m)) m.addTo(map);
                    else if (!show && map.hasLayer(m)) map.removeLayer(m);
                });
            }
            map.on("zoomend", refreshMembers); refreshMembers();
            setTimeout(function () { map.invalidateSize(); worldView(); }, 250);

            document.getElementById("pt-reset").addEventListener("click", function () { detail.classList.remove("open"); worldView(); });
            window.__ptFly = function (p) { map.flyTo([p.lat, p.lng], 13, { duration: 1.2 }); };
        }

        function openMember(p, mem) {
            detail.className = "pt-detail open";
            var contact = mem.email
                ? '<a class="pt-contact" href="mailto:' + mem.email + '">' + mem.email + '</a>'
                : '<span class="pt-contact pt-contact-tbd">contact not yet listed</span>';
            detail.innerHTML =
                '<button class="pt-back" id="pt-back">← back to map</button>' +
                '<div class="pt-card-big ' + p.accent + '">' +
                  '<div class="blk">' + mem.initials + '</div>' +
                  '<div class="nm">' + mem.name + '</div>' +
                  '<div class="rl">' + mem.role + '</div>' +
                  '<div class="inst">' + p.name + ' · ' + p.city + ', ' + p.country +
                    (p.website ? ' · <a href="' + p.website + '" target="_blank" rel="noopener">institution site ↗</a>' : '') + '</div>' +
                  '<p class="bio">' + mem.bio + '</p>' +
                  contact +
                '</div>';
            document.getElementById("pt-back").addEventListener("click", function () { detail.classList.remove("open"); });
        }

        PARTNERS.filter(function (p) { return (p.kind || "partner") === "partner"; }).forEach(function (p) {
            var card = document.createElement("div");
            card.className = "pt-card";
            card.innerHTML = '<div class="nm">' + p.name + '</div>' +
                '<div class="lc">' + p.city + ' · ' + p.country + '</div>' +
                '<div class="ct">' + p.members.length + (p.members.length === 1 ? " member" : " members") + '</div>' +
                (p.website ? '<a class="pt-site-link" href="' + p.website + '" target="_blank" rel="noopener" onclick="event.stopPropagation()">official site ↗</a>' : '');
            card.addEventListener("click", function () { if (window.__ptFly) window.__ptFly(p); });
            strip.appendChild(card);
        });

        // full collaborators list (everyone with a Collaborator role, alphabetical by surname)
        var collabs = document.getElementById("pt-collabs");
        var list = [];
        PARTNERS.forEach(function (p) {
            p.members.forEach(function (mem) {
                if (/collaborator/i.test(mem.role)) list.push({ p: p, mem: mem });
            });
        });
        list.sort(function (a, b) {
            var sa = a.mem.name.split(" ").pop(), sb = b.mem.name.split(" ").pop();
            return sa.localeCompare(sb);
        });
        list.forEach(function (it) {
            var chip = document.createElement("button");
            chip.className = "pt-collab-chip";
            chip.innerHTML = '<span class="cn">' + it.mem.name + '</span><span class="ci">' + it.p.name.replace(" · FAMNIT", "") + '</span>';
            chip.addEventListener("click", function () { if (window.__ptOpen) window.__ptOpen(it.p, it.mem); });
            collabs.appendChild(chip);
        });
        window.__ptOpen = openMember;
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
    else build();
})();
