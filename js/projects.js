/* ============================================================
   TUS MODELOS (este es el único archivo que editas para añadir proyectos)
   - title:    nombre del modelo
   - id:       (opcional) nombre corto para el enlace compartible;
               si no lo pones, se crea solo a partir del título
   - category: uno de CATEGORIES (debe escribirse igual)
   - tool:     texto pequeño (formato, tamaño de textura...)
   - desc:     descripción que se ve al abrir el modelo
   - img:      (opcional) imagen de portada, p. ej. "img/dragon.png"
   - model:    (opcional) tu modelo 3D exportado desde Blockbench,
               p. ej. "models/dragon.glb". Si lo pones, al abrir el
               proyecto se ve en 3D y se detectan sus animaciones solas.
   ============================================================ */
const CATEGORIES = ["Diosesmon", "Before the Embers", "Adventures & Companions", "Proyectos propios"];

// Cuántos modelos se ven de golpe. El botón "Ver más" añade otros tantos.
const PAGE_SIZE = 8;

const projects = [
  { title: "Blink", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "Describe aquí el modelo, tu rol en el proyecto y las herramientas usadas.",
    img: "img/blink_icon.png", model: "models/pets/Blink.gltf" },
  { title: "Jack", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "Describe aquí el modelo, tu rol en el proyecto y las herramientas usadas.",
    img: "img/jack_icon.png", model: "models/pets/Jack.gltf" },
  { title: "Jorge", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "Describe aquí el modelo, tu rol en el proyecto y las herramientas usadas.",
    img: "img/jorge_icon.png", model: "models/pets/jorge.gltf" },
  { title: "Sizi", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "Describe aquí el modelo, tu rol en el proyecto y las herramientas usadas.",
    img: "img/sizi_icon.png", model: "models/pets/Sizi.gltf" },
  { title: "Sting", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "Describe aquí el modelo, tu rol en el proyecto y las herramientas usadas.",
    img: "img/sting_icon.png", model: "models/pets/sting.gltf" },
  { title: "Modelo de ejemplo 6", category: "Proyectos propios", type: "Armas", tool: "Bedrock · textura 64×32",
    desc: "Describe aquí el modelo, tu rol en el proyecto y las herramientas usadas.",
    img: "", model: "models/tools/espada_dragones.gltf" }
];