(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var greet = "Olá, Ricardo! Vim pelo site.";

  function waLink(text) {
    return "https://wa.me/" + cfg.whatsapp + "?text=" + encodeURIComponent(text || "");
  }
  function openWa(text) { window.open(waLink(text), "_blank", "noopener"); }
  window.SITE = { waLink: waLink, openWa: openWa, greet: greet };

  // Links de WhatsApp, e-mail e Instagram a partir do config.js
  document.querySelectorAll("[data-wa]").forEach(function (el) {
    el.href = waLink(el.getAttribute("data-wa"));
    el.target = "_blank";
    el.rel = "noopener";
    if (el.hasAttribute("data-wa-label") && cfg.whatsappLabel) el.textContent = cfg.whatsappLabel;
    var t = el.querySelector("[data-wa-text]");
    if (t && cfg.whatsappLabel) t.textContent = cfg.whatsappLabel;
  });
  document.querySelectorAll("[data-email]").forEach(function (el) {
    el.href = "mailto:" + cfg.email;
    el.textContent = cfg.email;
  });
  if (cfg.instagram) {
    document.querySelectorAll("[data-ig]").forEach(function (el) { el.hidden = false; });
    document.querySelectorAll("[data-ig-link]").forEach(function (el) {
      el.href = "https://instagram.com/" + cfg.instagram;
      el.target = "_blank";
      el.rel = "noopener";
      var label = el.querySelector("span");
      if (!label) el.textContent = "@" + cfg.instagram;
      else if (!label.textContent) label.textContent = "@" + cfg.instagram;
    });
  }

  document.getElementById("ano").textContent = new Date().getFullYear();

  // Header, barra de progresso, botão topo e parallax do CTA
  var header = document.getElementById("header");
  var toTop = document.getElementById("toTop");
  var progress = document.getElementById("progress");
  var ctaImg = document.querySelector(".cta__bg img");
  var ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    header.classList.toggle("is-scrolled", y > 20);
    toTop.classList.toggle("is-visible", y > 700);
    progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
    if (ctaImg) {
      var r = ctaImg.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        ctaImg.style.setProperty("--py", ((r.top / window.innerHeight) * -60).toFixed(1) + "px");
      }
    }
    ticking = false;
  }
  onScroll();
  window.addEventListener("scroll", function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });

  // Menu mobile
  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    document.body.style.overflow = open ? "hidden" : "";
  }
  burger.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
  nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

  // Animações de entrada + item de menu ativo
  if ("IntersectionObserver" in window) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); revealObs.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    var staggered = ["strip__grid", "hero__content"];
    document.querySelectorAll(".reveal").forEach(function (el) {
      var parent = el.parentElement;
      if (staggered.some(function (c) { return parent.classList.contains(c); })) {
        el.style.transitionDelay = (Array.prototype.indexOf.call(parent.children, el) % 4) * 0.1 + "s";
      }
      revealObs.observe(el);
    });

    var links = {};
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) { links[a.getAttribute("href").slice(1)] = a; });
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var link = links[en.target.id];
        if (link && en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
          link.classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) navObs.observe(s); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  // Máscara simples de telefone
  var tel = document.getElementById("tel");
  tel.addEventListener("input", function () {
    var v = tel.value.replace(/\D/g, "").slice(0, 11);
    if (v.length > 6) tel.value = "(" + v.slice(0, 2) + ") " + v.slice(2, v.length - 4) + "-" + v.slice(-4);
    else if (v.length > 2) tel.value = "(" + v.slice(0, 2) + ") " + v.slice(2);
    else tel.value = v;
  });

  // Formulário de anúncio -> WhatsApp
  var form = document.getElementById("sellForm");
  var err = document.getElementById("formError");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    [form.nome, tel, form.tipo, form.bairro].forEach(function (f) {
      var bad = !f.value.trim() || (f === tel && f.value.replace(/\D/g, "").length < 10);
      f.classList.toggle("is-invalid", bad);
      if (bad) ok = false;
    });
    err.hidden = ok;
    if (!ok) return;

    var linhas = [
      greet + " Quero anunciar meu imóvel.",
      "",
      "*Nome:* " + form.nome.value.trim(),
      "*WhatsApp:* " + tel.value.trim(),
      "*Tipo:* " + form.tipo.value,
      "*Bairro:* " + form.bairro.value
    ];
    if (form.area.value.trim()) linhas.push("*Área:* " + form.area.value.trim() + " m²");
    if (form.dorms.value.trim()) linhas.push("*Dormitórios:* " + form.dorms.value.trim());
    if (form.vagas.value.trim()) linhas.push("*Vagas:* " + form.vagas.value.trim());
    if (form.obs.value.trim()) linhas.push("*Observações:* " + form.obs.value.trim());
    openWa(linhas.join("\n"));
  });
})();
