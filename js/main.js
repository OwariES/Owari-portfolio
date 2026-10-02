// Categorías escritas en español que SÍ deben traducirse al inglés.
// El resto (Diosesmon, Before the Embers...) son nombres propios y se quedan tal cual.
const TRANSLATE_CATEGORIES = ["Todos", "Proyectos propios"];

/* ---------- Código (no hace falta tocar nada de aquí hacia abajo) ---------- */
const grid = document.getElementById("grid");
const filters = document.getElementById("filters");
const viewer = document.getElementById("viewer");
const viewerMedia = document.getElementById("viewer-media");
const viewerTitle = document.getElementById("viewer-title");
const viewerMeta = document.getElementById("viewer-meta");
const viewerDesc = document.getElementById("viewer-desc");

const more = document.getElementById("more");
const search = document.getElementById("search");
const prevBtn = document.getElementById("viewer-prev");
const nextBtn = document.getElementById("viewer-next");
const shareBtn = document.getElementById("viewer-share");

let activeCategory = "Todos";   // filtro de la vista "Proyectos"
let activeType = "Todos";       // filtro de la vista "Categorías"
let view = "projects";          // "projects" o "types"
let visibleCount = PAGE_SIZE;
let query = "";
let currentList = [];
let currentIndex = -1;

/* ---------- Utilidades ---------- */
const norm = t => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const slug = t => norm(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const idOf = p => p.id || slug(p.title);
const setHash = h => { try { history.replaceState(null, "", h); } catch (e) {} };

function filtered() {
  const q = norm(query.trim());
  const field = view === "projects" ? "category" : "type";
  const selected = view === "projects" ? activeCategory : activeType;
  return projects.filter(p =>
    (selected === "Todos" || p[field] === selected) &&
    (!q || norm([p.title, p.category, p.type, p.badge, p.tool, p.desc, p.tags].join(" ")).includes(q))
  );
}

async function copyText(text, btn, okLabel) {
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = okLabel; }
  catch (e) { btn.textContent = "No se pudo copiar"; }
  setTimeout(() => { btn.textContent = old; }, 1800);
}

function buildMedia(project) {
  const wrap = document.createElement("div");
  wrap.className = "thumb";
  if (project.img) {
    const img = document.createElement("img");
    img.src = project.img;
    img.alt = project.title;
    img.loading = "lazy";
    wrap.appendChild(img);
  } else {
    wrap.classList.add("placeholder");
  }
  if (project.model) {
    const tag = document.createElement("span");
    tag.className = "tag3d";
    tag.textContent = "3D";
    wrap.appendChild(tag);
  }
  // Etiqueta con el tipo de producto, a la derecha (se configura con "type" / "badge" en cada modelo)
  const label = project.badge || project.type;
  if (label && (typeof SHOW_TYPE_BADGE === "undefined" || SHOW_TYPE_BADGE)) {
    const t = document.createElement("span");
    t.className = "tagtype";
    t.textContent = label;
    wrap.appendChild(t);
  }
  return wrap;
}

function renderGrid(focusIndex) {
  const list = filtered();
  grid.replaceChildren();

  list.slice(0, visibleCount).forEach(p => {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";

    const inner = document.createElement("div");
    inner.className = "card-inner";
    inner.appendChild(buildMedia(p));

    const body = document.createElement("div");
    body.className = "card-body";
    const title = document.createElement("h3");
    title.textContent = p.title;
    title.translate = !!p.translateTitle; // los nombres no se traducen
    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = p.category;
    meta.translate = TRANSLATE_CATEGORIES.includes(p.category);
    body.append(title, meta);
    inner.appendChild(body);

    card.appendChild(inner);
    card.addEventListener("click", () => openViewer(p));
    grid.appendChild(card);
  });

  renderMore(list.length);
  if (focusIndex !== undefined && grid.children[focusIndex]) {
    grid.children[focusIndex].focus({ preventScroll: true });
  }
}

