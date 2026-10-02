/* ============================================================
   Traducción automática ES → EN (Google Translate, sin claves)
   - Escribes toda la web en español.
   - Por defecto se muestra en inglés (traducido solo).
   - El selector EN / ES de la cabecera cambia el idioma.
   - En español no se carga nada de Google.
   - Para pruebas: añade ?lang=es o ?lang=en a la dirección de la web.
   ============================================================ */
(() => {
  const root = document.documentElement;
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  const forced = new URLSearchParams(location.search).get("lang");
  if (forced === "es" || forced === "en") store.set("lang", forced);
  const lang = store.get("lang") === "es" ? "es" : "en";

  // Cookie que usa Google para saber qué traducir
  const writeCookie = (value, expire) => {
    const domains = [""];
    if (location.hostname.includes(".")) {
      domains.push("; domain=" + location.hostname, "; domain=." + location.hostname);
    }
    domains.forEach(d => {
      document.cookie = "googtrans=" + value + "; path=/" + d +
        (expire ? "; expires=Thu, 01 Jan 1970 00:00:00 GMT" : "");
    });
  };

  // Selector de idioma
  document.querySelectorAll("[data-lang]").forEach(btn => {
    btn.setAttribute("aria-pressed", String(btn.dataset.lang === lang));
    btn.addEventListener("click", () => {
      if (btn.dataset.lang === lang) return;
      store.set("lang", btn.dataset.lang);
      const url = new URL(location.href);
      if (url.searchParams.has("lang")) {
        url.searchParams.delete("lang");
        location.replace(url.href);
      } else {
        location.reload();
      }
    });
  });

  if (lang === "es") {
    writeCookie("", true);
    return;
  }

  // Inglés: activar la traducción y cargar el script de Google
  writeCookie("/es/en", false);

  // Cuando Google termina, marcamos la página como inglesa (accesibilidad)
  new MutationObserver(() => {
    if (root.classList.contains("translated-ltr")) root.lang = "en";
  }).observe(root, { attributes: true, attributeFilter: ["class"] });

  window.googleTranslateElementInit = () => {
    new google.translate.TranslateElement(
      { pageLanguage: "es", includedLanguages: "en,es", autoDisplay: false },
      "google_translate_element"
    );
  };

  // Se carga cuando la web ya está lista, para no retrasar nada
  const loadGoogle = () => {
    const s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    s.onerror = () => console.warn("[i18n] No se pudo cargar Google Translate; la web se queda en español.");
    document.head.appendChild(s);
  };
  if (document.readyState === "complete") loadGoogle();
  else window.addEventListener("load", loadGoogle);
})();