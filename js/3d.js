/* ==========================================================================
   Arahan Enterprises — 3d.js
   Procedural Three.js hero scenes (no model files required):
     • "tower" (Home): an RCC building frame that assembles itself —
       footings → columns → beams → slabs → finishing layer → crane —
       with blueprint ground grid, dimension lines, dust and a light sweep.
     • "civil" (Civil & Infrastructure): isolated footings, equipment
       foundations, cable trench, pipeline in an excavated trench,
       a control room frame and a chain-link boundary fence.
   Three.js is loaded on demand from jsDelivr via dynamic import(), which
   also works when index.html is opened straight from disk. If WebGL or
   the CDN is unavailable, the hero keeps its static SVG fallback.
   ========================================================================== */
(function () {
  "use strict";

  var THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js";
  var canvas = document.querySelector("canvas[data-scene]");
  if (!canvas) return;
  var hero = canvas.closest("[data-hero]");
  var AE = window.AE;

  function fallback() { hero.classList.add("no-webgl"); }

  function hasWebGL() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
    } catch (e) { return false; }
  }
  if (!hasWebGL()) { fallback(); return; }

  // Fetch Three.js right away, but only build the scene once the intro
  // loader has cleared, so parsing never competes with the loader animation.
  var load = import(THREE_URL);
  function boot() {
    load.then(function (THREE) { start(THREE); }).catch(function (err) {
      fallback();
      if (window.console) console.warn("Arahan 3D scene unavailable, showing static drawing.", err);
    });
  }
  function whenReady(fn) {
    if (document.documentElement.classList.contains("is-ready")) fn();
    else document.addEventListener("ae:ready", fn, { once: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { whenReady(boot); });
  else whenReady(boot);

  /* ---------- Easing ---------- */
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBack(t) { var c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }

  function start(THREE) {
    var small = AE.isSmall();
    var reduced = AE.reduced();
    var sceneName = canvas.getAttribute("data-scene");

    /* ---------- Renderer / scene / camera ---------- */
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: !small, alpha: true, powerPreference: "high-performance" });
    } catch (e) { fallback(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = !small;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    /* The home hero sits on soft sand, the civil hero on deep green, so
       the atmosphere follows the surface the scene is painted onto. */
    var LIGHT = true;   /* both heroes sit on off-white */
    var FOG = LIGHT ? 0xD8CBB8 : 0x1D423A;

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(FOG, 60, 170);   /* must clear the camera distance, or the building greys out */
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 400);

    /* ---------- Materials (shared) ---------- */
    /* Arahan palette: warm concrete, green steel, peach accents */
    var M = {
      concrete: new THREE.MeshStandardMaterial({ color: 0xE0D7C6, roughness: 0.92, metalness: 0.02 }),
      concreteDark: new THREE.MeshStandardMaterial({ color: 0xBFB29B, roughness: 0.94, metalness: 0.02 }),
      slab: new THREE.MeshStandardMaterial({ color: 0xEDE6DA, roughness: 0.88, metalness: 0.03 }),
      steel: new THREE.MeshStandardMaterial({ color: 0x4C7A6F, roughness: 0.4, metalness: 0.7 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x86A2BE, roughness: 0.07, metalness: 0.5, transparent: true, opacity: 0.78, depthWrite: false }),
      stone: new THREE.MeshStandardMaterial({ color: 0xD1C1A5, roughness: 0.62, metalness: 0.05 }),
      accent: new THREE.MeshStandardMaterial({ color: 0xEFB27E, roughness: 0.45, metalness: 0.25, emissive: 0x28584E, emissiveIntensity: 0.25 }),
      soil: new THREE.MeshStandardMaterial({ color: 0x6B4A30, roughness: 1, metalness: 0, transparent: true, opacity: 0.85 }),
      fill: new THREE.MeshStandardMaterial({ color: 0x9C8259, roughness: 1, metalness: 0, transparent: true, opacity: 0.55 }),

      /* ---- Finishing stages (tower only) ------------------------------
         Wall panels and frame members are cloned per level so the paint
         stage can wash bottom-to-top instead of flipping colour at once. */
      glassPremium: new THREE.MeshStandardMaterial({ color: 0x7E9AB8, roughness: 0.06, metalness: 0.55, transparent: true, opacity: 0.8, depthWrite: false }),
      mullion: new THREE.MeshStandardMaterial({ color: 0xB9AF9C, roughness: 0.5, metalness: 0.35 }),
      rail: new THREE.MeshStandardMaterial({ color: 0xBCB3A2, roughness: 0.35, metalness: 0.6 }),
      door: new THREE.MeshStandardMaterial({ color: 0x7E9AB8, roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.86 }),
      trim: new THREE.MeshStandardMaterial({ color: 0xD8DCE0, roughness: 0.35, metalness: 0.45 }),
      windowGlass: new THREE.MeshStandardMaterial({ color: 0x8CA6C2, roughness: 0.09, metalness: 0.5, transparent: true, opacity: 0.96 }),
      fixture: new THREE.MeshStandardMaterial({ color: 0xF7E2C6, roughness: 0.4, metalness: 0.1, emissive: 0xEFB27E, emissiveIntensity: 0 })
    };

    /* Raw → primer → finished coat. The finished set is one coordinated
       architectural scheme: two field colours, a dark banding colour, and
       accents used only on the entrance, balconies and feature panel. */
    var PAINT = {
      raw: 0xE0D7C6, rawDark: 0xBFB29B,
      primer: 0xE9E2D6,
      cream: 0xF0E7D6,       /* field A: warm cream                  */
      ivory: 0xF7F1E4,       /* field B: soft ivory, alternate floors */
      beige: 0xDFD3BC,       /* light beige: recesses and soffits     */
      green: 0x28584E,       /* primary: deep Arahan green           */
      charcoal: 0x3B3F3D,    /* contrast: dark architectural bands    */
      terracotta: 0xB4714B,  /* accent: feature panel (muted)         */
      brown: 0x8A5A3B,       /* accent: warm brown trims              */
      gold: 0xC9A96B,        /* accent: slim gold-beige reveal         */
      white: 0xF4F5F6,       /* structural framing                     */
      silver: 0xD8DCE0,      /* mullions, spandrels, fins              */
      slate: 0x6E7780        /* subtle dark grey structural elements   */
    };
    /* ---------- Reflection environment ----------
       A metallic surface with nothing to reflect renders as flat grey, which
       is why the glazing looked washed out. This is a cheap two-stop sky /
       ground gradient used purely as an environment map on the glass and
       metal, so panes pick up a soft daylight reflection. One 16x128 canvas
       texture, no HDR download, no scene-wide lighting change. */
    function daylightEnv() {
      var c = document.createElement("canvas");
      c.width = 16; c.height = 128;
      var g = c.getContext("2d");
      var grd = g.createLinearGradient(0, 0, 0, 128);
      grd.addColorStop(0.00, "#b9d2ea");   /* upper sky   */
      grd.addColorStop(0.44, "#e8f0f7");   /* horizon haze */
      grd.addColorStop(0.56, "#ddd6c8");   /* ground       */
      grd.addColorStop(1.00, "#b3aa99");
      g.fillStyle = grd;
      g.fillRect(0, 0, 16, 128);
      var t = new THREE.CanvasTexture(c);
      t.mapping = THREE.EquirectangularReflectionMapping;
      if ("colorSpace" in t) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    var ENV = daylightEnv();
    [M.glass, M.glassPremium, M.windowGlass, M.rail, M.mullion].forEach(function (mat) {
      mat.envMap = ENV;
      mat.envMapIntensity = 1.0;
      mat.needsUpdate = true;
    });

    var EDGE = new THREE.LineBasicMaterial({ color: LIGHT ? 0x28584E : 0xD8CBB8, transparent: true, opacity: LIGHT ? 0.26 : 0.18 });
    var EDGE_ACC = new THREE.LineBasicMaterial({ color: LIGHT ? 0x28584E : 0xEFB27E, transparent: true, opacity: 0.85 });
    /* Reinforcement starter bars: their own material so the finishing
       stages can strike them without touching any other linework. */
    var barMat = new THREE.LineBasicMaterial({ color: LIGHT ? 0x28584E : 0xEFB27E, transparent: true, opacity: 0.85 });
    var LINE_DIM = new THREE.LineBasicMaterial({ color: LIGHT ? 0x9C8259 : 0xD1C1A5, transparent: true, opacity: 0.45 });

    var UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
    UNIT_BOX.translate(0, 0.5, 0); // origin at the base, so scale.y "grows" upward
    var UNIT_EDGES = new THREE.EdgesGeometry(UNIT_BOX);

    var root = new THREE.Group();
    scene.add(root);

    /* Build list: each entry animates in after `delay` seconds */
    var items = [];
    var levelGroups = [];

    function box(parent, x, y, z, w, h, d, mat, opts) {
      opts = opts || {};
      var m = new THREE.Mesh(UNIT_BOX, mat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      m.castShadow = !small && opts.shadow !== false;
      m.receiveShadow = !small;
      if (opts.edges !== false) {
        var e = new THREE.LineSegments(UNIT_EDGES, opts.edgeMat || EDGE);
        m.add(e);
      }
      parent.add(m);
      items.push({
        obj: m, delay: opts.delay || 0, dur: opts.dur || 0.7,
        mode: opts.mode || "grow",
        base: m.position.clone(), scale: m.scale.clone()
      });
      return m;
    }

    function line(parent, pts, mat, delay) {
      var g = new THREE.BufferGeometry().setFromPoints(pts.map(function (p) { return new THREE.Vector3(p[0], p[1], p[2]); }));
      var l = new THREE.LineSegments(g, mat);
      parent.add(l);
      l.visible = false;
      items.push({ obj: l, delay: delay || 0, dur: 0.01, mode: "show" });
      return l;
    }

    /* ---------- Ground: blueprint grid + shadow catcher ---------- */
    var grid = new THREE.GridHelper(120, 120, LIGHT ? 0xB3A28C : 0x4C7A6F, LIGHT ? 0xC6B99F : 0x2F665A);
    grid.material.transparent = true;
    grid.material.opacity = LIGHT ? 0.5 : 0.7;
    scene.add(grid);
    var grid2 = new THREE.GridHelper(120, 24, 0xEFB27E, 0xEFB27E);
    grid2.material.transparent = true;
    grid2.material.opacity = LIGHT ? 0.3 : 0.22;
    grid2.position.y = 0.002;
    scene.add(grid2);
    var shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.ShadowMaterial({ opacity: LIGHT ? 0.16 : 0.34 }));
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.003;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    /* ---------- Lights ---------- */
    scene.add(new THREE.HemisphereLight(0xFFFFFF, LIGHT ? 0xD8CBB8 : 0x1D423A, LIGHT ? 1.15 : 0.8));
    var key = new THREE.DirectionalLight(0xFFF3E4, LIGHT ? 1.7 : 2.1);
    key.position.set(22, 30, 16);
    key.castShadow = !small;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -22; key.shadow.camera.right = 22;
    key.shadow.camera.top = 22; key.shadow.camera.bottom = -22;
    key.shadow.camera.near = 1; key.shadow.camera.far = 90;
    key.shadow.bias = -0.0008;
    scene.add(key);
    var rim = new THREE.DirectionalLight(LIGHT ? 0xD1C1A5 : 0x8FB3A8, 0.8);
    rim.position.set(-24, 14, -18);
    scene.add(rim);
    // Warm light that sweeps across the structure
    var sweep = new THREE.PointLight(0xEFB27E, 0, 26, 1.6);
    scene.add(sweep);

    /* HUD label anchors (local coordinates inside `root`) */
    var anchors = [];
    var center = new THREE.Vector3();
    var span = 20;

    /* Ambient life once the building is complete: a reflection travelling
       across the glass, the lighting breathing, the site tidying itself. */
    var reflectBand = null;   // {mesh, x0, x1}
    var craneMats = [];       // faded out when the project completes
    var strikes = [];         // site-only linework struck during finishing: {mat, at, dur, from}
    var fixtures = [];        // emissive exterior lighting
    var gridFade = { mats: [grid.material, grid2.material], from: [grid.material.opacity, grid2.material.opacity], to: [0.22, 0.1] };
    var doneAt = 0;           // buildT at which the building is finished
    var paintJobs = [];       // filled by the scene builder below
    var _cFrom = new THREE.Color(), _cMid = new THREE.Color(), _cTo = new THREE.Color();

    if (sceneName === "civil") buildCivil(); else buildTower();

    /* ======================================================================
       Scene: RCC building frame
       ====================================================================== */
    function buildTower() {
      var BX = 4.2, BZ = 4.2, H = 3.2;        // bay sizes and storey height
      var NX = 3, NZ = 2, LEVELS = small ? 4 : 5;
      var W = BX * NX, D = BZ * NZ;
      center.set(W / 2, LEVELS * H * 0.42, D / 2);
      span = 26;
      var t = 0.2;
      var frameMeshes = [];   // columns and beams, re-materialled by the paint stage

      /* ---- Stage 00: empty plot, setting out, excavation ---------------
         The sequence opens on bare ground: the plot is pegged out, the grid
         lines go down, pits are dug, and only then does concrete arrive. */
      var gSite0 = new THREE.Group(); gSite0.name = "site-setting-out"; root.add(gSite0);

      // plot boundary pegged out on open ground
      line(root, [[-1, 0.02, -1], [W + 1, 0.02, -1], [W + 1, 0.02, -1], [W + 1, 0.02, D + 1],
        [W + 1, 0.02, D + 1], [-1, 0.02, D + 1], [-1, 0.02, D + 1], [-1, 0.02, -1]], EDGE_ACC, 0.05);

      // setting-out lines along every column grid
      var setOut = [];
      for (var sx = 0; sx <= NX; sx++) setOut.push([sx * BX, 0.03, -1.4], [sx * BX, 0.03, D + 1.4]);
      for (var sz = 0; sz <= NZ; sz++) setOut.push([-1.4, 0.03, sz * BZ], [W + 1.4, 0.03, sz * BZ]);
      line(root, setOut, LINE_DIM, 0.45);
      t = 0.9;

      // excavated pits: spoil ring, then the dug hollow
      for (var ex = 0; ex <= NX; ex++) for (var ez = 0; ez <= NZ; ez++) {
        var pd = t + (ex + ez) * 0.05;
        box(gSite0, ex * BX, 0.01, ez * BZ, 2.3, 0.1, 2.3, M.fill,
          { delay: pd, dur: 0.4, mode: "grow", edges: false, shadow: false });
        box(gSite0, ex * BX, 0, ez * BZ, 1.75, 0.16, 1.75, M.soil,
          { delay: pd + 0.12, dur: 0.4, mode: "grow", edges: false, shadow: false });
      }
      t += 0.75;

      // pad footings cast into the pits
      for (var ix = 0; ix <= NX; ix++) for (var iz = 0; iz <= NZ; iz++) {
        box(root, ix * BX, 0, iz * BZ, 1.5, 0.35, 1.5, M.concreteDark, { delay: t + (ix + iz) * 0.04, dur: 0.5, mode: "grow" });
      }
      t += 0.55;

      for (var L = 0; L < LEVELS; L++) {
        var lv = new THREE.Group();
        lv.userData.level = L;
        root.add(lv);
        levelGroups.push(lv);
        var y0 = L * H + 0.35;
        var top = L === LEVELS - 1;

        // Columns
        for (var cx = 0; cx <= NX; cx++) for (var cz = 0; cz <= NZ; cz++) {
          var colH = top ? H * 0.55 : H;
          frameMeshes.push(box(lv, cx * BX, y0, cz * BZ, 0.46, colH, 0.46, M.concrete, { delay: t + (cx * 0.03 + cz * 0.05), dur: 0.55 }));
          if (top) {
            // Starter bars projecting from the top storey. They belong to the
            // structural stage only: barMat is faded out before handover so
            // the finished roof carries a parapet, not exposed reinforcement.
            var bars = [];
            for (var k = 0; k < 4; k++) {
              var ox = (k % 2 ? 0.14 : -0.14), oz = (k < 2 ? 0.14 : -0.14);
              var bx = cx * BX + ox, bz = cz * BZ + oz;
              bars.push([bx, y0 + colH, bz], [bx, y0 + colH + 1.1, bz]);
            }
            line(lv, bars, barMat, t + 0.6);
          }
        }
        t += 0.32;
        if (top) { t += 0.2; continue; }

        // Beams
        var by = y0 + H - 0.5;
        for (var bz2 = 0; bz2 <= NZ; bz2++) for (var bx2 = 0; bx2 < NX; bx2++) {
          frameMeshes.push(box(lv, bx2 * BX + BX / 2, by, bz2 * BZ, BX, 0.5, 0.36, M.concrete, { delay: t + bx2 * 0.04, dur: 0.5, mode: "slideX" }));
        }
        for (var bx3 = 0; bx3 <= NX; bx3++) for (var bz3 = 0; bz3 < NZ; bz3++) {
          frameMeshes.push(box(lv, bx3 * BX, by, bz3 * BZ + BZ / 2, 0.36, 0.5, BZ, M.concrete, { delay: t + 0.1 + bz3 * 0.04, dur: 0.5, mode: "slideZ" }));
        }
        t += 0.22;
        // Slab
        box(lv, W / 2, y0 + H - 0.02, D / 2, W + 0.9, 0.24, D + 0.9, M.slab, { delay: t, dur: 0.6, mode: "drop", edgeMat: L === 1 ? EDGE_ACC : EDGE });
        t += 0.25;
      }

      // Stair / lift core in the rear bay
      var coreBox = box(root, W - BX / 2, 0.35, D - 1.1, 2.4, (LEVELS - 1) * H + 0.8, 2.2, M.concreteDark, { delay: 0.7, dur: t - 0.9 });

      // Finishing layer on the lower storeys: glazing + stone cladding
      var ft = t + 0.1;
      var fin = levelGroups[0];
      for (var g = 0; g < NX; g++) {
        box(fin, g * BX + BX / 2, 0.45, D + 0.02, BX - 0.5, H - 0.7, 0.06, M.glass, { delay: ft + g * 0.12, dur: 0.6, edgeMat: EDGE_ACC, shadow: false });
      }
      for (var s = 0; s < NZ; s++) {
        box(fin, -0.02, 0.45, s * BZ + BZ / 2, 0.08, H - 0.7, BZ - 0.5, M.stone, { delay: ft + 0.3 + s * 0.12, dur: 0.6 });
      }
      if (levelGroups[1]) {
        for (var g2 = 0; g2 < NX; g2++) {
          box(levelGroups[1], g2 * BX + BX / 2, H + 0.45, D + 0.02, BX - 0.5, H - 0.7, 0.06, M.glass, { delay: ft + 0.5 + g2 * 0.12, dur: 0.6, shadow: false });
        }
      }

      // SS railing on the roof edge of the finished part (accent)
      var ry = (LEVELS - 1) * H + 0.35 + 0.9;
      line(root, [[0, ry, D + 0.35], [W, ry, D + 0.35]], EDGE_ACC, ft + 0.9);

      // Tower crane (wireframe) beside the structure
      var craneX = W + 3.5, craneZ = -7, craneH = LEVELS * H + 6;
      var mast = [];
      var m0 = 0.7;
      for (var seg = 0; seg < craneH; seg += 1.4) {
        var y1 = seg, y2 = Math.min(craneH, seg + 1.4);
        mast.push([craneX - m0, y1, craneZ - m0], [craneX - m0, y2, craneZ - m0],
          [craneX + m0, y1, craneZ - m0], [craneX + m0, y2, craneZ - m0],
          [craneX - m0, y1, craneZ + m0], [craneX - m0, y2, craneZ + m0],
          [craneX + m0, y1, craneZ + m0], [craneX + m0, y2, craneZ + m0],
          [craneX - m0, y1, craneZ - m0], [craneX + m0, y2, craneZ - m0],
          [craneX - m0, y1, craneZ + m0], [craneX + m0, y2, craneZ + m0]);
      }
      var jibY = craneH;
      var jib = [
        [craneX + 6, jibY, craneZ], [craneX - 20, jibY, craneZ],
        [craneX + 6, jibY + 1, craneZ], [craneX - 20, jibY + 1, craneZ],
        [craneX, jibY + 1, craneZ], [craneX, jibY + 4, craneZ],
        [craneX, jibY + 4, craneZ], [craneX - 20, jibY + 1, craneZ],
        [craneX, jibY + 4, craneZ], [craneX + 6, jibY + 1, craneZ]
      ];
      for (var j = 0; j < 26; j += 2) jib.push([craneX + 6 - j, jibY, craneZ], [craneX + 6 - j - 1, jibY + 1, craneZ]);
      // Hook line down to the working level
      jib.push([craneX - 12, jibY, craneZ], [craneX - 12, (LEVELS - 1) * H + 3.2, craneZ]);
      var craneMat = new THREE.LineBasicMaterial({ color: LIGHT ? 0x28584E : 0xEFB27E, transparent: true, opacity: 0.5 });
      craneMats.push(craneMat);   // the crane strikes once the building is finished
      line(root, mast, craneMat, t + 0.2);
      line(root, jib, craneMat, t + 0.4);
      box(root, craneX - 12 - 0.5, (LEVELS - 1) * H + 2.4, craneZ - 0.5, 1, 0.8, 1, M.accent, { delay: t + 0.6, dur: 0.5, edges: false });
      box(root, craneX + 4, jibY - 0.2, craneZ - 0.8, 2.4, 1.2, 1.6, M.concreteDark, { delay: t + 0.5, dur: 0.4 });

      // Dimension lines along X (front) and Y (left)
      var dz = D + 2.6, tk = 0.35, hTop = (LEVELS - 1) * H + 0.35;
      var dims = [[0, 0.03, dz], [W, 0.03, dz], [0, 0.03, dz - tk], [0, 0.03, dz + tk], [W, 0.03, dz - tk], [W, 0.03, dz + tk]];
      for (var c2 = 1; c2 < NX; c2++) dims.push([c2 * BX, 0.03, dz - tk * 0.6], [c2 * BX, 0.03, dz + tk * 0.6]);
      dims.push([-2.4, 0, D], [-2.4, hTop, D], [-2.4 - tk, 0, D], [-2.4 + tk, 0, D], [-2.4 - tk, hTop, D], [-2.4 + tk, hTop, D]);
      for (var l2 = 1; l2 < LEVELS; l2++) dims.push([-2.4 - tk * 0.6, l2 * H + 0.35, D], [-2.4 + tk * 0.6, l2 * H + 0.35, D]);
      line(root, dims, LINE_DIM, t + 0.3);

      /* ==================================================================
         Finishing stages — the structure becomes a completed building.
         02 walls · 03 glazing · 04 facade · 05 paint · 06 details ·
         07 lighting. Each stage is a named group so the scene graph reads
         like the site programme.
         ================================================================== */
      var TW = t + 1.1;                 // 02 walls
      var TG = TW + 2.2;                // 03 glazing
      var TF = TG + 2.0;                // 04 facade articulation
      var TP = TF + 1.9;                // 05 multi-coat paint
      var TD = TP + 2.2;                // 06 windows, doors, railings, trims
      var TL = TD + 2.0;                // 07 exterior lighting
      var TK = TL + 0.6;                // 09 forecourt paving + walkway
      var TN = TK + 1.2;                // 10 landscaping + outdoor lighting
      var detail = small ? 0 : 1;       // mobile runs a lighter build

      /* The starter bars belong to the structural stage. They are struck
         as the parapet goes on, so no reinforcement survives to handover. */
      strikes.push({ mat: barMat, at: TF + 0.5, dur: 1.3, from: barMat.opacity });

      var gWalls = new THREE.Group(); gWalls.name = "building-walls"; root.add(gWalls);
      var gGlass = new THREE.Group(); gGlass.name = "building-glass"; root.add(gGlass);
      var gFacade = new THREE.Group(); gFacade.name = "building-facade"; root.add(gFacade);
      var gWindows = new THREE.Group(); gWindows.name = "building-windows"; root.add(gWindows);
      var gDetails = new THREE.Group(); gDetails.name = "building-details"; root.add(gDetails);
      var gRoof = new THREE.Group(); gRoof.name = "building-roof"; root.add(gRoof);
      var gLight = new THREE.Group(); gLight.name = "building-lighting"; root.add(gLight);

      /* ---- Stage 02: wall panels rise floor by floor ------------------
         Solid infill on the rear and left elevations; the two faces the
         camera sees stay open for glazing, balconies and a feature panel. */
      var wallMats = [];
      for (var wl = 0; wl < LEVELS; wl++) {
        var wm = M.concrete.clone();
        wm.color.setHex(PAINT.raw);
        wallMats.push(wm);
        var wy = wl * H + 0.35, wtop = wl === LEVELS - 1;
        var wh = (wtop ? H * 0.55 : H) - 0.62;
        var wStart = TW + wl * 0.42;

        // rear elevation (z = 0)
        for (var wb = 0; wb < NX; wb++) {
          box(gWalls, wb * BX + BX / 2, wy + 0.2, -0.02, BX - 0.55, wh, 0.14, wm,
            { delay: wStart + wb * 0.09, dur: 0.55, shadow: detail > 0 });
        }
        // right elevation (x = W): solid at the ends, open in the middle bay
        for (var ws = 0; ws < NZ; ws++) {
          if (ws === 1 && wl > 0 && wl < LEVELS - 1) continue;   // balcony / green-wall bay
          box(gWalls, W + 0.02, wy + 0.2, ws * BZ + BZ / 2, 0.14, wh, BZ - 0.55, wm,
            { delay: wStart + 0.18 + ws * 0.09, dur: 0.55, shadow: detail > 0 });
        }
        // left elevation (x = 0) above the existing stone cladding
        if (wl > 0) {
          for (var wz = 0; wz < NZ; wz++) {
            box(gWalls, -0.02, wy + 0.2, wz * BZ + BZ / 2, 0.12, wh, BZ - 0.55, wm,
              { delay: wStart + 0.3 + wz * 0.08, dur: 0.55, shadow: false });
          }
        }
      }

      /* ---- Stage 03: glazing slides into the front elevation ---------- */
      var spandrelMats = [];
      for (var gl = 0; gl < LEVELS; gl++) {
        var gy = gl * H + 0.35, gtop = gl === LEVELS - 1;
        var gh = (gtop ? H * 0.55 : H) - 0.7;
        var gStart = TG + gl * 0.4;
        for (var gb = 0; gb < NX; gb++) {
          // levels 0–1 already carry the original finishing-layer glazing
          if (gl < 2) continue;
          box(gGlass, gb * BX + BX / 2, gy + 0.45, D + 0.02, BX - 0.5, gh, 0.06, M.glassPremium,
            { delay: gStart + gb * 0.14, dur: 0.7, mode: "slideIn", edges: false, shadow: false });
          items[items.length - 1].from = new THREE.Vector3(0, 0, 2.6);
        }
        // Spandrel band at each floor line, painted deep green in stage 04.
        // This is what carries the primary brand colour onto the main
        // elevation without striping the solid walls.
        var spMat = M.concrete.clone();
        spMat.color.setHex(PAINT.raw);
        spandrelMats.push(spMat);
        box(gFacade, W / 2, gy + 0.02, D + 0.04, W + 0.3, 0.52, 0.2, spMat,
          { delay: gStart + 0.1, dur: 0.6, mode: "slideX", edges: false });

        // mullions read as the curtain-wall grid
        if (detail > 0) {
          for (var mb = 0; mb <= NX; mb++) {
            box(gFacade, mb * BX, gy + 0.42, D + 0.06, 0.14, gh + 0.1, 0.16, M.mullion,
              { delay: gStart + 0.2 + mb * 0.06, dur: 0.45, edges: false, shadow: false });
          }
          box(gFacade, W / 2, gy + 0.4 + gh, D + 0.06, W, 0.16, 0.18, M.mullion,
            { delay: gStart + 0.38, dur: 0.5, mode: "slideX", edges: false, shadow: false });
        }
      }

      /* ---- Stage 04: facade articulation ------------------------------
         What turns a painted box into architecture: a recessed feature
         bay, vertical fins on the glazed elevation, horizontal banding at
         every floor line, window reveals and a proper parapet. */
      var accentMat = M.concrete.clone(); accentMat.color.setHex(PAINT.rawDark);
      var bandMat = M.concrete.clone(); bandMat.color.setHex(PAINT.raw);
      var revealMat = M.concrete.clone(); revealMat.color.setHex(PAINT.raw);
      var parapetMat = M.concrete.clone(); parapetMat.color.setHex(PAINT.raw);
      var soffitMat = M.concrete.clone(); soffitMat.color.setHex(PAINT.raw);

      // Feature bay: the open right-hand bay becomes a recessed accent
      // panel with slim vertical fins, in place of the green screen.
      var featY = H + 0.35, featH = (LEVELS - 2) * H;
      box(gFacade, W + 0.04, featY, BZ + BZ / 2, 0.12, featH - 0.4, BZ - 0.7, accentMat,
        { delay: TF, dur: 0.85, mode: "grow", edges: false });
      if (detail > 0) {
        for (var vf = 0; vf < 3; vf++) {
          box(gFacade, W + 0.16, featY + 0.1, BZ + BZ / 2 + (vf - 1) * 0.78, 0.1, featH - 0.6, 0.1, revealMat,
            { delay: TF + 0.3 + vf * 0.09, dur: 0.6, mode: "grow", edges: false, shadow: false });
        }
      }

      // Horizontal banding at each floor line, wrapping the two solid
      // elevations. These carry the dark architectural colour.
      for (var bl2 = 1; bl2 < LEVELS; bl2++) {
        var bandY = bl2 * H + 0.35 - 0.18;
        box(gFacade, W / 2, bandY, -0.1, W + 0.4, 0.3, 0.2, bandMat,
          { delay: TF + 0.2 + bl2 * 0.14, dur: 0.55, mode: "slideX", edges: false });
        box(gFacade, W + 0.1, bandY, D / 2, 0.2, 0.3, D + 0.4, bandMat,
          { delay: TF + 0.28 + bl2 * 0.14, dur: 0.55, mode: "slideZ", edges: false });
      }

      // Parapet: a finished cap all the way round the roof, so the top of
      // the building reads as complete rather than cut off.
      var roofY = (LEVELS - 1) * H + 0.35 + H * 0.55;
      var pt = 0.42;
      box(gRoof, W / 2, roofY, -0.06, W + 0.7, pt, 0.26, parapetMat, { delay: TF + 0.9, dur: 0.6, mode: "slideX", edges: false });
      box(gRoof, W / 2, roofY, D + 0.06, W + 0.7, pt, 0.26, parapetMat, { delay: TF + 1.0, dur: 0.6, mode: "slideX", edges: false });
      box(gRoof, -0.06, roofY, D / 2, 0.26, pt, D + 0.7, parapetMat, { delay: TF + 1.05, dur: 0.6, mode: "slideZ", edges: false });
      box(gRoof, W + 0.06, roofY, D / 2, 0.26, pt, D + 0.7, parapetMat, { delay: TF + 1.1, dur: 0.6, mode: "slideZ", edges: false });
      // roof deck, so nothing structural shows from above
      box(gRoof, W / 2, roofY - 0.06, D / 2, W + 0.5, 0.14, D + 0.5, soffitMat,
        { delay: TF + 0.85, dur: 0.6, mode: "drop", edges: false });
      // slim accent reveal under the parapet cap
      box(gRoof, W / 2, roofY - 0.1, D + 0.12, W + 0.72, 0.1, 0.1, M.trim,
        { delay: TF + 1.25, dur: 0.5, mode: "slideX", edges: false, shadow: false });

      /* ---- Stage 05: the coats go on, bottom to top -------------------
         One coordinated scheme rather than a colour per wall: cream and
         ivory alternate up the field, charcoal bands mark the floor
         lines, deep green takes the core and the glazed spandrels, and
         the accents are kept for the feature bay and the entrance. */
      for (var pl = 0; pl < LEVELS; pl++) {
        // alternating field colour gives the floors subtle variation
        paint(wallMats[pl], PAINT.raw, PAINT.primer, pl % 2 ? PAINT.white : PAINT.ivory, TP + pl * 0.34, 1.6);
        if (spandrelMats[pl]) paint(spandrelMats[pl], PAINT.raw, PAINT.primer, PAINT.silver, TP + 0.2 + pl * 0.34, 1.6);
      }
      var coreMat = M.concreteDark.clone();
      coreMat.color.setHex(PAINT.rawDark);
      coreBox.material = coreMat;
      paint(coreMat, PAINT.rawDark, PAINT.primer, PAINT.slate, TP + 0.45, 1.9);

      var frameMat = M.concrete.clone();
      frameMat.color.setHex(PAINT.raw);
      paint(frameMat, PAINT.raw, PAINT.primer, PAINT.white, TP + 0.15, 1.8);
      for (var fi = 0; fi < frameMeshes.length; fi++) frameMeshes[fi].material = frameMat;

      paint(bandMat, PAINT.raw, PAINT.primer, PAINT.slate, TP + 0.9, 1.7);
      paint(accentMat, PAINT.rawDark, PAINT.primer, PAINT.slate, TP + 1.15, 1.7);
      paint(revealMat, PAINT.raw, PAINT.primer, PAINT.silver, TP + 1.35, 1.5);
      paint(parapetMat, PAINT.raw, PAINT.primer, PAINT.charcoal, TP + 1.5, 1.6);
      paint(soffitMat, PAINT.raw, PAINT.primer, PAINT.beige, TP + 1.5, 1.6);

      /* ---- Stage 06: windows, doors, railings, trims ------------------ */
      // Punched windows on the solid elevations, set in dark frames. The
      // ground floor is left to the entrance, so the rhythm starts at L1.
      var winMat = M.windowGlass.clone();
      var frameDark = M.mullion.clone(); frameDark.color.setHex(PAINT.charcoal);
      for (var wl2 = 1; wl2 < LEVELS - 1; wl2++) {
        var wy2 = wl2 * H + 0.35 + 0.95;
        for (var wb2 = 0; wb2 < NX; wb2++) {
          // rear elevation
          if (detail > 0) {
            box(gWindows, wb2 * BX + BX / 2, wy2, -0.16, BX - 1.28, 1.48, 0.08, frameDark,
              { delay: TD + wb2 * 0.07 + wl2 * 0.18, dur: 0.5, edges: false, shadow: false });
          }
          box(gWindows, wb2 * BX + BX / 2, wy2, -0.22, BX - 1.5, 1.28, 0.08, winMat,
            { delay: TD + 0.05 + wb2 * 0.07 + wl2 * 0.18, dur: 0.5, edges: false, shadow: false });
        }
        // right elevation, end bay only (the middle bay is the feature panel)
        if (detail > 0) {
          box(gWindows, W + 0.16, wy2, BZ / 2, 0.08, 1.48, BZ - 1.28, frameDark,
            { delay: TD + 0.12 + wl2 * 0.18, dur: 0.5, edges: false, shadow: false });
        }
        box(gWindows, W + 0.22, wy2, BZ / 2, 0.08, 1.28, BZ - 1.5, winMat,
          { delay: TD + 0.17 + wl2 * 0.18, dur: 0.5, edges: false, shadow: false });
      }

      // Balconies on the feature bay, with railings
      var balc = [];
      for (var bl = 1; bl < LEVELS - 1; bl++) {
        var byy = bl * H + 0.35;
        box(gDetails, W + 0.7, byy + 0.05, BZ + BZ / 2, 1.5, 0.16, BZ - 0.7, M.slab,
          { delay: TD + 0.25 + bl * 0.3, dur: 0.55, mode: "drop" });
        balc.push({ y: byy, z: BZ + BZ / 2 });
        for (var rp = -1; rp <= 1; rp++) {
          box(gDetails, W + 1.4, byy + 0.13, BZ + BZ / 2 + rp * (BZ - 0.9) / 2, 0.07, 0.95, 0.07, M.rail,
            { delay: TD + 0.45 + bl * 0.3, dur: 0.4, edges: false, shadow: false });
        }
        box(gDetails, W + 1.4, byy + 1.02, BZ + BZ / 2, 0.09, 0.09, BZ - 0.7, M.rail,
          { delay: TD + 0.6 + bl * 0.3, dur: 0.45, mode: "slideZ", edges: false, shadow: false });
        // balcony glass infill
        box(gDetails, W + 1.36, byy + 0.55, BZ + BZ / 2, 0.05, 0.82, BZ - 0.9, M.glassPremium,
          { delay: TD + 0.7 + bl * 0.3, dur: 0.45, edges: false, shadow: false });
      }

      // Entrance: canopy, glass doors, and a warm accent reveal
      box(gDetails, BX / 2, 2.5, D + 1.0, BX + 0.6, 0.18, 2.0, M.slab,
        { delay: TD + 0.8, dur: 0.6, mode: "drop" });
      box(gDetails, BX / 2, 2.34, D + 1.0, BX + 0.3, 0.1, 1.8, M.trim,
        { delay: TD + 0.95, dur: 0.5, mode: "slideX", edges: false, shadow: false });
      box(gDetails, BX / 2, 0.36, D + 0.1, 2.0, 2.1, 0.12, M.door,
        { delay: TD + 1.0, dur: 0.6, edges: false });
      if (detail > 0) {
        box(gDetails, BX / 2, 0.36, D + 0.16, 0.1, 2.1, 0.1, frameDark,
          { delay: TD + 1.15, dur: 0.45, edges: false, shadow: false });
      }

      /* ---- Stage 07: exterior lighting + glass reflection ------------- */
      for (var fx = 0; fx < (detail > 0 ? 4 : 2); fx++) {
        var fm = M.fixture.clone();
        var f = box(gLight, fx * (W / 3) + 0.6, 0.55, D + 1.55, 0.22, 0.5, 0.22, fm,
          { delay: TL + fx * 0.16, dur: 0.5, mode: "pop", edges: false, shadow: false });
        fixtures.push(fm);
      }

      if (detail > 0) {
        // A soft highlight that travels across the curtain wall once the
        // building is done. Additive and very low opacity: a sheen, not a flare.
        var bandMat = new THREE.MeshBasicMaterial({
          color: 0xFFF3E4, transparent: true, opacity: 0, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        });
        var band = new THREE.Mesh(new THREE.PlaneGeometry(2.2, LEVELS * H), bandMat);
        band.position.set(0, LEVELS * H * 0.5, D + 0.22);
        band.rotation.z = 0.12;
        gGlass.add(band);
        reflectBand = { mesh: band, mat: bandMat, x0: -2.5, x1: W + 2.5 };
      }

      /* ---- Stage 09: forecourt and walkway ----------------------------
         Ground-level paving only: a drop-off strip across the entrance
         elevation and a paved pedestrian route back to the door. */
      var gSite = new THREE.Group(); gSite.name = "site-paving"; root.add(gSite);
      var gGarden = new THREE.Group(); gGarden.name = "site-garden"; root.add(gGarden);

      var paveMat = new THREE.MeshStandardMaterial({ color: 0xD3CABB, roughness: 0.95, metalness: 0.02 });
      var paverMat = new THREE.MeshStandardMaterial({ color: 0xC4BAA6, roughness: 0.9, metalness: 0.02 });
      var kerbMat = new THREE.MeshStandardMaterial({ color: 0xB8AB94, roughness: 0.9, metalness: 0.02 });

      // drop-off strip along the entrance elevation
      box(gSite, W / 2 - 0.4, 0.0, D + 2.2, W + 3.0, 0.1, 3.6, paveMat,
        { delay: TK, dur: 0.8, mode: "slideX", edges: false, shadow: false });
      // kerb along the outer edge of the drop-off
      box(gSite, W / 2 - 0.4, 0.06, D + 3.95, W + 3.0, 0.16, 0.16, kerbMat,
        { delay: TK + 0.5, dur: 0.6, mode: "slideX", edges: false, shadow: false });

      // pedestrian walkway: entrance out to the drop-off, and along the front
      box(gSite, BX / 2, 0.08, D + 1.6, 2.4, 0.1, 2.6, paverMat,
        { delay: TK + 0.6, dur: 0.6, mode: "slideZ", edges: false, shadow: false });
      box(gSite, W / 2, 0.08, D + 0.7, W + 1.4, 0.1, 1.3, paverMat,
        { delay: TK + 0.7, dur: 0.6, mode: "slideX", edges: false, shadow: false });

      /* ---- Stage 10: landscaping --------------------------------------
         Ground level only: lawn panels, low shrubs and planter boxes.
         Nothing touches the facade. */
      var lawnMat = new THREE.MeshStandardMaterial({ color: 0x6E8A62, roughness: 0.96, metalness: 0 });
      var shrubMat = new THREE.MeshStandardMaterial({ color: 0x5C7C56, roughness: 0.94, metalness: 0 });
      var boxMat = new THREE.MeshStandardMaterial({ color: 0xB8AB94, roughness: 0.9, metalness: 0.02 });
      var BLOB = new THREE.IcosahedronGeometry(1, 1);

      // a rounded canopy reads as a tree where a cube reads as a crate
      function blob(parent, x, y, z, r, mat, delay) {
        var m = new THREE.Mesh(BLOB, mat);
        m.position.set(x, y, z);
        m.scale.set(r, r * 0.86, r);
        m.castShadow = !small;
        parent.add(m);
        items.push({ obj: m, delay: delay, dur: 0.8, mode: "pop", base: m.position.clone(), scale: m.scale.clone() });
        return m;
      }

      // lawn panels either side of the walkway
      box(gGarden, -1.7, 0.04, D + 2.0, 3.0, 0.09, 3.4, lawnMat,
        { delay: TN, dur: 0.7, mode: "slideZ", edges: false, shadow: false });
      box(gGarden, W * 0.62, 0.04, D + 2.1, 5.6, 0.09, 2.4, lawnMat,
        { delay: TN + 0.15, dur: 0.7, mode: "slideX", edges: false, shadow: false });

      // planter boxes along the building line
      for (var pb = 0; pb < (detail > 0 ? 3 : 2); pb++) {
        box(gGarden, 5.6 + pb * 2.6, 0.06, D + 0.1, 1.6, 0.4, 0.62, boxMat,
          { delay: TN + 0.3 + pb * 0.12, dur: 0.5, edges: false });
        blob(gGarden, 5.6 + pb * 2.6, 0.5, D + 0.1, 0.52, shrubMat, TN + 0.42 + pb * 0.12);
      }

      // low ornamental shrubs on the lawns
      var shrubSpots = detail > 0
        ? [[-2.3, D + 1.2], [-1.1, D + 2.8], [-2.2, D + 3.4], [7.6, D + 2.0], [10.2, D + 2.6]]
        : [[-1.8, D + 2.2], [9.0, D + 2.2]];
      for (var sh = 0; sh < shrubSpots.length; sh++) {
        blob(gGarden, shrubSpots[sh][0], 0.34, shrubSpots[sh][1], 0.46, shrubMat, TN + 0.55 + sh * 0.08);
      }

      // landscape border between lawn and paving
      box(gGarden, W * 0.62, 0.08, D + 0.95, 5.6, 0.14, 0.14, kerbMat,
        { delay: TN + 0.5, dur: 0.5, mode: "slideX", edges: false, shadow: false });

      // bollard lighting along the walkway
      var bollards = detail > 0
        ? [[BX / 2 - 1.6, D + 0.9], [BX / 2 + 1.6, D + 0.9], [BX / 2 - 1.6, D + 2.6], [BX / 2 + 1.6, D + 2.6], [W + 1.2, D + 1.2]]
        : [[BX / 2 - 1.6, D + 1.8], [BX / 2 + 1.6, D + 1.8]];
      for (var bo = 0; bo < bollards.length; bo++) {
        var bm = M.fixture.clone();
        box(gLight, bollards[bo][0], 0.1, bollards[bo][1], 0.15, 0.8, 0.15, bm,
          { delay: TN + 1.15 + bo * 0.1, dur: 0.5, mode: "grow", edges: false, shadow: false });
        fixtures.push(bm);
      }

      doneAt = TN + 1.3;

      /* Labels are a running commentary on the programme: each stage
         announces itself and stands down when the next one starts, so the
         finished building is left with three, not ten. */
      anchors = [
        { p: new THREE.Vector3(W / 2, 0.1, dz + 0.8), text: "Grid A — D", at: t + 0.5, until: TG },
        { p: new THREE.Vector3(-2.6, hTop * 0.62, D), text: "Levels 00 — 0" + (LEVELS - 1), at: t + 0.6 },
        /* the rods this used to point at are struck during finishing, so
           it now annotates the completed roofline instead of empty air */
        { p: new THREE.Vector3(BX, roofY + 0.45, 0), text: "Built for what’s next", at: t + 0.8 },
        { p: new THREE.Vector3(W * 0.62, H * 0.4, D + 0.1), text: "Finishing layer", at: ft + 0.6, until: TD },
        { p: new THREE.Vector3(W, 2 * H + 2.2, D), text: "RCC frame", at: t + 0.7, until: TP },
        { p: new THREE.Vector3(W + 0.75, 0.2, D * 0.5), text: "Substrate · footings", at: 0.9, until: TW + 0.6 },
        { p: new THREE.Vector3(W * 0.5, 2.2 * H, -0.2), text: "Blockwork · plaster", at: TW + 1.2, until: TG + 0.8 },
        { p: new THREE.Vector3(W * 0.5, 3.1 * H, D + 0.4), text: "Glazing · curtain wall", at: TG + 1.2, until: TP + 0.8 },
        { p: new THREE.Vector3(W + 0.6, 1.6 * H, D - 0.6), text: "Facade · finishes", at: TF + 1.2, until: TP + 0.6 },
        { p: new THREE.Vector3(W + 0.6, 1.2 * H, D - 0.6), text: "Paint · exterior finish", at: TP + 1.3, until: TD + 0.6 },
        { p: new THREE.Vector3(W * 0.34, 0.35, D + 3.1), text: "Handover ready", at: TN + 1.1 }
      ];
    }

    /* ======================================================================
       Scene: civil & infrastructure site
       ====================================================================== */
    function buildCivil() {
      var W = 26, D = 18;
      center.set(W / 2, 1.5, D / 2);
      span = 30;
      var t = 0.2;

      // Site boundary
      line(root, [[0, 0.02, 0], [W, 0.02, 0], [W, 0.02, 0], [W, 0.02, D], [W, 0.02, D], [0, 0.02, D], [0, 0.02, D], [0, 0.02, 0]], EDGE_ACC, 0.05);

      // 1. Pipeline trench along the front with pipe + backfill (cut-away below ground)
      var tz = D - 3;
      box(root, W / 2, -1.6, tz, W - 4, 0.08, 1.8, M.soil, { delay: t, dur: 0.6, mode: "slideX", edges: true });
      box(root, W / 2, -1.6, tz - 0.9, W - 4, 1.6, 0.06, M.soil, { delay: t + 0.1, dur: 0.6, mode: "slideX", shadow: false });
      var pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, W - 5, 24, 1, false), M.steel);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(W / 2, -1.05, tz);
      pipe.castShadow = !small;
      root.add(pipe);
      items.push({ obj: pipe, delay: t + 0.5, dur: 0.9, mode: "pipe", base: pipe.position.clone(), scale: pipe.scale.clone() });
      box(root, W / 2 - 3, -1.52, tz, W - 10, 0.9, 1.7, M.fill, { delay: t + 1.2, dur: 0.8, mode: "slideX", edges: false, shadow: false });
      t += 0.8;

      // 2. Isolated footings with pedestals + plinth beams (structural)
      for (var i = 0; i < 3; i++) for (var k = 0; k < 2; k++) {
        var fx = 2.5 + i * 3.4, fz = 2.5 + k * 3.6;
        box(root, fx, -0.9, fz, 1.8, 0.6, 1.8, M.concreteDark, { delay: t + (i + k) * 0.06, dur: 0.5 });
        box(root, fx, -0.3, fz, 0.6, 1.6, 0.6, M.concrete, { delay: t + 0.3 + (i + k) * 0.06, dur: 0.5 });
      }
      for (var pb = 0; pb < 2; pb++) box(root, 2.5 + 3.4, 1.0, 2.5 + pb * 3.6, 6.8, 0.4, 0.34, M.concrete, { delay: t + 0.7, dur: 0.5, mode: "slideX" });
      for (var pc = 0; pc < 3; pc++) box(root, 2.5 + pc * 3.4, 1.0, 2.5 + 1.8, 0.34, 0.4, 3.6, M.concrete, { delay: t + 0.8, dur: 0.5, mode: "slideZ" });
      t += 0.9;

      // 3. Control room building (single storey frame + slab + walls)
      var cr = { x: 2.5, z: 2.5, w: 6.8, d: 3.6, h: 3 };
      for (var a = 0; a < 3; a++) for (var b = 0; b < 2; b++) box(root, cr.x + a * 3.4, 1.2, cr.z + b * 3.6, 0.4, cr.h, 0.4, M.concrete, { delay: t + a * 0.05, dur: 0.5 });
      box(root, cr.x + cr.w / 2, 1.2 + cr.h, cr.z + cr.d / 2, cr.w + 0.8, 0.22, cr.d + 0.8, M.slab, { delay: t + 0.4, dur: 0.6, mode: "drop", edgeMat: EDGE_ACC });
      box(root, cr.x + cr.w / 2, 1.2, cr.z - 0.02, cr.w - 0.4, cr.h - 0.1, 0.12, M.stone, { delay: t + 0.8, dur: 0.6 });
      t += 0.9;

      // 4. Substation: equipment foundations + transformer blocks
      for (var e = 0; e < 3; e++) {
        var ex = 14 + e * 3.6, ez = 3.2;
        box(root, ex, 0, ez, 2.6, 0.5, 3.2, M.concreteDark, { delay: t + e * 0.12, dur: 0.5 });
        box(root, ex, 0.5, ez, 1.7, 1.8, 2.2, M.steel, { delay: t + 0.4 + e * 0.12, dur: 0.6 });
        box(root, ex, 2.3, ez, 0.2, 1.2, 0.2, M.accent, { delay: t + 0.8 + e * 0.12, dur: 0.4, edges: false });
      }
      t += 0.8;

      // 5. Cable trench (U-section) with cover slabs, running from substation to control room
      var cz = 8.6;
      box(root, 9.9 + 7, -0.6, cz, 14, 0.12, 1.2, M.concreteDark, { delay: t, dur: 0.6, mode: "slideX" });
      box(root, 9.9 + 7, -0.6, cz - 0.6, 14, 0.62, 0.12, M.concrete, { delay: t + 0.15, dur: 0.6, mode: "slideX" });
      box(root, 9.9 + 7, -0.6, cz + 0.6, 14, 0.62, 0.12, M.concrete, { delay: t + 0.15, dur: 0.6, mode: "slideX" });
      for (var cs = 0; cs < 7; cs++) box(root, 10.6 + cs * 1.4, 0.02, cz, 1.3, 0.1, 1.4, M.slab, { delay: t + 0.5 + cs * 0.07, dur: 0.4, mode: "drop" });
      // Cables
      line(root, [[10, -0.35, cz - 0.25], [24, -0.35, cz - 0.25], [10, -0.35, cz], [24, -0.35, cz], [10, -0.35, cz + 0.25], [24, -0.35, cz + 0.25]], EDGE_ACC, t + 0.3);
      t += 1.0;

      // 6. Chain-link / barbed wire boundary fence (posts + mesh lines)
      var posts = [], mesh = [], wire = [];
      var ph = 2.4;
      function run(x1, z1, x2, z2, n) {
        for (var p = 0; p <= n; p++) {
          var u = p / n, x = x1 + (x2 - x1) * u, z = z1 + (z2 - z1) * u;
          posts.push([x, 0, z]);
          if (p < n) {
            var nx = x1 + (x2 - x1) * ((p + 1) / n), nz = z1 + (z2 - z1) * ((p + 1) / n);
            // Diamond chain-link pattern
            for (var q = 0; q < 6; q++) {
              var f0 = q / 6, f1 = (q + 1) / 6;
              var ax = x + (nx - x) * f0, az = z + (nz - z) * f0;
              var bx = x + (nx - x) * f1, bz = z + (nz - z) * f1;
              mesh.push([ax, 0.1, az], [bx, ph - 0.2, bz], [ax, ph - 0.2, az], [bx, 0.1, bz]);
            }
            wire.push([x, ph, z], [nx, ph, nz], [x, ph + 0.3, z], [nx, ph + 0.3, nz], [x, ph + 0.55, z], [nx, ph + 0.55, nz]);
          }
        }
      }
      run(-1, -1, W + 1, -1, 12);
      run(W + 1, -1, W + 1, D + 1, 9);
      run(-1, -1, -1, D + 1, 9);
      posts.forEach(function (pp, i2) {
        box(root, pp[0], 0, pp[2], 0.12, ph + 0.6, 0.12, M.steel, { delay: t + i2 * 0.018, dur: 0.4, edges: false, shadow: false });
      });
      var meshMat = new THREE.LineBasicMaterial({ color: LIGHT ? 0x9C8259 : 0xD1C1A5, transparent: true, opacity: 0.18 });
      line(root, mesh, meshMat, t + 0.7);
      line(root, wire, EDGE_ACC, t + 0.9);

      anchors = [
        { p: new THREE.Vector3(18, 2.6, 3.2), text: "Equipment foundations", at: 2.4 },
        { p: new THREE.Vector3(20, 0.2, cz), text: "Cable trench", at: 3.4 },
        { p: new THREE.Vector3(W * 0.7, -1.0, tz), text: "Pipeline · backfilling", at: 1.4 },
        { p: new THREE.Vector3(cr.x + 1.2, cr.h + 1.6, cr.z), text: "Control room building", at: 2.6 },
        { p: new THREE.Vector3(W + 1, ph, D * 0.55), text: "Chain link fencing", at: 4.4 },
        { p: new THREE.Vector3(2.5, -0.6, 6.1), text: "Foundations · RCC", at: 1.9 }
      ];
    }

    root.position.set(-center.x, 0, -center.z);

    /* ---------- Dust particles ---------- */
    var pCount = small ? 70 : 260;
    var pGeo = new THREE.BufferGeometry();
    var pPos = new Float32Array(pCount * 3);
    var pSeed = new Float32Array(pCount);
    for (var i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * span * 1.6;
      pPos[i * 3 + 1] = Math.random() * span * 0.8;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * span * 1.6;
      pSeed[i] = Math.random() * Math.PI * 2;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    var dust = new THREE.Points(pGeo, new THREE.PointsMaterial({ color: LIGHT ? 0x8A7A63 : 0xD1C1A5, size: 0.07, transparent: true, opacity: LIGHT ? 0.4 : 0.55, depthWrite: false }));
    scene.add(dust);

    /* ---------- Prepare assembly state ---------- */
    items.forEach(function (it) {
      if (it.mode === "show") { it.obj.visible = reduced; return; }
      if (reduced) return;
      applyItem(it, 0);
    });

    function applyItem(it, p) {
      var o = it.obj;
      if (it.mode === "show") { o.visible = p > 0; return; }
      var e = easeOutCubic(p);
      var s = it.scale;
      o.visible = p > 0.001;
      switch (it.mode) {
        case "grow": // rises from its base
          o.scale.set(s.x, Math.max(0.0001, s.y * e), s.z);
          break;
        case "brace": // diagonal member: grows along its own axis
          o.scale.set(Math.max(0.0001, s.x * e), s.y, s.z);
          break;
        case "slideX":
          o.scale.set(Math.max(0.0001, s.x * e), s.y, s.z);
          break;
        case "slideZ":
          o.scale.set(s.x, s.y, Math.max(0.0001, s.z * e));
          break;
        case "drop": // lowered into place, as if craned in
          o.position.y = it.base.y + (1 - easeOutBack(p)) * 3.2;
          break;
        case "pipe":
          o.scale.set(s.x, Math.max(0.0001, s.y * e), s.z);
          o.position.y = it.base.y + (1 - e) * 2.5;
          break;
        case "slideIn": // travels in from outside the facade, as if lifted into the opening
          o.position.set(
            it.base.x + it.from.x * (1 - e),
            it.base.y + it.from.y * (1 - e),
            it.base.z + it.from.z * (1 - e)
          );
          o.scale.set(s.x, s.y, s.z);
          break;
        case "pop": // small fittings settle into place
          var b = easeOutBack(p);
          o.scale.set(s.x * b, s.y * b, s.z * b);
          break;
      }
    }

    /* ---------- Paint stage -------------------------------------------
       Raw concrete → primer → finished coat. Each job owns its own
       material clone, so levels can be painted bottom-to-top.
       (`paintJobs` itself is declared above the scene builders, which
       fill it while they lay out the geometry.) */
    function paint(mat, from, mid, to, at, dur) {
      paintJobs.push({ mat: mat, from: from, mid: mid, to: to, at: at, dur: dur || 1.6 });
    }

    function applyPaint(job, p) {
      var m = job.mat;
      if (p <= 0) { m.color.setHex(job.from); return; }
      if (p >= 1) { m.color.setHex(job.to); return; }
      if (p < 0.42) {            // priming coat
        _cFrom.setHex(job.from); _cMid.setHex(job.mid);
        m.color.copy(_cFrom).lerp(_cMid, easeOutCubic(p / 0.42));
      } else {                   // finish coat
        _cMid.setHex(job.mid); _cTo.setHex(job.to);
        m.color.copy(_cMid).lerp(_cTo, easeOutCubic((p - 0.42) / 0.58));
      }
    }

    /* ---------- HUD labels ---------- */
    var labelLayer = hero.querySelector("[data-labels]");
    var labels = anchors.map(function (a) {
      var el = document.createElement("span");
      el.className = "hud-label";
      el.textContent = a.text;
      labelLayer.appendChild(el);
      return { el: el, p: a.p, at: a.at, until: a.until || Infinity, world: new THREE.Vector3() };
    });

    /* ---------- Sizing & composition ---------- */
    var W = 1, Hh = 1;
    function resize() {
      var r = hero.getBoundingClientRect();
      W = Math.max(1, Math.round(r.width));
      Hh = Math.max(1, Math.round(r.height));
      small = W < 760;
      renderer.setSize(W, Hh, false);
      camera.aspect = W / Hh;
      // Desktop: shift the scene to the right so the copy sits on clean space
      if (W >= 1025) camera.setViewOffset(W, Hh, -W * 0.2, 0, W, Hh);
      // Tablets stack the copy over the scene, so the finished building —
      // now a solid mass rather than an open frame — is pushed further
      // right and down to keep clear of the headline.
      else if (W >= 760) camera.setViewOffset(W, Hh, -W * 0.2, -Hh * 0.06, W, Hh);
      else camera.setViewOffset(W, Hh, 0, Hh * 0.2, W, Hh);
      camera.updateProjectionMatrix();
      needsRender = true;
    }

    /* ---------- Interaction state ---------- */
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    if (AE.finePointer()) {
      window.addEventListener("pointermove", function (e) {
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = (e.clientY / window.innerHeight) * 2 - 1;
      }, { passive: true });
    }
    var scrollP = 0;
    AE.onScroll(function (y) { scrollP = AE.clamp(y / (Hh || 1), 0, 1); needsRender = true; kick(); });

    /* Run only while visible and the tab is active */
    var visible = true, running = false, needsRender = true;
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { threshold: 0 }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () { if (!document.hidden) kick(); });
    document.addEventListener("ae:motion", function (e) { reduced = e.detail.reduced; if (reduced) finishAssembly(); kick(); });

    var clock = new THREE.Clock(false);
    var buildT = 0;         // assembly timeline (seconds)
    var buildStarted = false;
    var totalBuild = items.reduce(function (m, it) { return Math.max(m, it.delay + it.dur); }, 0);

    function finishAssembly() {
      buildT = totalBuild + 1;
      items.forEach(function (it) { applyItem(it, 1); });
      // Reduced motion lands on the completed building: painted, glazed,
      // planted, crane struck — just with none of the sequence or drift.
      paintJobs.forEach(function (job) { applyPaint(job, 1); });
      craneMats.forEach(function (m) { m.opacity = 0; });
      strikes.forEach(function (st) { st.mat.opacity = 0; });
      gridFade.mats.forEach(function (m, i) { m.opacity = gridFade.to[i]; });
      fixtures.forEach(function (m) { m.emissiveIntensity = 0.75; });
      if (reflectBand) reflectBand.mat.opacity = 0;
      needsRender = true;
    }

    function startBuild() { buildStarted = true; hero.classList.add("is-3d"); kick(); }
    if (reduced) { finishAssembly(); }
    if (document.documentElement.classList.contains("is-ready")) startBuild();
    else document.addEventListener("ae:ready", startBuild);

    var camPos = new THREE.Vector3();
    var look = new THREE.Vector3();
    var tmp = new THREE.Vector3();
    var baseDist = sceneName === "civil" ? 56 : 68;
    var elapsed = 0;

    /* Cinematic orbit: once the project is handed over the camera makes one
       slow, eased revolution and returns to exactly the hero angle, so the
       loop closes without a jump. Reduced motion and the civil scene skip it. */
    var ORBIT_DUR = 46;          // seconds for the full 360
    var ORBIT_HOLD = 2.5;        // beat on the finished building first
    var orbitT = 0, orbitDone = false;

    function frame() {
      running = false;
      if (!visible || document.hidden) return;
      var dt = Math.min(0.05, clock.getDelta());
      elapsed += dt;

      // Assembly
      if (buildStarted && buildT <= totalBuild + 0.5) {
        buildT += dt * 1.3; // assembly runs a little faster than real time
        for (var i2 = 0; i2 < items.length; i2++) {
          var it = items[i2];
          applyItem(it, AE.clamp((buildT - it.delay) / it.dur, 0, 1));
        }
        // Paint washes over the finished surfaces on the same clock
        for (var pj = 0; pj < paintJobs.length; pj++) {
          var job = paintJobs[pj];
          applyPaint(job, AE.clamp((buildT - job.at) / job.dur, 0, 1));
        }
        // The site tidies itself as the project completes: the crane
        // strikes, the setting-out grid drops back, the lights come on.
        if (doneAt) {
          var fin = AE.clamp((buildT - (doneAt - 2.4)) / 2.4, 0, 1);
          for (var cm = 0; cm < craneMats.length; cm++) craneMats[cm].opacity = 0.5 * (1 - fin);
          for (var gm = 0; gm < gridFade.mats.length; gm++) {
            gridFade.mats[gm].opacity = gridFade.from[gm] + (gridFade.to[gm] - gridFade.from[gm]) * fin;
          }
          for (var fq = 0; fq < fixtures.length; fq++) fixtures[fq].emissiveIntensity = fin * 0.9;
        }
        for (var sk = 0; sk < strikes.length; sk++) {
          var st = strikes[sk];
          st.mat.opacity = st.from * (1 - AE.clamp((buildT - st.at) / st.dur, 0, 1));
        }
        needsRender = true;
      }

      // Camera: slow orbit + scroll-driven rise + mouse parallax
      var motion = !reduced;
      mouse.x = AE.lerp(mouse.x, motion ? mouse.tx : 0, 0.045);
      mouse.y = AE.lerp(mouse.y, motion ? mouse.ty : 0, 0.045);
      var idle = motion ? Math.sin(elapsed * 0.09) * 0.22 : 0;

      /* One 360 orbit after handover, eased in and out so it never lurches. */
      var orbit = 0;
      if (motion && sceneName !== "civil" && doneAt && !orbitDone && buildT > doneAt + ORBIT_HOLD) {
        orbitT += dt;
        var op = AE.clamp(orbitT / ORBIT_DUR, 0, 1);
        orbit = (0.5 - Math.cos(op * Math.PI) * 0.5) * Math.PI * 2;   // ease-in-out, 0 -> 2pi
        if (op >= 1) { orbitDone = true; orbit = 0; }
      }

      var ang = 0.72 + idle + orbit + mouse.x * 0.12 + scrollP * 0.5;
      /* Architectural reveal: the camera starts low, looking up at the
         foundations, and climbs as the structure does — so the height of
         the building is discovered rather than presented. */
      var reveal = sceneName === "civil" ? 1 : AE.clamp(buildT / (doneAt || 1), 0, 1);
      var revealE = 0.5 - Math.cos(reveal * Math.PI) * 0.5;          // ease in-out
      var dist = baseDist * (small ? 1.25 : 1) * (0.84 + revealE * 0.16) - scrollP * 8;
      var elev = (sceneName === "civil" ? 24 : 7 + revealE * 12) + scrollP * 10 - mouse.y * 2.2;
      camPos.set(Math.sin(ang) * dist, elev, Math.cos(ang) * dist);
      camera.position.copy(camPos);
      look.set(0, sceneName === "civil" ? 0.5 : center.y * (0.5 + revealE * 0.55) - scrollP * 2, 0);
      camera.lookAt(look);

      // "Exploded" storeys as the visitor scrolls away (technical section view)
      for (var g = 0; g < levelGroups.length; g++) levelGroups[g].position.y = g * scrollP * 1.1;

      // Light sweep across the structure every ~9 s
      if (motion) {
        var sw = (elapsed % 9) / 9;
        sweep.position.set(-span + sw * span * 2, center.y + 4, span * 0.45);
        sweep.intensity = Math.sin(sw * Math.PI) * 60;
      } else sweep.intensity = 0;

      /* ---- Ambient life on the completed building --------------------
         Runs only once the build is done, and never rebuilds it. */
      if (motion && doneAt && buildT > doneAt) {
        // a soft sheen travels across the curtain wall every ~11 s
        if (reflectBand) {
          var rp2 = (elapsed % 11) / 11;
          reflectBand.mesh.position.x = reflectBand.x0 + (reflectBand.x1 - reflectBand.x0) * rp2;
          reflectBand.mat.opacity = Math.sin(rp2 * Math.PI) * 0.14;
        }
        // exterior fixtures settle to a gentle glow
        for (var fz = 0; fz < fixtures.length; fz++) {
          fixtures[fz].emissiveIntensity = 0.75 + Math.sin(elapsed * 0.6 + fz) * 0.12;
        }
      }

      // Dust drift
      if (motion) {
        var arr = pGeo.attributes.position.array;
        for (var k = 0; k < pCount; k++) {
          arr[k * 3 + 1] += 0.004 + Math.sin(elapsed + pSeed[k]) * 0.002;
          arr[k * 3] += Math.cos(elapsed * 0.3 + pSeed[k]) * 0.003;
          if (arr[k * 3 + 1] > span * 0.8) arr[k * 3 + 1] = 0;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      needsRender = false;
      updateLabels();

      // Keep animating unless reduced motion is on and nothing changed
      if (motion || needsRender) kick();
    }

    function updateLabels() {
      if (small) return;
      var anyOn = false;
      for (var i3 = 0; i3 < labels.length; i3++) {
        var lb = labels[i3];
        lb.world.copy(lb.p);
        root.localToWorld(lb.world);
        tmp.copy(lb.world).project(camera);
        var x = (tmp.x * 0.5 + 0.5) * W;
        var y = (-tmp.y * 0.5 + 0.5) * Hh;
        var on = tmp.z < 1 && x > W * 0.42 && x < W - 40 && y > 90 && y < Hh - 110 &&
          buildT > lb.at && buildT < lb.until;
        lb.el.classList.toggle("is-off", !on);
        lb.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) translate(12px,-50%)";
        if (on) anyOn = true;
      }
      if (anyOn) hero.classList.add("labels-on");
    }

    function kick() {
      if (running || !clock) return; // clock is created later in setup
      running = true;
      if (!clock.running) clock.start();
      window.requestAnimationFrame(frame);
    }

    window.addEventListener("resize", function () { resize(); kick(); });
    resize();
    kick();
  }
})();