function renderMore(total) {
  more.replaceChildren();

  if (total === 0) {
    const empty = document.createElement("p");
    empty.className = "count";
    empty.textContent = query ? "Sin resultados para «" + query + "»." : "Todavía no hay modelos en esta categoría.";
    more.appendChild(empty);
    return;
  }
  if (total <= PAGE_SIZE) return; // caben todos, no hacen falta botones

  const shown = Math.min(visibleCount, total);
  const count = document.createElement("p");
  count.className = "count";
  count.textContent = "Mostrando " + shown + " de " + total;
  more.appendChild(count);

  const actions = document.createElement("div");
  actions.className = "more-actions";

  if (shown < total) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.textContent = "Ver más";
    btn.addEventListener("click", () => {
      visibleCount += PAGE_SIZE;
      renderGrid(shown); // el foco pasa al primer modelo nuevo
    });
    actions.appendChild(btn);
  }
  if (shown > PAGE_SIZE) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn ghost";
    btn.textContent = "Ver menos";
    btn.addEventListener("click", () => {
      visibleCount = PAGE_SIZE;
      renderGrid();
      filters.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    actions.appendChild(btn);
  }
  more.appendChild(actions);
}

function setCategory(cat) {
  if (view === "projects") activeCategory = cat; else activeType = cat;
  visibleCount = PAGE_SIZE;
  query = "";
  search.value = "";
  updatePressed();
  renderGrid();
}

// Tipos de producto: los de PRODUCT_TYPES (si existe) y los que aparezcan en los modelos
function typeList() {
  const listed = typeof PRODUCT_TYPES !== "undefined" ? PRODUCT_TYPES : [];
  return [...new Set([...listed, ...projects.map(p => p.type).filter(Boolean)])];
}

/* ---------- Pestañas y cambio de vista: Proyectos / Categorías ---------- */
// Las pestañas de las dos vistas se crean desde el principio y solo se muestran u ocultan,
// así Google Translate las traduce todas a la vez.
const viewBtns = document.querySelectorAll(".view-btn");
const viewTitle = document.getElementById("view-title");
const viewHints = document.getElementById("view-hints");
const groups = {};

function buildFilters() {
  filters.replaceChildren();
  [["projects", CATEGORIES], ["types", typeList()]].forEach(([key, names]) => {
    const group = document.createElement("div");
    group.className = "filter-group";
    ["Todos", ...names].forEach(name => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = name;
      // Los nombres de proyecto no se traducen; los tipos de producto sí
      btn.translate = key === "types" || TRANSLATE_CATEGORIES.includes(name);
      btn.dataset.cat = name; // se compara por este valor, no por el texto (que puede estar traducido)
      btn.addEventListener("click", () => setCategory(name));
      group.appendChild(btn);
    });
    filters.appendChild(group);
    groups[key] = group;
  });
}

function updatePressed() {
  Object.entries(groups).forEach(([key, group]) => {
    const current = key === "projects" ? activeCategory : activeType;
    group.querySelectorAll("button").forEach(b =>
      b.setAttribute("aria-pressed", String(b.dataset.cat === current))
    );
  });
}

function applyView() {
  viewBtns.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
  Object.entries(groups).forEach(([key, g]) => {
    g.classList.toggle("is-off", key !== view);
    g.setAttribute("aria-hidden", String(key !== view));
  });
  viewHints.querySelectorAll("[data-hint]").forEach(h => {
    h.classList.toggle("is-off", h.dataset.hint !== view);
    h.setAttribute("aria-hidden", String(h.dataset.hint !== view));
  });
  updatePressed();
}

function setView(v) {
  view = v;
  activeCategory = "Todos";
  activeType = "Todos";
  visibleCount = PAGE_SIZE;
  query = "";
  search.value = "";
  applyView();
  renderGrid();
}

function initView() {
  const hasTypes = typeList().length > 0;   // sin tipos definidos, solo se ve "Proyectos"
  viewTitle.classList.toggle("single", !hasTypes);
  document.querySelector('.view-btn[data-view="types"]').hidden = !hasTypes;
  viewHints.hidden = !hasTypes;
  buildFilters();
  applyView();
}

viewBtns.forEach(b => b.addEventListener("click", () => {
  if (b.dataset.view !== view) setView(b.dataset.view);
}));

// Los enlaces del menú (Diosesmon, etc.) llevan a la vista de proyectos
document.querySelectorAll("[data-cat]").forEach(link =>
  link.addEventListener("click", () => {
    if (view !== "projects") setView("projects");
    setCategory(link.dataset.cat);
  })
);

/* ---------- Visor 3D (three.js, se descarga solo al abrir un modelo) ---------- */
let threeLib = null;
let openToken = 0;
let active = null;

async function loadThree() {
  if (threeLib) return threeLib;
  const [THREE, gltf, orbit] = await Promise.all([
    import("three"),
    import("three/addons/loaders/GLTFLoader.js"),
    import("three/addons/controls/OrbitControls.js")
  ]);
  threeLib = { THREE, GLTFLoader: gltf.GLTFLoader, OrbitControls: orbit.OrbitControls };
  return threeLib;
}

