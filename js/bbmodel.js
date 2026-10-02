/* ============================================================
   Lector de archivos .bbmodel (Blockbench) para el visor 3D
   - Lee cubos, mallas, grupos (huesos), texturas y animaciones directamente
     del proyecto de Blockbench, sin exportar a glTF.
   - Uso:  const { scene, player } = await BBModel.load(THREE, "models/mi-modelo.bbmodel");
   - Las animaciones se reproducen en bucle (así se ven siempre en movimiento).
   ============================================================ */
const BBModel = (() => {
  const DEG = Math.PI / 180;
  const FACES = ["east", "west", "up", "down", "south", "north"]; // mismo orden que BoxGeometry

  /* ---------- Valores: números o expresiones Molang (math.sin(query.anim_time * 90)...) ---------- */
  const NUM = /^\s*-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?\s*$/i;
  const MATH = {
    sin: d => Math.sin(d * DEG), cos: d => Math.cos(d * DEG), tan: d => Math.tan(d * DEG),
    asin: x => Math.asin(x) / DEG, acos: x => Math.acos(x) / DEG, atan: x => Math.atan(x) / DEG,
    atan2: (y, x) => Math.atan2(y, x) / DEG,
    abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round, trunc: Math.trunc,
    sqrt: Math.sqrt, pow: Math.pow, exp: Math.exp, ln: Math.log, min: Math.min, max: Math.max,
    clamp: (v, a, b) => Math.min(Math.max(v, a), b), lerp: (a, b, t) => a + (b - a) * t,
    mod: (a, b) => a % b, pi: Math.PI, random: Math.random
  };
  const ZERO = new Proxy({}, { get: () => 0 });

  function valueOf(raw) {
    if (typeof raw === "number") return () => raw;
    const s = String(raw ?? "0").trim();
    if (s === "") return () => 0;
    if (NUM.test(s)) { const n = parseFloat(s); return () => n; }
    const src = s.toLowerCase().replace(/\bq\./g, "query.").replace(/\bv\./g, "variable.").replace(/\bm\./g, "math.");
    if (!/^[\w\s+\-*/%().,?:<>=!&|]+$/.test(src)) return () => 0;
    let fn;
    try { fn = new Function("math", "query", "variable", "return (" + src + ");"); } catch (e) { return () => 0; }
    return t => {
      try {
        const query = new Proxy({}, { get: (_, k) => (k === "anim_time" || k === "life_time") ? t : 0 });
        const v = fn(MATH, query, ZERO);
        return Number.isFinite(v) ? v : 0;
      } catch (e) { return 0; }
    };
  }

  /* ---------- Interpolación entre fotogramas clave ---------- */
  const catmull = (p0, p1, p2, p3, s) =>
    0.5 * (2 * p1 + (-p0 + p2) * s + (2 * p0 - 5 * p1 + 4 * p2 - p3) * s * s + (-p0 + 3 * p1 - 3 * p2 + p3) * s * s * s);

  function bezier(a, b, ax, v0, v1, t) {
    const x0 = a.time, x3 = b.time;
    const clamp = x => Math.min(Math.max(x, x0), x3);
    const x1 = clamp(a.time + a.rt[ax]), x2 = clamp(b.time + b.lt[ax]);
    const y1 = v0 + a.rv[ax], y2 = v1 + b.lv[ax];
    const bez = (p0, p1, p2, p3, s) => {
      const u = 1 - s;
      return u * u * u * p0 + 3 * u * u * s * p1 + 3 * u * s * s * p2 + s * s * s * p3;
    };
    let lo = 0, hi = 1;
    for (let i = 0; i < 24; i++) {                 // busca el punto de la curva que corresponde al tiempo t
      const mid = (lo + hi) / 2;
      if (bez(x0, x1, x2, x3, mid) < t) lo = mid; else hi = mid;
    }
    return bez(v0, y1, y2, v1, (lo + hi) / 2);
  }

  function sample(list, t, loop) {
    const n = list.length;
    let i = -1;
    for (let k = 0; k < n; k++) { if (list[k].time <= t + 1e-6) i = k; else break; }
    const ev = (key, which) => key[which].map(f => f(t));
    if (i === -1) return ev(list[0], "pre");
    const a = list[i];
    if (i === n - 1) return ev(a, "post");
    const b = list[i + 1];
    const span = b.time - a.time;
    if (a.interp === "step" || span <= 0) return ev(a, "post");
    const s = (t - a.time) / span;
    const va = ev(a, "post"), vb = ev(b, "pre");
    if (a.interp === "catmullrom" || b.interp === "catmullrom") {
      const p0 = ev(i > 0 ? list[i - 1] : (loop ? list[n - 1] : a), "post");
      const p3 = ev(i + 2 < n ? list[i + 2] : (loop ? list[0] : b), "pre");
      return va.map((p1, ax) => catmull(p0[ax], p1, vb[ax], p3[ax], s));
    }
    if (a.interp === "bezier" || b.interp === "bezier") return va.map((v0, ax) => bezier(a, b, ax, v0, vb[ax], t));
    return va.map((v0, ax) => v0 + (vb[ax] - v0) * s);
  }

  function makeKey(k) {
    const pts = k.data_points && k.data_points.length ? k.data_points : [{ x: 0, y: 0, z: 0 }];
    const conv = p => [valueOf(p.x), valueOf(p.y), valueOf(p.z)];
    const arr = (v, d) => Array.isArray(v) ? v : [d, d, d];
    return {
      time: Number(k.time) || 0, interp: k.interpolation || "linear",
      pre: conv(pts[0]), post: conv(pts[pts.length - 1]),
      lt: arr(k.bezier_left_time, -0.1), lv: arr(k.bezier_left_value, 0),
      rt: arr(k.bezier_right_time, 0.1), rv: arr(k.bezier_right_value, 0)
    };
  }

  const labelOf = n => String(n || "animación").replace(/^animation\.[^.]*\./i, "").replace(/^animation\./i, "");

  /* ---------- Carga del modelo ---------- */
  async function load(THREE, url, opts = {}) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("No se pudo leer " + url + " (" + res.status + ")");
    const json = await res.json();
    const resolution = json.resolution || { width: 64, height: 64 };
    const base = new URL(url, location.href);
    const signRot = (opts.signs && opts.signs.rot) || [1, 1, 1];   // por si algún eje se ve invertido
    const signPos = (opts.signs && opts.signs.pos) || [1, 1, 1];

    // Texturas (incrustadas en el .bbmodel, o junto al archivo)
    const textures = await Promise.all((json.textures || []).map(async t => {
      const sources = t.source ? [t.source] : [t.relative_path, t.name].filter(Boolean).map(f => {
        try { return new URL(f, base).href; } catch (e) { return null; }
      }).filter(Boolean);
      for (const src of sources) {
        try {
          const tex = await new THREE.TextureLoader().loadAsync(src);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.magFilter = tex.minFilter = THREE.NearestFilter;
          tex.generateMipmaps = false;
          return {
            mat: new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.1, side: THREE.DoubleSide }),
            w: t.uv_width || resolution.width || tex.image.width,
            h: t.uv_height || resolution.height || tex.image.height
          };
        } catch (e) { /* prueba la siguiente */ }
      }
      console.warn("[bbmodel] No se pudo cargar la textura", t.name);
      return null;
    }));
    const hidden = new THREE.MeshBasicMaterial({ visible: false });
    const texOf = f => (f && f.texture != null && f.texture !== false) ? textures[Number(f.texture)] || null : null;

    const place = (obj, o, r, parentOrigin) => {
      obj.rotation.order = "ZYX";                       // orden de rotación de Blockbench
      obj.rotation.set(r[0] * DEG, r[1] * DEG, r[2] * DEG);
      obj.position.set(o[0] - parentOrigin[0], o[1] - parentOrigin[1], o[2] - parentOrigin[2]);
      return obj;
    };

    function buildCube(el, parentOrigin) {
      const from = el.from, to = el.to, inf = el.inflate || 0;
      const o = el.origin || [0, 0, 0];
      const geo = new THREE.BoxGeometry(
        Math.abs(to[0] - from[0]) + inf * 2, Math.abs(to[1] - from[1]) + inf * 2, Math.abs(to[2] - from[2]) + inf * 2);
      const uv = geo.attributes.uv;
      const mats = FACES.map((name, i) => {
        const f = (el.faces || {})[name], t = texOf(f);
        if (!t || !f.uv) return hidden;
        const [x1, y1, x2, y2] = f.uv;
        let c = [[x1, y1], [x2, y1], [x1, y2], [x2, y2]];                 // arriba-izq, arriba-der, abajo-izq, abajo-der
        const turns = (((f.rotation || 0) % 360) + 360) % 360 / 90;
        for (let k = 0; k < turns; k++) c = [c[2], c[0], c[3], c[1]];     // gira la textura 90° en sentido horario
        c.forEach(([px, py], j) => uv.setXY(i * 4 + j, px / t.w, 1 - py / t.h));
        return t.mat;
      });
      const mesh = new THREE.Mesh(geo, mats);
      mesh.position.set((from[0] + to[0]) / 2 - o[0], (from[1] + to[1]) / 2 - o[1], (from[2] + to[2]) / 2 - o[2]);
      const pivot = place(new THREE.Group(), o, el.rotation || [0, 0, 0], parentOrigin);
      pivot.add(mesh);
      return pivot;
    }

    function buildMesh(el, parentOrigin) {
      const o = el.origin || [0, 0, 0], verts = el.vertices || {};
      const byTex = new Map();
      Object.values(el.faces || {}).forEach(f => {
        const ids = f.vertices || [], t = texOf(f);
        if (ids.length < 3 || !t) return;
        if (!byTex.has(t)) byTex.set(t, { pos: [], uvs: [] });
        const d = byTex.get(t);
        for (let k = 1; k < ids.length - 1; k++) {
          [ids[0], ids[k], ids[k + 1]].forEach(id => {
            const v = verts[id] || [0, 0, 0], uv = (f.uv && f.uv[id]) || [0, 0];
            d.pos.push(v[0], v[1], v[2]);
            d.uvs.push(uv[0] / t.w, 1 - uv[1] / t.h);
          });
        }
      });
      const pivot = place(new THREE.Group(), o, el.rotation || [0, 0, 0], parentOrigin);
      byTex.forEach((d, t) => {
        const g = new THREE.BufferGeometry();
        g.setAttribute("position", new THREE.Float32BufferAttribute(d.pos, 3));
        g.setAttribute("uv", new THREE.Float32BufferAttribute(d.uvs, 2));
        g.computeVertexNormals();
        pivot.add(new THREE.Mesh(g, t.mat));
      });
      return pivot;
    }

    // Jerarquía: grupos (huesos) y elementos
    const elements = new Map((json.elements || []).map(e => [e.uuid, e]));
    const bones = new Map();
    const root = new THREE.Group();

    function addNode(node, parent, parentOrigin) {
      if (typeof node === "string") {
        const el = elements.get(node);
        if (!el || el.export === false || el.visibility === false) return;
        try {
          const obj = el.type === "mesh" ? buildMesh(el, parentOrigin)
                    : (!el.type || el.type === "cube") ? buildCube(el, parentOrigin) : null;
          if (obj) parent.add(obj);
        } catch (e) { console.warn("[bbmodel] Elemento omitido:", el.name, e); }
        return;
      }
      if (node.export === false || node.visibility === false) return;
      const o = node.origin || [0, 0, 0];
      const g = place(new THREE.Group(), o, node.rotation || [0, 0, 0], parentOrigin);
      g.name = node.name || "";
      bones.set(node.uuid, {
        obj: g, name: node.name,
        px: g.position.x, py: g.position.y, pz: g.position.z,
        rx: g.rotation.x, ry: g.rotation.y, rz: g.rotation.z
      });
      parent.add(g);
      (node.children || []).forEach(c => addNode(c, g, o));
    }
    (json.outliner || []).forEach(n => addNode(n, root, [0, 0, 0]));

    // Animaciones
    const all = (json.animations || []).map(a => {
      const tracks = [];
      Object.entries(a.animators || {}).forEach(([key, an]) => {
        const bone = bones.get(key) || [...bones.values()].find(b => b.name === an.name);
        if (!bone || (an.type && an.type !== "bone")) return;
        const channels = {};
        (an.keyframes || []).forEach(k => {
          if (k.channel === "rotation" || k.channel === "position" || k.channel === "scale") {
            (channels[k.channel] = channels[k.channel] || []).push(makeKey(k));
          }
        });
        Object.values(channels).forEach(list => list.sort((p, q) => p.time - q.time));
        if (Object.keys(channels).length) tracks.push({ bone, channels });
      });
      return { name: labelOf(a.name), fullName: a.name, length: Number(a.length) || 0, loop: a.loop || "once", tracks };
    });
    const animations = all.filter(a => a.tracks.length > 0);

    const st = { cur: -1, time: 0, paused: false };
    function apply() {
      bones.forEach(b => {                                   // pose base
        b.obj.position.set(b.px, b.py, b.pz);
        b.obj.rotation.set(b.rx, b.ry, b.rz);
        b.obj.scale.set(1, 1, 1);
      });
      const an = animations[st.cur];
      if (!an) return;
      const t = an.length > 0 ? st.time % an.length : st.time;   // en bucle; si la longitud es 0 (Molang), el tiempo corre libre
      an.tracks.forEach(({ bone, channels }) => {
        const o = bone.obj;
        const rot = channels.rotation && sample(channels.rotation, t, true);
        if (rot) o.rotation.set(bone.rx + rot[0] * signRot[0] * DEG, bone.ry + rot[1] * signRot[1] * DEG, bone.rz + rot[2] * signRot[2] * DEG);
        const pos = channels.position && sample(channels.position, t, true);
        if (pos) o.position.set(bone.px + pos[0] * signPos[0], bone.py + pos[1] * signPos[1], bone.pz + pos[2] * signPos[2]);
        const scl = channels.scale && sample(channels.scale, t, true);
        if (scl) o.scale.set(scl[0], scl[1], scl[2]);
      });
    }

    const player = {
      clips: animations.map(a => ({ name: a.name })),
      info: {
        formato: "bbmodel", huesos: bones.size,
        animaciones: all.map(a => ({ nombre: a.fullName, duracion: a.length, huesosAnimados: a.tracks.length }))
      },
      play(i) { st.cur = i; st.time = 0; apply(); },
      update(dt) { if (st.paused || st.cur < 0) return; st.time += dt; apply(); },
      setPaused(v) { st.paused = v; }
    };
    return { scene: root, player };
  }

  return { load };
})();