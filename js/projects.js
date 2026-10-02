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
  { title: "Blink", category: "Adventures & Companions", type: "Entidades", tool: "Java + Geckolib",
    desc: "",
    img: "img/blink_icon.png", model: "models/pets/Blink.gltf" },

  { title: "Jack", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "",
    img: "img/jack_icon.png", model: "models/pets/Jack.gltf" },

  { title: "Jorge", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "",
    img: "img/jorge_icon.png", model: "models/pets/jorge.gltf" },

  { title: "Sizi", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "",
    img: "img/sizi_icon.png", model: "models/pets/Sizi.gltf" },

  { title: "Sting", category: "Adventures & Companions", type: "Entidades", tool: "Java",
    desc: "",
    img: "img/sting_icon.png", model: "models/pets/sting.gltf" },

  { title: "Darkrai bow", category: "Diosesmon", type: "Herramientas", tool: "Java",
    desc: "Un arco realizado para el servidor Diosesmon, inspirado en el pokemon Darkrai.",
    img: "img/darkrai_bow.png", model: "models/tools/darkrai.gltf" },

  { title: "Nimbro dragon", category: "Adventures & Companions", type: "Entidades", tool: "Java",
      desc: "Animaciones realizada para el mod Adventures & Companions (el modelado y el texturizado no me pertenece).",
      img: "img/dragon_nimbo_icon.png", model: "models/dragon.gltf", zoom: 1.6 },

  { title: "Darkrai armor", category: "Diosesmon", type: "Armaduras", tool: "Java + Geckolib",
        desc: "Armadura realizada para el servidor Diosesmon, inspirada en el pokemon Darkrai",
        img: "img/Darkrai armor.png", model: "models/armors/Darkrai armor.gltf"},

    { title: "Hoshi", category: "Adventures & Companions", type: "Entidades", tool: "Java + Geckolib",
          desc: "",
          img: "img/hoshi_icon.png", model: "models/pets/hoshi.gltf"},

  { title: "Banner Brisalia", category: "Proyectos propios", type: "Bloques", tool: "Java",
            desc: "Estandarte realizado para servidor privado.",
            img: "img/banner suelo.png", model: "models/blocks/banner suelo.gltf"},

  { title: "Rayquaza sword", category: "Diosesmon", type: "Armas", tool: "Java",
              desc: "Espada basada en el pokemon Rayquaza para el servidor de Diosesmon.",
              img: "img/rayquaza.png", model: "models/tools/rayquaza.gltf", skinOffset: "java"},

  { title: "Megalodon", category: "Before the Embers", type: "Entidades", tool: "Java + Geckolib",
                desc: "",
                img: "img/Megalodon.png", model: "models/entities/Megalodon.gltf"},
];