function stop3D() {
  if (!active) return;
  cancelAnimationFrame(active.raf);
  active.ro.disconnect();
  active.controls.dispose();
  active.renderer.dispose();
  active.renderer.forceContextLoss();
  active = null;
}

function makeButton(label, pressed) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  if (pressed !== undefined) b.setAttribute("aria-pressed", String(pressed));
  return b;
}

// Blockbench (con "Export Groups As Armature") guarda las animaciones de los huesos de nivel superior
// (por ejemplo las piernas) con la posición ABSOLUTA del pivote en lugar de la local, y el hueso acaba
// desplazado dos veces (las piernas "saltan" hacia arriba). Aquí se detecta y se corrige.
function fixPivotTracks(model, clips) {
  let fixed = 0;
  clips.forEach(clip => clip.tracks.forEach(track => {
    const dot = track.name.lastIndexOf(".");
    if (dot < 0 || track.name.slice(dot + 1) !== "position") return;
    const node = model.getObjectByName(track.name.slice(0, dot));
    const parent = node && node.parent;
    if (!parent || node.position.length() > 1e-6 || parent.position.length() < 0.02) return;
    const v = track.values, n = v.length / 3;
    const mean = [0, 0, 0];
    for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) mean[k] += v[i * 3 + k] / n;
    const dist = p => Math.hypot(mean[0] - p.x, mean[1] - p.y, mean[2] - p.z);
    if (dist(parent.position) >= dist(node.position)) return;   // ya está en coordenadas locales
    for (let i = 0; i < n; i++) {
      v[i * 3] -= parent.position.x;
      v[i * 3 + 1] -= parent.position.y;
      v[i * 3 + 2] -= parent.position.z;
    }
    fixed++;
  }));
  return fixed;
}

// Reproductor de animaciones de un .gltf (el de los .bbmodel está en js/bbmodel.js)
function makeMixerPlayer(THREE, model, allClips) {
  const fixedTracks = fixPivotTracks(model, allClips);
  const mixer = new THREE.AnimationMixer(model);
  const clips = allClips.filter(c => c.tracks.length > 0);   // las vacías se ignoran
  let skinned = false;
  model.traverse(o => { if (o.isSkinnedMesh) skinned = true; });
  return {
    clips: clips.map(c => ({ name: c.name, still: c.duration < 0.001 })),
    info: {
      formato: "gltf", esqueleto: skinned, pistasCorregidas: fixedTracks,
      animaciones: allClips.map(c => ({ nombre: c.name, duracion: +c.duration.toFixed(2), pistas: c.tracks.length }))
    },
    play(i) {
      mixer.stopAllAction();   // siempre parte de la pose base, sin restos de la animación anterior
      const action = mixer.clipAction(clips[i]);
      if (clips[i].duration < 0.001) {        // pose estática de un solo fotograma
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(THREE.LoopRepeat, Infinity);
      }
      action.reset().play();
    },
    update(dt) { mixer.update(dt); },
    setPaused(v) { mixer.timeScale = v ? 0 : 1; }
  };
}

// Carga un modelo: .bbmodel (directo desde Blockbench) o .gltf / .glb
async function loadModel(THREE, GLTFLoader, p) {
  if (/\.bbmodel(\?.*)?$/i.test(p.model)) {
    if (typeof BBModel === "undefined") throw new Error('Falta <script src="js/bbmodel.js"> en index.html');
    return BBModel.load(THREE, p.model, { signs: p.bbSigns });
  }
  const gltf = await new GLTFLoader().loadAsync(p.model);
  const shifted = applySkinOffset(THREE, gltf.scene, p);
  const loaded = { scene: gltf.scene, player: makeMixerPlayer(THREE, gltf.scene, gltf.animations) };
  loaded.player.info.skinOffsetAplicado = shifted;
  return loaded;
}

