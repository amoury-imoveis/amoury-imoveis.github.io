/* Vitrine de imóveis: lê data/imoveis.json (editado pelo Pages CMS) */
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};
  var SITE = window.SITE;
  var PAGE = 6;

  var grid = document.getElementById("props");
  var moreBtn = document.getElementById("moreBtn");
  var activeBox = document.getElementById("activeFilters");
  var chips = document.querySelectorAll(".chip");
  var all = [];
  var shown = PAGE;
  var filters = { finalidade: "todos", tipo: "", bairro: "", min: 0, max: Infinity };

  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  function money(n) { return n ? brl.format(n) : ""; }
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isClosed(p) { return p.status === "Vendido" || p.status === "Alugado"; }
  function isRent(p) { return p.finalidade === "Aluguel"; }
  function priceHtml(p) {
    if (!p.preco) return "Sob consulta";
    return money(p.preco) + (isRent(p) ? " <small>/mês</small>" : "");
  }
  function plural(n, um, varios) { return n + " " + (n == 1 ? um : varios); }
  function slug(p) { return "imovel-" + String(p.codigo || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }
  function linkTo(p) { return location.href.split("#")[0] + "#" + slug(p); }

  // ---------- Carregamento ----------
  fetch("data/imoveis.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      all = (data.imoveis || []).map(function (p, i) { p._i = i; p.fotos = (p.fotos || []).filter(Boolean); return p; });
      // Disponíveis primeiro, depois destaques; vendidos/alugados no fim
      all.sort(function (a, b) {
        return (isClosed(a) - isClosed(b)) || ((b.destaque ? 1 : 0) - (a.destaque ? 1 : 0)) || (a._i - b._i);
      });
      render();
      openFromHash();
    })
    .catch(function () {
      grid.innerHTML = '<div class="props__empty"><strong>Não foi possível carregar os imóveis agora.</strong>' +
        (location.protocol === "file:" ? "Abra o site por um servidor (ex.: GitHub Pages) para a vitrine aparecer." : "Tente recarregar a página ou fale comigo pelo WhatsApp.") + "</div>";
    });

  // ---------- Lista ----------
  function matches(p) {
    if (filters.finalidade !== "todos" && p.finalidade !== filters.finalidade) return false;
    if (filters.tipo && p.tipo !== filters.tipo) return false;
    if (filters.bairro && p.bairro !== filters.bairro) return false;
    if (p.preco && (p.preco < filters.min || p.preco > filters.max)) return false;
    return true;
  }

  function card(p) {
    var foto = p.fotos[0] || "assets/img/sala.jpg";
    var ribbon = p.status && p.status !== "Disponível"
      ? '<span class="prop__ribbon' + (p.status === "Reservado" ? " prop__ribbon--reservado" : "") + '">' + esc(p.status) + "</span>" : "";
    var feats = [];
    if (p.dormitorios) feats.push('<li><svg class="ico"><use href="#i-bed"/></svg>' + plural(p.dormitorios, "dorm.", "dorms.") + (p.suites ? " (" + plural(p.suites, "suíte", "suítes") + ")" : "") + "</li>");
    if (p.area) feats.push('<li><svg class="ico"><use href="#i-area"/></svg>' + p.area + " m²</li>");
    if (p.vagas) feats.push('<li><svg class="ico"><use href="#i-car"/></svg>' + plural(p.vagas, "vaga", "vagas") + "</li>");
    return '<button class="prop' + (isClosed(p) ? " is-closed" : "") + '" data-i="' + p._i + '" aria-label="Ver detalhes: ' + esc(p.titulo) + '">' +
      '<div class="prop__media">' +
        '<img src="' + esc(foto) + '" alt="' + esc(p.titulo) + '" loading="lazy">' +
        '<span class="prop__tag' + (isRent(p) ? " prop__tag--aluguel" : "") + '">' + (isRent(p) ? "Aluguel" : "Venda") + "</span>" +
        (p.codigo ? '<span class="prop__code">' + esc(p.codigo) + "</span>" : "") +
        (p.fotos.length > 1 ? '<span class="prop__photos"><svg class="ico"><use href="#i-camera"/></svg>' + p.fotos.length + "</span>" : "") +
        ribbon +
      "</div>" +
      '<div class="prop__body">' +
        '<span class="prop__loc"><svg class="ico"><use href="#i-pin"/></svg>' + esc(p.bairro) + " · " + esc(p.tipo) + "</span>" +
        '<h3 class="prop__title">' + esc(p.titulo) + "</h3>" +
        '<ul class="prop__feats">' + feats.join("") + "</ul>" +
        '<div class="prop__foot"><span class="prop__price">' + (isClosed(p) ? esc(p.status) : priceHtml(p)) + "</span>" +
        '<span class="prop__more"><svg class="ico"><use href="#i-arrow"/></svg></span></div>' +
      "</div></button>";
  }

  function render() {
    var list = all.filter(matches);
    if (!list.length) {
      grid.innerHTML = '<div class="props__empty"><strong>Nenhum imóvel com esses filtros no momento.</strong>' +
        'Mas eu posso procurar para você. <a class="service__link" style="color:var(--gold-600)" href="' +
        SITE.waLink(SITE.greet + " Procuro um imóvel: " + describeFilters()) + '" target="_blank" rel="noopener">Me chame no WhatsApp</a></div>';
    } else {
      grid.innerHTML = list.slice(0, shown).map(card).join("");
    }
    moreBtn.hidden = list.length <= shown;

    var desc = describeFilters(true);
    activeBox.hidden = !desc;
    if (desc) activeBox.innerHTML = "Filtrando por: <strong>" + esc(desc) + '</strong> <button type="button" id="clearF">limpar filtros</button>';
  }

  function describeFilters(extraOnly) {
    var parts = [];
    if (!extraOnly && filters.finalidade !== "todos") parts.push(filters.finalidade === "Venda" ? "compra" : "aluguel");
    if (filters.tipo) parts.push(filters.tipo);
    if (filters.bairro) parts.push(filters.bairro);
    if (filters.label) parts.push(filters.label);
    return parts.join(" · ");
  }

  function setFinalidade(f) {
    filters.finalidade = f;
    chips.forEach(function (c) { c.classList.toggle("is-active", c.getAttribute("data-filter") === f); });
  }
  chips.forEach(function (c) {
    c.addEventListener("click", function () { setFinalidade(c.getAttribute("data-filter")); shown = PAGE; render(); });
  });
  moreBtn.addEventListener("click", function () { shown += PAGE; render(); });
  document.getElementById("allBtn").addEventListener("click", function () {
    setFinalidade("todos");
    filters.tipo = filters.bairro = filters.label = "";
    filters.min = 0; filters.max = Infinity;
    shown = Infinity;
    render();
  });
  activeBox.addEventListener("click", function (e) {
    if (e.target.id !== "clearF") return;
    filters.tipo = filters.bairro = filters.label = "";
    filters.min = 0; filters.max = Infinity;
    render();
  });
  grid.addEventListener("click", function (e) {
    var el = e.target.closest(".prop");
    if (el) openModal(all.filter(function (p) { return p._i == el.getAttribute("data-i"); })[0]);
  });

  // ---------- Busca do hero ----------
  var finder = document.getElementById("finder");
  var mode = "comprar";
  var ranges = {
    comprar: [["", "Faixa de preço"], ["0-1000000", "Até R$ 1 milhão"], ["1000000-2000000", "R$ 1 a 2 milhões"], ["2000000-4000000", "R$ 2 a 4 milhões"], ["4000000-", "Acima de R$ 4 milhões"]],
    alugar: [["", "Faixa de preço"], ["0-5000", "Até R$ 5 mil/mês"], ["5000-10000", "R$ 5 a 10 mil/mês"], ["10000-", "Acima de R$ 10 mil/mês"]],
    vender: [["", "Valor estimado"], ["Até R$ 1 milhão", "Até R$ 1 milhão"], ["R$ 1 a 2 milhões", "R$ 1 a 2 milhões"], ["R$ 2 a 4 milhões", "R$ 2 a 4 milhões"], ["Acima de R$ 4 milhões", "Acima de R$ 4 milhões"], ["Não sei ainda", "Não sei ainda"]]
  };
  function fillRanges() {
    finder.valor.innerHTML = ranges[mode].map(function (o) { return '<option value="' + o[0] + '">' + o[1] + "</option>"; }).join("");
  }
  fillRanges();
  finder.querySelectorAll("[data-mode]").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.getAttribute("data-mode");
      finder.querySelectorAll("[data-mode]").forEach(function (o) {
        o.classList.toggle("is-active", o === b);
        o.setAttribute("aria-selected", String(o === b));
      });
      fillRanges();
      finder.querySelector(".finder__go span").textContent = mode === "vender" ? "Quero vender" : "Buscar imóveis";
      finder.querySelector(".finder__go use").setAttribute("href", mode === "vender" ? "#i-wa" : "#i-search");
    });
  });
  finder.addEventListener("submit", function (e) {
    e.preventDefault();
    if (mode === "vender") {
      SITE.openWa(SITE.greet + " Quero vender meu imóvel:\n\n" +
        "*Tipo:* " + (finder.tipo.value || "—") + "\n" +
        "*Região:* " + (finder.regiao.value || "—") + "\n" +
        "*Valor estimado:* " + (finder.valor.value || "—"));
      return;
    }
    var r = finder.valor.value.split("-");
    setFinalidade(mode === "comprar" ? "Venda" : "Aluguel");
    filters.tipo = finder.tipo.value;
    filters.bairro = finder.regiao.value;
    filters.min = r[0] ? +r[0] : 0;
    filters.max = r[1] ? +r[1] : Infinity;
    filters.label = finder.valor.value ? finder.valor.options[finder.valor.selectedIndex].text : "";
    shown = PAGE;
    render();
    document.getElementById("imoveis").scrollIntoView({ behavior: "smooth" });
  });

  // ---------- Detalhes do imóvel ----------
  var modal = document.getElementById("modal");
  var mImg = document.getElementById("mImg");
  var media = modal.querySelector(".modal__media");
  var thumbs = document.getElementById("mThumbs");
  var current = null, idx = 0, lastFocus = null;

  function showPhoto(i) {
    var fotos = current.fotos.length ? current.fotos : ["assets/img/sala.jpg"];
    idx = (i + fotos.length) % fotos.length;
    mImg.src = fotos[idx];
    document.getElementById("mCount").textContent = (idx + 1) + " / " + fotos.length;
    thumbs.querySelectorAll("button").forEach(function (b, j) { b.classList.toggle("is-active", j === idx); });
  }

  function openModal(p) {
    if (!p) return;
    current = p;
    lastFocus = document.activeElement;
    var closed = isClosed(p);
    mImg.alt = p.titulo;
    media.classList.toggle("is-closed", closed);
    var st = document.getElementById("mStatus");
    st.textContent = p.status && p.status !== "Disponível" ? p.status : (isRent(p) ? "Aluguel" : "Venda");
    st.classList.toggle("is-closed", closed);
    modal.querySelectorAll(".modal__nav").forEach(function (b) { b.hidden = p.fotos.length < 2; });
    document.getElementById("mCount").hidden = p.fotos.length < 2;
    thumbs.innerHTML = p.fotos.length > 1 ? p.fotos.map(function (f, j) {
      return '<button type="button" data-j="' + j + '" aria-label="Foto ' + (j + 1) + '"><img src="' + esc(f) + '" alt="" loading="lazy"></button>';
    }).join("") : "";
    showPhoto(0);

    document.getElementById("mMeta").textContent = [p.codigo, p.tipo, p.bairro].filter(Boolean).join(" · ");
    document.getElementById("mTitle").textContent = p.titulo;
    document.getElementById("mPrice").innerHTML = closed ? esc(p.status) : priceHtml(p);
    var f = [];
    if (p.area) f.push("<li><strong>" + p.area + "</strong>m²</li>");
    if (p.dormitorios) f.push("<li><strong>" + p.dormitorios + "</strong>" + (p.dormitorios == 1 ? "dormitório" : "dormitórios") + "</li>");
    if (p.suites) f.push("<li><strong>" + p.suites + "</strong>" + (p.suites == 1 ? "suíte" : "suítes") + "</li>");
    if (p.vagas) f.push("<li><strong>" + p.vagas + "</strong>" + (p.vagas == 1 ? "vaga" : "vagas") + "</li>");
    document.getElementById("mFeats").innerHTML = f.join("");
    var c = [];
    if (p.condominio) c.push("<div><dt>Condomínio</dt><dd>" + money(p.condominio) + "</dd></div>");
    if (p.iptu) c.push("<div><dt>IPTU</dt><dd>" + money(p.iptu) + "/mês</dd></div>");
    document.getElementById("mCosts").innerHTML = c.join("");
    document.getElementById("mDesc").textContent = p.descricao || "";

    var wa = document.getElementById("mWa");
    var msg = closed
      ? SITE.greet + " Vi o imóvel " + (p.codigo || "") + " (" + p.titulo + ", " + p.bairro + "), que já foi " + p.status.toLowerCase() + ". Tem algo parecido?"
      : SITE.greet + " Tenho interesse no imóvel " + (p.codigo || "") + " — " + p.titulo + " (" + p.bairro + ").\n" + linkTo(p);
    wa.href = SITE.waLink(msg);
    wa.lastChild.textContent = closed ? " Quero um parecido" : " Tenho interesse";

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (location.hash !== "#" + slug(p)) history.replaceState(null, "", "#" + slug(p));
    modal.querySelector(".modal__close").focus();
  }

  function closeModal() {
    if (modal.hidden) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus) lastFocus.focus();
  }

  function openFromHash() {
    var h = location.hash.slice(1);
    if (h.indexOf("imovel-") !== 0) return;
    openModal(all.filter(function (p) { return slug(p) === h; })[0]);
  }
  window.addEventListener("hashchange", openFromHash);

  modal.querySelector(".modal__close").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  modal.querySelector(".modal__nav--prev").addEventListener("click", function () { showPhoto(idx - 1); });
  modal.querySelector(".modal__nav--next").addEventListener("click", function () { showPhoto(idx + 1); });
  thumbs.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) showPhoto(+b.getAttribute("data-j"));
  });
  document.addEventListener("keydown", function (e) {
    if (modal.hidden) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") showPhoto(idx - 1);
    if (e.key === "ArrowRight") showPhoto(idx + 1);
  });
  // Arrastar para trocar foto no celular
  var x0 = null;
  media.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  media.addEventListener("touchend", function (e) {
    if (x0 === null) return;
    var dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 40) showPhoto(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });

  document.getElementById("mShare").addEventListener("click", function () {
    var url = linkTo(current);
    var label = this.querySelector("span");
    if (navigator.share) {
      navigator.share({ title: current.titulo + " — Amoury Imóveis", url: url }).catch(function () {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        label.textContent = "Link copiado!";
        setTimeout(function () { label.textContent = "Compartilhar"; }, 2000);
      });
    }
  });

  // Nota de CRECI do responsável nos anúncios
  if (cfg.creciResponsavel) {
    document.querySelectorAll("[data-creci-note]").forEach(function (el) {
      el.textContent = " Intermediação: " + cfg.creciResponsavel + ". Valores e disponibilidade sujeitos a confirmação.";
    });
  }
})();
