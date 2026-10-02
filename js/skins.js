/* ============================================================
   TUS SKINS (este es el único archivo que editas para añadirlas)
   1) Guarda el PNG de la skin en la carpeta skins/  (64×64 o 64×32)
   2) Añade una línea aquí abajo.
   - name:     nombre de la skin
   - file:     ruta del PNG, p. ej. "skins/mi-skin.png"
   - slim:     (opcional) true si tiene los brazos finos (modelo "Alex", 3 px)
   - desc:     (opcional) descripción que se ve al abrirla
   - download: (opcional) true para mostrar un botón "Descargar skin"
   - id:       (opcional) nombre corto para el enlace compartible
   Si la lista está vacía, el apartado Skins se oculta solo.
   ============================================================ */
const SKIN_PAGE_SIZE = 12; // cuántas se ven de golpe; "Ver más" añade otras tantas

const skins = [
  { name: "Meica navideña", file: "skins/Meica.png", version: "clasica",
    desc: "Skin hecha para Meica." },

    { name: "Punkpup", file: "skins/punkpup.png", version: "clasica",
      desc: "Sustituye este archivo por tu propia skin." },

      { name: "PookyBoo", file: "skins/PookyBoo normal slim.png", version: "slim",
        desc: "Sustituye este archivo por tu propia skin." }
];