// Blockbench, al exportar con "Export Groups As Armature" un modelo de formato Java Block/Item, guarda los vértices
// de las piezas con esqueleto 8 px (0,5) corridos en X y Z respecto a las piezas sueltas del mismo archivo.
// En projects.js:  skinOffset: "java"   (o a mano: skinOffset: [x, y, z], en unidades del modelo)
// Lo más limpio es volver a exportar con esa opción desactivada; esto sirve para los archivos ya exportados.
function applySkinOffset(THREE, scene, p) {
  let o = p.skinOffset;
  if (!o) return 0;
  if (o === "java") o = [0.5, 0, 0.5];
  const shift = new THREE.Matrix4().makeTranslation(o[0], o[1], o[2]);
  const moved = new Set();                       // varias mallas pueden compartir el mismo atributo: se mueve una sola vez
  scene.traverse(m => {
    if (!m.isSkinnedMesh) return;
    const a = m.geometry.attributes.position;
    if (!moved.has(a)) { moved.add(a); a.applyMatrix4(shift); a.needsUpdate = true; }
    m.geometry.boundingBox = null; m.geometry.boundingSphere = null;
    if ("boundingBox" in m) m.boundingBox = null;
    if ("boundingSphere" in m) m.boundingSphere = null;
  });
  return moved.size;
}

async function show3D(p, token) {
  stop3D();
  const stage = document.createElement("div");
  stage.className = "stage3d";
  const status = document.createElement("p");
  status.className = "status3d";
  status.textContent = "Cargando modelo…";
  stage.appendChild(status);
  const bar = document.createElement("div");
  bar.className = "anim-bar";
  viewerMedia.replaceChildren(stage, bar);

  try {
    const { THREE, GLTFLoader, OrbitControls } = await loadThree();
    const loaded = await loadModel(THREE, GLTFLoader, p);
    if (token !== openToken) return; // el visor se cerró mientras cargaba

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 1000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3a30, 1.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    camera.add(sun);   // la luz va pegada a la cámara: siempre ilumina lo que estás mirando
    scene.add(camera);

    // Texturas nítidas (pixel art) y recortes limpios
    const model = loaded.scene;
    model.traverse(obj => {
      if (!obj.isMesh) return;
      obj.frustumCulled = false; // evita piezas que desaparecen al animarse
      (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => {
        m.side = THREE.DoubleSide; // evita caras que no se dibujan
        if (m.map) {
          m.map.magFilter = THREE.NearestFilter;
          m.map.minFilter = THREE.NearestFilter;
          m.map.generateMipmaps = false;
          m.map.needsUpdate = true;
        }
        if (m.transparent) { m.alphaTest = 0.5; m.transparent = false; }
      });
    });

    // Centrar el modelo y encuadrar la cámara.
    // La caja abarca todas las animaciones (se recorren una vez), para que nada salga de plano al moverse.
    const box = new THREE.Box3().setFromObject(model);
    try {
      (loaded.player.clips || []).forEach((clip, i) => {
        const T = clip.still ? 0 : (clip.duration > 0 ? clip.duration : 2.5);
        loaded.player.play(i);
        for (let k = 0; k <= 12 && T > 0; k++) {
          loaded.player.update(T / 12);
          box.union(new THREE.Box3().setFromObject(model));
        }
      });
    } catch (e) { /* si falla el muestreo, se usa la caja de reposo */ }
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    scene.add(model);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    // Encuadre por esfera: cabe entero desde cualquier ángulo y aprovecha el ancho del visor.
    // "zoom" en projects.js acerca (2 = el doble de grande) los modelos con colas o alas muy largas.
    const aspect = stage.clientWidth && stage.clientHeight ? stage.clientWidth / stage.clientHeight : 1.4;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfFovH = Math.atan(Math.tan(halfFov) * aspect);
    // Cabe en ancho y en alto desde cualquier ángulo de giro (el alto cuenta con la inclinación de la cámara)
    const rH = Math.hypot(size.x, size.z) / 2 || 1;
    const rV = Math.hypot(size.y / 2, 0.45 * rH);
    const dist = Math.max(rH / Math.sin(halfFovH), rV / Math.sin(halfFov)) * 1.08 / (p.zoom || 1);
    // Los modelos de Blockbench miran hacia atrás en el visor: se empieza a 180° (cambia con "startAngle" en cada modelo)
    const startAngle = THREE.MathUtils.degToRad(p.startAngle ?? 180);
    const longX = size.x > size.z * 1.5;   // modelo alargado de lado: se ve de perfil al abrirlo
    const dir = longX ? [0.2, 0.3, 0.93] : [0.54, 0.31, 0.78];
    camera.position.set(dist * dir[0], dist * dir[1], dist * dir[2]).applyAxisAngle(new THREE.Vector3(0, 1, 0), startAngle);
    sun.position.set(0.4, 0.7, 1).multiplyScalar(dist);
    camera.near = dist / 100;
    camera.far = dist * 100;
    camera.updateProjectionMatrix();

    const floor = new THREE.GridHelper(maxDim * 3, 12, 0x39f08a, 0x14301f);
    floor.position.y = -size.y / 2;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = p.autoRotate !== false;   // autoRotate: false en projects.js lo deja quieto
    controls.autoRotateSpeed = 1.5;
    controls.minDistance = dist * 0.12;
    controls.maxDistance = dist * 4;

    // Animaciones: se detectan solas desde el archivo (.bbmodel o .gltf)
    const player = loaded.player;
    const clips = player.clips;
    console.info("[Owari 3D]", p.model, { ...player.info, tamano: size.toArray().map(n => +n.toFixed(2)) });
    const buttons = [];

    function play(i) {
      player.play(i);
      buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    }

    clips.forEach((clip, i) => {
      const b = makeButton(clip.name || "Animación " + (i + 1), false);
      if (clip.still) b.title = "Esta animación solo tiene un fotograma: se ve como pose fija";
      b.addEventListener("click", () => play(i));
      bar.appendChild(b);
      buttons.push(b);
    });
    if (clips.length) {
      play(0);
    } else {
      const none = document.createElement("span");
      none.className = "none";
      none.textContent = "Este modelo no tiene animaciones.";
      bar.appendChild(none);
    }

    // Herramientas
    const tools = document.createElement("div");
    tools.className = "anim-tools";
    let paused = false;
    const pauseBtn = makeButton("Pausar");
    pauseBtn.addEventListener("click", () => {
      paused = !paused;
      player.setPaused(paused);
      pauseBtn.textContent = paused ? "Reproducir" : "Pausar";
    });
    const rotBtn = makeButton("Girar", p.autoRotate !== false);
    rotBtn.addEventListener("click", () => {
      controls.autoRotate = !controls.autoRotate;
      rotBtn.setAttribute("aria-pressed", String(controls.autoRotate));
    });
    const flipBtn = makeButton("Dar la vuelta");
    flipBtn.addEventListener("click", () => {
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);
      controls.update();
    });
    if (clips.length) tools.appendChild(pauseBtn);
    tools.appendChild(flipBtn);
    tools.appendChild(rotBtn);
    bar.appendChild(tools);

    // Tamaño y bucle de dibujo
    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    const clock = new THREE.Clock();
    const state = { raf: 0, renderer, controls, ro };
    const tick = () => {
      state.raf = requestAnimationFrame(tick);
      player.update(clock.getDelta());
      controls.update();
      renderer.render(scene, camera);
    };
    tick();
    active = state;
  } catch (err) {
    console.error(err);
    stage.replaceChildren(status);
    status.textContent = "No se pudo cargar el modelo. Revisa la ruta del archivo y abre la web desde el navegador de IntelliJ, no con doble clic.";
  }
}

