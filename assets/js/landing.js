/* ============================================================
   PARTITION GAMES — 3D Landing interactions
   Three.js hero · theme · motion · tilt · partition glyphs
   ============================================================ */
import * as THREE from "three";

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------- */
/* Theme (shares localStorage 'theme' with the rest of site)  */
/* Landing is dark-first: light => data-theme="light"          */
/* ---------------------------------------------------------- */
(function theme() {
    const btn = document.getElementById("theme-toggle");
    const sun = `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/></svg>`;
    const moon = `<svg class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8z"/></svg>`;

    function apply(t) {
        if (t === "light") document.documentElement.setAttribute("data-theme", "light");
        else document.documentElement.removeAttribute("data-theme");
        if (btn) btn.innerHTML = (t === "light" ? moon : sun) + `<span>${t === "light" ? "dark" : "light"}</span>`;
        localStorage.setItem("theme", t);
        window.dispatchEvent(new CustomEvent("pg-theme", { detail: { theme: t } }));
    }

    apply(localStorage.getItem("theme") || "dark");
    btn && btn.addEventListener("click", () => {
        const cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
        apply(cur === "light" ? "dark" : "light");
    });
})();

/* ---------------------------------------------------------- */
/* Header scroll state + mobile menu + about popover           */
/* ---------------------------------------------------------- */
(function chrome() {
    const header = document.getElementById("site-header");
    const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    const menuBtn = document.getElementById("menu-toggle");
    const nav = document.querySelector(".main-nav");
    menuBtn && menuBtn.addEventListener("click", () => {
        const open = nav.classList.toggle("open");
        menuBtn.setAttribute("aria-expanded", String(open));
    });
    nav && nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
        nav.classList.remove("open");
        menuBtn && menuBtn.setAttribute("aria-expanded", "false");
    }));

    const aboutBtn = document.getElementById("about-btn");
    const pop = document.getElementById("about-popover");
    const close = document.getElementById("close-about");
    const toggle = (show) => {
        pop.classList.toggle("hidden", !show);
        aboutBtn.setAttribute("aria-expanded", String(show));
    };
    aboutBtn && aboutBtn.addEventListener("click", (e) => { e.stopPropagation(); toggle(pop.classList.contains("hidden")); });
    close && close.addEventListener("click", () => toggle(false));
    document.addEventListener("click", (e) => { if (pop && !pop.contains(e.target) && e.target !== aboutBtn) toggle(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
})();

/* ---------------------------------------------------------- */
/* Scroll progress bar + scroll-linked parallax                */
/* ---------------------------------------------------------- */
(function scrollFx() {
    const bar = document.createElement("div");
    bar.className = "scroll-progress";
    document.body.appendChild(bar);

    const heroCopy = document.querySelector(".hero-copy");
    const cue = document.querySelector(".scroll-cue");
    const parallax = [...document.querySelectorAll("[data-parallax]")];

    let ticking = false;
    function update() {
        const y = window.scrollY;
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${docH > 0 ? y / docH : 0})`;

        if (!prefersReduced) {
            const vh = window.innerHeight;
            if (heroCopy && y < vh) {
                heroCopy.style.transform = `translateY(${y * 0.22}px)`;
                heroCopy.style.opacity = String(Math.max(0, 1 - y / (vh * 0.85)));
            }
            if (cue) cue.style.opacity = String(Math.max(0, 1 - y / 240));
            parallax.forEach(el => {
                const speed = parseFloat(el.dataset.parallax) || 0.15;
                const r = el.getBoundingClientRect();
                const offset = (r.top + r.height / 2 - window.innerHeight / 2);
                el.style.transform = `translateY(${offset * -speed}px)`;
            });
        }
        ticking = false;
    }
    window.addEventListener("scroll", () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
})();

/* ---------------------------------------------------------- */
/* Scroll reveals (staggered)                                  */
/* ---------------------------------------------------------- */
(function reveals() {
    const items = [...document.querySelectorAll("[data-reveal]")];
    items.forEach(el => {
        if (el.dataset.delay) el.style.setProperty("--reveal-d", el.dataset.delay);
    });
    // stagger game cards by their order
    document.querySelectorAll("#games-grid .game-card").forEach((c, i) => {
        c.style.setProperty("--reveal-d", (i % 6));
    });

    if (prefersReduced || !("IntersectionObserver" in window)) {
        items.forEach(el => el.classList.add("in"));
        return;
    }
    const io = new IntersectionObserver((entries) => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    items.forEach(el => io.observe(el));
})();

/* ---------------------------------------------------------- */
/* Game filtering                                              */
/* ---------------------------------------------------------- */
(function filters() {
    const chips = [...document.querySelectorAll(".filter-chip")];
    const cards = [...document.querySelectorAll("#games-grid .game-card")];
    chips.forEach(chip => chip.addEventListener("click", () => {
        chips.forEach(c => { c.classList.remove("is-active"); c.setAttribute("aria-selected", "false"); });
        chip.classList.add("is-active");
        chip.setAttribute("aria-selected", "true");
        const f = chip.dataset.filter;
        cards.forEach(card => {
            const show = f === "all" || card.dataset.category === f;
            card.classList.toggle("filtered-out", !show);
        });
    }));
})();

/* ---------------------------------------------------------- */
/* Partition glyphs (isometric mini Young diagrams on cards)   */
/* ---------------------------------------------------------- */
(function glyphs() {
    const U = 11;
    document.querySelectorAll(".card-shape").forEach(el => {
        const rows = (el.closest("[data-partition]")?.dataset.partition || "3 2 1")
            .trim().split(/\s+/).map(Number);
        const maxC = Math.max(...rows), nR = rows.length;
        const offX = 36 - (maxC * U) / 2;
        const offY = 28 - (nR * U) / 2;
        rows.forEach((len, r) => {
            for (let c = 0; c < len; c++) {
                const cell = document.createElement("div");
                cell.className = "iso-cell";
                cell.style.left = (offX + c * U) + "px";
                cell.style.top = (offY + r * U) + "px";
                el.appendChild(cell);
            }
        });
    });

    // flat mini board in the multiplayer mock
    document.querySelectorAll(".mp-mini-board").forEach(el => {
        const rows = (el.dataset.partition || "4 3 2").trim().split(/\s+/).map(Number);
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.gap = "4px";
        rows.forEach(len => {
            const row = document.createElement("div");
            row.style.display = "flex";
            row.style.gap = "4px";
            for (let c = 0; c < len; c++) {
                const s = document.createElement("span");
                s.style.cssText = "width:18px;height:18px;border-radius:4px;background:color-mix(in srgb,var(--cyan) 28%,transparent);border:1px solid color-mix(in srgb,var(--cyan) 70%,transparent);";
                row.appendChild(s);
            }
            el.appendChild(row);
        });
    });
})();

/* ---------------------------------------------------------- */
/* Card 3D tilt + sheen follow                                 */
/* ---------------------------------------------------------- */
(function tilt() {
    if (prefersReduced || matchMedia("(pointer: coarse)").matches) return;
    const MAX = 9;
    document.querySelectorAll(".game-card").forEach(card => {
        let raf = null;
        const move = (e) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.style.setProperty("--mx", (px * 100) + "%");
            card.style.setProperty("--my", (py * 100) + "%");
            if (raf) return;
            raf = requestAnimationFrame(() => {
                card.style.transform =
                    `rotateY(${(px - 0.5) * MAX}deg) rotateX(${(0.5 - py) * MAX}deg) translateZ(6px)`;
                raf = null;
            });
        };
        card.addEventListener("pointermove", move);
        card.addEventListener("pointerleave", () => { card.style.transform = ""; });
    });
})();

/* ---------------------------------------------------------- */
/* Three.js hero — a 3D partition (plane-partition corner)     */
/* ---------------------------------------------------------- */
(function hero3d() {
    const canvas = document.getElementById("hero-canvas");
    if (!canvas) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (err) {
        canvas.style.display = "none";
        return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0, 17);

    const group = new THREE.Group();
    scene.add(group);

    // ---- build the 3D partition (cubes stacked in a corner) ----
    const N = 6, SIZE = 0.92, STEP = 1.0;
    const box = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
    const edgeGeo = new THREE.EdgesGeometry(box);
    const cOrange = new THREE.Color("#FF6B35");
    const cCyan = new THREE.Color("#2DD4BF");

    const built = [];   // every cube: { mesh, edges }
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            const h = N - i - j;
            for (let k = 0; k < h; k++) {
                const t = THREE.MathUtils.clamp((k + (i + j) * 0.18) / N, 0, 1);
                const col = cOrange.clone().lerp(cCyan, t * 0.9);
                const mesh = new THREE.Mesh(box, new THREE.MeshStandardMaterial({
                    color: col, metalness: 0.25, roughness: 0.42,
                    emissive: col.clone().multiplyScalar(0.18), transparent: true, opacity: 1,
                }));
                mesh.position.set(i * STEP, k * STEP, j * STEP);
                const edges = new THREE.LineSegments(edgeGeo,
                    new THREE.LineBasicMaterial({ color: col.clone().lerp(new THREE.Color("#fff"), 0.4), transparent: true, opacity: 0.55 }));
                edges.position.copy(mesh.position);
                group.add(mesh); group.add(edges);
                built.push({ mesh, edges });
            }
        }
    }
    // center on bounding box
    const c = (N - 1) * STEP / 2;
    group.children.forEach(o => o.position.sub(new THREE.Vector3(c, c * 0.5, c)));

    // ---- choose "traveller" blocks that shed into the page on scroll ----
    // pick the 7 highest cubes (the top of the staircase) — most visible.
    const sorted = built.slice().sort((a, b) => b.mesh.position.y - a.mesh.position.y);
    // spaced well apart vertically so the cubes never overlap while they spin
    const SHED_SPECS = [
        { at: 0.10, nx: -0.78, ny: 0.46 },   // → games (left column)
        { at: 0.15, nx: -0.84, ny: 0.02 },
        { at: 0.20, nx: -0.76, ny: -0.42 },
        { at: 0.40, nx: 0.78, ny: 0.46 },    // → head-to-head (right column)
        { at: 0.45, nx: 0.84, ny: 0.02 },
        { at: 0.50, nx: 0.76, ny: -0.42 },
        { at: 0.70, nx: -0.50, ny: -0.46 },  // → research (left)
    ];
    const sheds = [];
    SHED_SPECS.forEach((spec, idx) => {
        const cubeObj = sorted[idx];
        if (!cubeObj) return;
        const home = cubeObj.mesh.position.clone();       // local pos in group space
        group.remove(cubeObj.mesh); group.remove(cubeObj.edges);
        const chunk = new THREE.Group();
        cubeObj.mesh.position.set(0, 0, 0);
        cubeObj.edges.position.set(0, 0, 0);
        chunk.add(cubeObj.mesh); chunk.add(cubeObj.edges);
        chunk.scale.setScalar(1.0);                        // same size as a model cube
        scene.add(chunk);
        sheds.push({ chunk, home, at: spec.at, nx: spec.nx, ny: spec.ny,
            anchor: new THREE.Vector3(), spin: 0.004 + Math.random() * 0.005, phase: Math.random() * 6.28 });
    });

    // main-mass materials (for the recede/fade as travellers take over)
    const mainMats = [];
    group.traverse(o => { if (o.material) mainMats.push(o.material); });

    // ---- lights ----
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(6, 10, 8); scene.add(key);
    const rimO = new THREE.PointLight(0xff6b35, 60, 60); rimO.position.set(-8, 2, 6); scene.add(rimO);
    const rimC = new THREE.PointLight(0x2dd4bf, 50, 60); rimC.position.set(8, -4, -6); scene.add(rimC);

    // ---- screen→world helper (z=0 plane) for anchoring shed blocks ----
    function screenToWorld(nx, ny, out) {
        const vH = 2 * Math.tan((38 * Math.PI / 180) / 2) * camera.position.z;
        const vW = vH * camera.aspect;
        return out.set(nx * vW / 2, ny * vH / 2, 1.5);
    }

    // ---- keyframes for the main mass as you scroll the page ----
    let wide = true;
    const KP = { hero: new THREE.Vector3(), games: new THREE.Vector3(), mp: new THREE.Vector3(), end: new THREE.Vector3() };
    // Guard against environments that report a bogus (0/1) viewport width.
    function cw() { var w = canvas.clientWidth || window.innerWidth || 0; return w > 2 ? w : 1280; }
    function ch() { var h = canvas.clientHeight || window.innerHeight || 0; return h > 2 ? h : 800; }
    function layout() {
        const w = cw();
        wide = w > 820;
        const f = wide ? 1 : 0.45;
        KP.hero.set(3.4 * f, 0.4, 0);
        KP.games.set(5.0 * f, 2.4, -2);
        KP.mp.set(-0.6 * f, 3.4, -4);
        KP.end.set(0, 4.6, -7);
        camera.position.z = wide ? 17 : 22;
        camera.aspect = w / ch();
        camera.updateProjectionMatrix();
        sheds.forEach(s => screenToWorld(wide ? s.nx : s.nx * 0.7, s.ny, s.anchor));
    }
    function resize() {
        // size the drawing buffer to the canvas's actual rendered box (CSS keeps display = viewport)
        renderer.setSize(cw(), ch(), false);
        layout();
    }
    resize();
    window.addEventListener("resize", resize);
    // re-size once the fixed canvas gets its real dimensions from layout
    if (window.ResizeObserver) { try { new ResizeObserver(resize).observe(canvas); } catch (e) {} }
    setTimeout(resize, 100);
    window.addEventListener("load", resize);

    // ---- pointer parallax (subtle) ----
    const ptr = { x: 0, y: 0 }, ptrCur = { x: 0, y: 0 };
    if (!prefersReduced) window.addEventListener("pointermove", (e) => {
        ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
        ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    // ---- scroll progress ----
    let p = 0, pCur = 0;
    function readProgress() {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        p = max > 0 ? THREE.MathUtils.clamp(window.scrollY / max, 0, 1) : 0;
    }
    window.addEventListener("scroll", readProgress, { passive: true });
    readProgress();

    const ease = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    function massAt(prog, out) {
        if (prog < 0.33) out.copy(KP.hero).lerp(KP.games, ease(prog / 0.33));
        else if (prog < 0.66) out.copy(KP.games).lerp(KP.mp, ease((prog - 0.33) / 0.33));
        else out.copy(KP.mp).lerp(KP.end, ease((prog - 0.66) / 0.34));
        return out;
    }

    // ---- per-frame update (also callable on demand for envs that throttle rAF) ----
    const clock = new THREE.Clock();
    const tmp = new THREE.Vector3(), target = new THREE.Vector3();
    let booted = false;   // first frame snaps; afterwards everything eases (both scroll directions)

    function frame(prog, time) {
        // main mass: travel + recede + shrink + spin + fade
        massAt(prog, tmp);
        group.position.copy(tmp);
        group.position.y += Math.sin(time * 0.7) * 0.06;
        group.scale.setScalar(1 - prog * 0.5);
        group.rotation.y = -0.9 + prog * Math.PI * 1.25 + (prefersReduced ? 0 : time * 0.07) + ptrCur.x * 0.25;
        group.rotation.x = -0.18 - ptrCur.y * 0.18;
        const fade = 1 - prog * 0.78;
        for (let m = 0; m < mainMats.length; m++) mainMats[m].opacity = (mainMats[m].isLineBasicMaterial ? 0.55 : 1) * fade;

        // travellers: ride the mass, peel off to their side anchor — and ease BACK on scroll up
        for (let s = 0; s < sheds.length; s++) {
            const sh = sheds[s];
            const released = prog >= sh.at && !prefersReduced;
            if (released) {
                target.copy(sh.anchor);
                target.y += Math.sin(time * 0.9 + sh.phase) * 0.18;   // gentle bob
            } else {
                target.copy(sh.home); group.localToWorld(target);     // attached position in the model
            }
            if (!booted) sh.chunk.position.copy(target);
            else sh.chunk.position.lerp(target, 0.08);                 // eases in BOTH directions

            if (released) {
                sh.chunk.rotation.y += sh.spin;
                sh.chunk.rotation.x += sh.spin * 0.6;
            } else {
                sh.chunk.quaternion.slerp(group.quaternion, booted ? 0.12 : 1); // rotate back smoothly when re-attaching
            }
        }
        booted = true;
        renderer.render(scene, camera);
    }

    let running = true;
    document.addEventListener("visibilitychange", () => { running = !document.hidden; });
    function tick() {
        requestAnimationFrame(tick);
        if (!running) return;
        pCur += (p - pCur) * 0.08;
        ptrCur.x += (ptr.x - ptrCur.x) * 0.05;
        ptrCur.y += (ptr.y - ptrCur.y) * 0.05;
        frame(prefersReduced ? 0 : pCur, clock.getElapsedTime());
    }
    tick();
})();