/* ---------- Skins ---------- */
const SKIN_VERSIONS = { clasica: "classic", classic: "classic", default: "classic", normal: "classic",
                        slim: "slim", alex: "slim", fina: "slim" };
function skinVersion(s) {
  const raw = norm(String(s.version ?? (s.slim ? "slim" : "")).trim());
  if (!raw) console.warn('[Skins] "' + s.name + '" no tiene version: se muestra como clásica. Añade version: "clasica" o "slim".');
  else if (!SKIN_VERSIONS[raw]) console.warn('[Skins] Versión desconocida "' + s.version + '" en "' + s.name + '": usa "clasica" o "slim".');
  return SKIN_VERSIONS[raw] || "classic";
}
const skinItems = (typeof skins !== "undefined" ? skins : []).map(s => {
  const v = skinVersion(s);
  return {
    title: s.name, category: "Skins", tool: v === "slim" ? "Slim" : "Clásica", desc: s.desc || "",
    skinFile: s.file, slim: v === "slim", download: !!s.download, id: s.id || "skin-" + slug(s.name)
  };
});
const skinsGrid = document.getElementById("skins-grid");
const skinsMore = document.getElementById("skins-more");
const skinsSize = typeof SKIN_PAGE_SIZE !== "undefined" ? SKIN_PAGE_SIZE : 12;
let skinsVisible = skinsSize;

// Vista frontal en 2D (sin WebGL): ligera, para las tarjetas
function drawSkinFront(canvas, img, slim) {
  const k = img.width / 64;               // skins HD (128×128...) escalan igual
  const legacy = img.height * 2 === img.width;
  const arm = slim ? 3 : 4;
  const S = 4 * k;                        // píxeles del lienzo por cada píxel de skin
  canvas.width = 18 * S;                  // figura de 16 de ancho + 1 de margen a cada lado
  canvas.height = 34 * S;                 // figura de 32 de alto + 1 de margen
  const c = canvas.getContext("2d");
  c.imageSmoothingEnabled = false;

  // Dibuja el trozo (sx,sy,sw,sh) de la skin en (dx,dy). "grow" lo infla, como hace el juego con la capa exterior
  const put = (sx, sy, sw, sh, dx, dy, flip = false, grow = 0) => {
    const x = (dx + 1 - grow) * S, y = (dy + 1 - grow) * S;
    const w = (sw + grow * 2) * S, h = (sh + grow * 2) * S;
    c.save();
    if (flip) {
      c.translate(x + w, 0);
      c.scale(-1, 1);
      c.drawImage(img, sx * k, sy * k, sw * k, sh * k, 0, y, w, h);
    } else {
      c.drawImage(img, sx * k, sy * k, sw * k, sh * k, x, y, w, h);
    }
    c.restore();
  };

  // Capa base
  put(8, 8, 8, 8, 4, 0);                  // cabeza
  put(20, 20, 8, 12, 4, 8);               // torso
  put(44, 20, arm, 12, 4 - arm, 8);       // brazo derecho
  put(4, 20, 4, 12, 4, 20);               // pierna derecha
  if (legacy) {
    put(44, 20, arm, 12, 12, 8, true);    // brazo izquierdo (espejo del derecho)
    put(4, 20, 4, 12, 8, 20, true);       // pierna izquierda
  } else {
    put(36, 52, arm, 12, 12, 8);          // brazo izquierdo
    put(20, 52, 4, 12, 8, 20);            // pierna izquierda
    // Capa exterior: pantalón, chaqueta y mangas, con volumen
    put(4, 36, 4, 12, 4, 20, false, 0.25);
    put(4, 52, 4, 12, 8, 20, false, 0.25);
    put(20, 36, 8, 12, 4, 8, false, 0.25);
    put(44, 36, arm, 12, 4 - arm, 8, false, 0.25);
    put(52, 52, arm, 12, 12, 8, false, 0.25);
  }
  put(40, 8, 8, 8, 4, 0, false, 0.5);     // sombrero / pelo (también en skins antiguas)
}

// Modelo 3D del jugador construido a partir del PNG de la skin
function buildPlayer(THREE, tex, slim) {
  const W = tex.image.width, H = tex.image.height;
  const k = W / 64;                  // skins HD (128×128...) escalan igual
  const legacy = H * 2 === W;        // formato antiguo 64×32
  const arm = slim ? 3 : 4;
  const mat = new THREE.MeshLambertMaterial({ map: tex, alphaTest: 0.1 });

  const add = (group, [u, v], [w, h, d], grow, [x, y, z], mirror) => {
    const geo = new THREE.BoxGeometry(w + grow * 2, h + grow * 2, d + grow * 2);
    const rects = [
      [u + d + w, v + d, d, h],      // +x: lado izquierdo del personaje
      [u, v + d, d, h],              // -x: lado derecho
      [u + d, v, w, d],              // arriba
      [u + d + w, v, w, d],          // abajo
      [u + d, v + d, w, h],          // frente
      [u + 2 * d + w, v + d, w, h]   // espalda
    ];
    if (mirror) [rects[0], rects[1]] = [rects[1], rects[0]];
    const uv = geo.attributes.uv;
    rects.forEach(([rx, ry, rw, rh], i) => {
      let u0 = rx * k / W, u1 = (rx + rw) * k / W;
      const vt = 1 - ry * k / H, vb = 1 - (ry + rh) * k / H;
      if (mirror) [u0, u1] = [u1, u0];
      uv.setXY(i * 4, u0, vt);     uv.setXY(i * 4 + 1, u1, vt);
      uv.setXY(i * 4 + 2, u0, vb); uv.setXY(i * 4 + 3, u1, vb);
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };

  const base = new THREE.Group(), outer = new THREE.Group();
  const parts = [
    { o: [0, 0],   s: [8, 8, 8],    ov: [32, 0],  g: 0.5,  p: [0, 28, 0] },                    // cabeza
    { o: [16, 16], s: [8, 12, 4],   ov: [16, 32], g: 0.25, p: [0, 18, 0] },                    // torso
    { o: [40, 16], s: [arm, 12, 4], ov: [40, 32], g: 0.25, p: [-(4 + arm / 2), 18, 0] },       // brazo derecho
    { o: [32, 48], s: [arm, 12, 4], ov: [48, 48], g: 0.25, p: [4 + arm / 2, 18, 0], old: [40, 16] }, // brazo izquierdo
    { o: [0, 16],  s: [4, 12, 4],   ov: [0, 32],  g: 0.25, p: [-2, 6, 0] },                    // pierna derecha
    { o: [16, 48], s: [4, 12, 4],   ov: [0, 48],  g: 0.25, p: [2, 6, 0], old: [0, 16] }        // pierna izquierda
  ];
  parts.forEach((pt, i) => {
    const mirror = legacy && pt.old;
    add(base, mirror ? pt.old : pt.o, pt.s, 0, pt.p, !!mirror);
    if (!legacy || i === 0) add(outer, pt.ov, pt.s, pt.g, pt.p, false);
  });
  const root = new THREE.Group();
  root.add(base, outer);
  return { root, outer };
}

async function showSkin(p, token) {
  stop3D();
  const stage = document.createElement("div");
  stage.className = "stage3d";
  const status = document.createElement("p");
  status.className = "status3d";
  status.textContent = "Cargando skin…";
  stage.appendChild(status);
  const bar = document.createElement("div");
  bar.className = "anim-bar";
  viewerMedia.replaceChildren(stage, bar);

  try {
    const { THREE, OrbitControls } = await loadThree();
    const tex = await new THREE.TextureLoader().loadAsync(p.skinFile);
    if (token !== openToken) return;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    stage.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 1, 500);
    camera.position.set(34, 20, 54);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a7a70, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(10, 16, 40);
    camera.add(sun);   // la luz acompaña a la cámara
    scene.add(camera);

    const { root, outer } = buildPlayer(THREE, tex, p.slim);
    root.position.y = -16;
    scene.add(root);
    const floor = new THREE.GridHelper(48, 12, 0x39f08a, 0x14301f);
    floor.position.y = -16;
    scene.add(floor);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2;
    controls.minDistance = 30;
    controls.maxDistance = 140;

    if (p.download) {
      const a = document.createElement("a");
      a.className = "chip";
      a.href = p.skinFile;
      a.download = "";
      a.textContent = "Descargar skin";
      bar.appendChild(a);
    }
    const tools = document.createElement("div");
    tools.className = "anim-tools";
    const layerBtn = makeButton("Capa exterior", true);
    layerBtn.addEventListener("click", () => {
      outer.visible = !outer.visible;
      layerBtn.setAttribute("aria-pressed", String(outer.visible));
    });
    const rotBtn = makeButton("Girar", true);
    rotBtn.addEventListener("click", () => {
      controls.autoRotate = !controls.autoRotate;
      rotBtn.setAttribute("aria-pressed", String(controls.autoRotate));
    });
    tools.append(layerBtn, rotBtn);
    bar.appendChild(tools);

    const resize = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();

    const state = { raf: 0, renderer, controls, ro };
    const tick = () => {
      state.raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();
    active = state;
  } catch (err) {
    console.error(err);
    stage.replaceChildren(status);
    status.textContent = "No se pudo cargar la skin. Revisa la ruta del archivo y abre la web desde el navegador de IntelliJ, no con doble clic.";
  }
}

function renderSkins(focusIndex) {
  skinsGrid.replaceChildren();
  skinItems.slice(0, skinsVisible).forEach(s => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "skin-card";
    const canvas = document.createElement("canvas");
    canvas.className = "skin-preview";
    canvas.width = 16;
    canvas.height = 32;
    const name = document.createElement("span");
    name.className = "skin-name";
    name.textContent = s.title;
    name.translate = false;
    const ver = document.createElement("span");   // "Clásica" o "Slim"
    ver.className = "skin-ver";
    ver.textContent = s.tool;
    card.append(canvas, name, ver);
    card.addEventListener("click", () => openViewer(s, skinItems));
    skinsGrid.appendChild(card);

    const img = new Image();
    img.onload = () => drawSkinFront(canvas, img, s.slim);
    img.onerror = () => card.classList.add("missing");
    img.src = s.skinFile;
  });

  skinsMore.replaceChildren();
  const total = skinItems.length;
  if (total > skinsSize) {
    const shown = Math.min(skinsVisible, total);
    const count = document.createElement("p");
    count.className = "count";
    count.textContent = "Mostrando " + shown + " de " + total;
    const actions = document.createElement("div");
    actions.className = "more-actions";
    if (shown < total) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn";
      btn.textContent = "Ver más";
      btn.addEventListener("click", () => { skinsVisible += skinsSize; renderSkins(shown); });
      actions.appendChild(btn);
    }
    if (shown > skinsSize) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn ghost";
      btn.textContent = "Ver menos";
      btn.addEventListener("click", () => {
        skinsVisible = skinsSize;
        renderSkins();
        document.getElementById("skins").scrollIntoView({ behavior: "smooth", block: "start" });
      });
      actions.appendChild(btn);
    }
    skinsMore.append(count, actions);
  }
  if (focusIndex !== undefined && skinsGrid.children[focusIndex]) {
    skinsGrid.children[focusIndex].focus({ preventScroll: true });
  }
}

/* ---------- Visor ---------- */
function openViewer(p, list = filtered()) {
  const token = ++openToken;
  currentList = list.includes(p) ? list : [p];
  currentIndex = currentList.indexOf(p);
  viewerTitle.textContent = p.title;
  viewerTitle.translate = !!p.translateTitle;
  viewerMeta.replaceChildren();
  [[p.category, TRANSLATE_CATEGORIES.includes(p.category)], [p.badge || p.type, true], [p.tool, true]]
    .filter(([text]) => text)
    .forEach(([text, translate], i) => {
      if (i) viewerMeta.append(" · ");
      const span = document.createElement("span");
      span.textContent = text;
      span.translate = translate;
      viewerMeta.append(span);
    });
  viewerDesc.textContent = p.desc || "";
  viewerDesc.hidden = !p.desc;
  prevBtn.hidden = nextBtn.hidden = currentList.length < 2;
  setHash("#modelo=" + idOf(p));
  if (!viewer.open) viewer.showModal();
  if (p.skinFile) {
    showSkin(p, token);
  } else if (p.model) {
    show3D(p, token);
  } else {
    stop3D();
    viewerMedia.replaceChildren(buildMedia(p));
  }
}

function step(d) {
  if (currentList.length < 2) return;
  const i = (currentIndex + d + currentList.length) % currentList.length;
  openViewer(currentList[i], currentList);
}

viewer.addEventListener("close", () => {
  openToken++;
  stop3D();
  viewerMedia.replaceChildren();
  setHash("#proyectos");
});
document.getElementById("viewer-close").addEventListener("click", () => viewer.close());
viewer.addEventListener("click", e => { if (e.target === viewer) viewer.close(); });

prevBtn.addEventListener("click", () => step(-1));
nextBtn.addEventListener("click", () => step(1));
shareBtn.addEventListener("click", () =>
  copyText(location.href.split("#")[0] + "#modelo=" + idOf(currentList[currentIndex]), shareBtn, "¡Enlace copiado!")
);
document.addEventListener("keydown", e => {
  if (!viewer.open) return;
  if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
});

/* ---------- Extras ---------- */
search.addEventListener("input", () => {
  query = search.value;
  visibleCount = PAGE_SIZE;
  renderGrid();
});

// Barra de progreso de scroll
const progress = document.getElementById("progress");
const updateProgress = () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.transform = "scaleX(" + (max > 0 ? window.scrollY / max : 0) + ")";
};
window.addEventListener("scroll", updateProgress, { passive: true });
window.addEventListener("resize", updateProgress);
updateProgress();

// Luz neón que sigue al ratón en la portada
const hero = document.querySelector(".hero");
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  hero.addEventListener("pointermove", e => {
    const box = hero.getBoundingClientRect();
    hero.style.setProperty("--mx", (e.clientX - box.left) + "px");
    hero.style.setProperty("--my", (e.clientY - box.top) + "px");
  });
}

// Efecto glitch del título "Sobre mí": solo se anima mientras está a la vista
const glitchEl = document.querySelector(".glitch");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (glitchEl && !reduceMotion && "IntersectionObserver" in window) {
  new IntersectionObserver(([e]) => glitchEl.classList.toggle("on", e.isIntersecting)).observe(glitchEl);
}

document.getElementById("year").textContent = new Date().getFullYear();
initView();
renderGrid();

if (skinItems.length) {
  renderSkins();
} else {
  document.getElementById("skins").hidden = true;      // sin skins, el apartado no molesta
  document.querySelector('a[href="#skins"]').hidden = true;
}

// Enlace compartible: #modelo=nombre abre ese modelo directamente
const shared = location.hash.match(/^#modelo=(.+)$/);
if (shared) {
  const wanted = decodeURIComponent(shared[1]);
  const found = [...projects, ...skinItems].find(p => idOf(p) === wanted);
  if (found) openViewer(found, skinItems.includes(found) ? skinItems : filtered());
}