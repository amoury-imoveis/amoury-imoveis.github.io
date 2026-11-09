/* Painel de imóveis da Amoury — cadastro, edição e situação dos anúncios */
(function () {
  "use strict";
  var KEY = "amouryChave";
  var RAW = "https://raw.githubusercontent.com/amoury-imoveis/amoury-imoveis.github.io/main/";
  var DEMO = /[?&]demo\b/.test(location.search);

  var $ = function (id) { return document.getElementById(id); };
  var repo = null;
  var data = { imoveis: [] };
  var filter = "todos";
  var editing = null;   // código original do imóvel em edição (null = novo)
  var photos = [];      // [{ path, src }] existentes ou { src, base64, isNew }
  var localSrc = {};    // fotos recém-enviadas: path -> dataURL

  var brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
  function esc(t) {
    return String(t == null ? "" : t).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isClosed(p) { return p.status === "Vendido" || p.status === "Alugado"; }
  function img(path) {
    if (!path) return "";
    if (localSrc[path]) return localSrc[path];
    return DEMO ? "../" + path : RAW + path;
  }
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { t.hidden = true; }, 3200);
  }

  // ---------- Acesso ----------
  function show(id) {
    ["login", "list"].forEach(function (s) { $(s).hidden = s !== id; });
    $("topActions").hidden = id !== "list";
  }

  function start(token) {
    if (DEMO) { loadDemo(); return; }
    repo = new window.AmouryRepo(token);
    show("list");
    renderSkeleton();
    repo.check()
      .then(function () { return repo.load(); })
      .then(function (d) { data = d; render(); })
      .catch(function (e) {
        if (e.status === 401 || e.status === 403 || e.status === 404 || /permissão/.test(e.message)) {
          try { localStorage.removeItem(KEY); } catch (_) {}
          show("login");
          $("loginErr").textContent = "Essa chave não funcionou. Confira se copiou inteira ou peça um novo link.";
          $("loginErr").hidden = false;
        } else {
          toast("Sem conexão com o servidor. Tente de novo em instantes.");
        }
      });
  }

  function loadDemo() {
    show("list");
    renderSkeleton();
    fetch("../data/imoveis.json", { cache: "no-store" }).then(function (r) { return r.json(); })
      .then(function (d) {
        data = d; render(); toast("Modo demonstração: nada será salvo.");
        if (location.search.indexOf("form") > -1) openForm(data.imoveis[0]);
      });
  }

  (function boot() {
    var m = location.hash.match(/chave=([^&]+)/);
    var token = m ? decodeURIComponent(m[1]) : null;
    if (token) {
      try { localStorage.setItem(KEY, token); } catch (_) {}
      history.replaceState(null, "", location.pathname + location.search);
    } else {
      try { token = localStorage.getItem(KEY); } catch (_) {}
    }
    if (token || DEMO) start(token);
    else show("login");
  })();

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var t = $("tokenInput").value.trim();
    if (!t) return;
    try { localStorage.setItem(KEY, t); } catch (_) {}
    $("loginErr").hidden = true;
    start(t);
  });
  $("logout").addEventListener("click", function () {
    try { localStorage.removeItem(KEY); } catch (_) {}
    location.reload();
  });

  // ---------- Lista ----------
  function renderSkeleton() {
    $("cards").innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
  }

  function priceTxt(p) {
    if (!p.preco) return "Sob consulta";
    return brl.format(p.preco) + (p.finalidade === "Aluguel" ? " <small>/mês</small>" : "");
  }

  function render() {
    var all = data.imoveis || [];
    var disp = all.filter(function (p) { return !isClosed(p); }).length;
    $("summary").textContent = all.length
      ? all.length + (all.length === 1 ? " imóvel" : " imóveis") + " · " + disp + " disponíve" + (disp === 1 ? "l" : "is") + " no site"
      : "Nenhum imóvel cadastrado ainda";

    var list = all.filter(function (p) {
      if (filter === "todos") return true;
      if (filter === "fechados") return isClosed(p);
      return p.finalidade === filter;
    });

    if (!list.length) {
      $("cards").innerHTML = '<div class="empty"><strong>' + (all.length ? "Nada por aqui" : "Vamos cadastrar o primeiro?") +
        "</strong>Toque em <b>Cadastrar imóvel</b> para começar.</div>";
      return;
    }

    $("cards").innerHTML = list.map(function (p) {
      var i = all.indexOf(p);
      var cover = p.fotos && p.fotos[0];
      var feats = [p.area ? p.area + " m²" : "", p.dormitorios ? p.dormitorios + " dorm." : "", p.vagas ? p.vagas + (p.vagas == 1 ? " vaga" : " vagas") : ""].filter(Boolean).join(" · ");
      var dot = p.status === "Reservado" ? "dot--res" : isClosed(p) ? "dot--off" : "dot--ok";
      return '<article class="card' + (isClosed(p) ? " is-closed" : "") + '">' +
        '<div class="card__img"' + (cover ? ' style="background-image:url(\'' + esc(img(cover)) + '\')"' : "") + ">" +
          (cover ? "" : '<span class="card__nophoto">Sem foto</span>') +
          '<span class="card__code">' + esc(p.codigo) + "</span>" +
          '<span class="card__fin' + (p.finalidade === "Aluguel" ? " card__fin--al" : "") + '">' + esc(p.finalidade) + "</span>" +
          (p.destaque ? '<span class="card__star"><svg><use href="#i-star"/></svg>Destaque</span>' : "") +
        "</div>" +
        '<div class="card__body">' +
          '<div class="card__loc"><svg><use href="#i-pin"/></svg>' + esc(p.bairro) + " · " + esc(p.tipo) + "</div>" +
          '<h3 class="card__title">' + esc(p.titulo) + "</h3>" +
          '<div class="card__price">' + priceTxt(p) + "</div>" +
          (feats ? '<div class="card__feats">' + esc(feats) + "</div>" : "") +
        "</div>" +
        '<div class="card__foot">' +
          '<button class="status" data-act="status" data-i="' + i + '"><i class="dot ' + dot + '"></i>' + esc(p.status || "Disponível") + "</button>" +
          '<button class="icon-btn" data-act="edit" data-i="' + i + '" aria-label="Editar"><svg><use href="#i-edit"/></svg></button>' +
          '<button class="icon-btn icon-btn--danger" data-act="del" data-i="' + i + '" aria-label="Excluir"><svg><use href="#i-trash"/></svg></button>' +
        "</div></article>";
    }).join("");
  }

  document.querySelector(".tabs").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    filter = b.getAttribute("data-f");
    this.querySelectorAll("button").forEach(function (o) { o.classList.toggle("is-on", o === b); });
    render();
  });

  $("cards").addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var p = data.imoveis[+b.getAttribute("data-i")];
    var act = b.getAttribute("data-act");
    if (act === "edit") openForm(p);
    if (act === "status") openStatus(p);
    if (act === "del") confirmDelete(p);
  });
  $("newBtn").addEventListener("click", function () { openForm(null); });

  // ---------- Salvar ----------
  function busy(title, text) {
    $("busy").hidden = false;
    $("busySpin").hidden = false;
    $("busyDone").hidden = true;
    $("busyActions").hidden = true;
    $("busyTitle").textContent = title;
    $("busyText").textContent = text || "";
  }
  function busyDone(title, text) {
    $("busySpin").hidden = true;
    $("busyDone").hidden = false;
    $("busyActions").hidden = false;
    $("busyTitle").textContent = title;
    $("busyText").textContent = text;
  }
  $("busyOk").addEventListener("click", function () { $("busy").hidden = true; });

  function commit(message, change, uploads, removals, doneTitle) {
    if (DEMO) { toast("Modo demonstração: nada foi salvo."); return Promise.resolve(false); }
    busy("Salvando…", "Não feche esta tela.");
    var attempt = function (n) {
      return repo.save(message, change, uploads, removals, function (s) { $("busyText").textContent = s; })
        .catch(function (e) {
          if (n < 2 && (e.status === 409 || e.status === 422)) return attempt(n + 1);
          throw e;
        });
    };
    return attempt(1).then(function (fresh) {
      data = fresh;
      render();
      busyDone(doneTitle || "Pronto! 🎉", "Em 1 a 3 minutos a mudança aparece no site (se não aparecer, recarregue a página).");
      return true;
    }).catch(function () {
      $("busy").hidden = true;
      toast("Não foi possível salvar. Verifique a internet e tente de novo.");
      return false;
    });
  }
  function byCode(list, code) {
    for (var i = 0; i < list.length; i++) if (list[i].codigo === code) return i;
    return -1;
  }

  // Situação rápida
  var statusTarget = null;
  function openStatus(p) {
    statusTarget = p;
    $("popTitle").textContent = p.codigo + " · " + p.titulo;
    $("statusPop").querySelectorAll("[data-v]").forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-v") === (p.status || "Disponível"));
    });
    $("statusPop").hidden = false;
  }
  $("statusPop").addEventListener("click", function (e) {
    if (e.target === this || e.target.hasAttribute("data-close")) { this.hidden = true; return; }
    var b = e.target.closest("[data-v]");
    if (!b) return;
    var v = b.getAttribute("data-v");
    var code = statusTarget.codigo;
    this.hidden = true;
    if (v === (statusTarget.status || "Disponível")) return;
    commit("Situação de " + code + ": " + v, function (d) {
      var i = byCode(d.imoveis, code);
      if (i > -1) d.imoveis[i].status = v;
    }, [], [], v === "Vendido" ? "Parabéns pela venda! 🎉" : v === "Alugado" ? "Parabéns, alugado! 🎉" : "Pronto! ✅");
  });

  // Excluir
  var delTarget = null;
  function confirmDelete(p) {
    delTarget = p;
    $("confirmTitle").textContent = "Excluir " + p.codigo + "?";
    $("confirmText").textContent = "\"" + p.titulo + "\" sairá do site junto com as fotos. Se ele foi vendido ou alugado, você também pode só mudar a situação.";
    $("confirmPop").hidden = false;
  }
  $("confirmPop").addEventListener("click", function (e) {
    if (e.target === this || e.target.hasAttribute("data-close")) this.hidden = true;
  });
  $("confirmOk").addEventListener("click", function () {
    var p = delTarget;
    $("confirmPop").hidden = true;
    var fotos = (p.fotos || []).filter(function (f) { return f.indexOf("assets/imoveis/") === 0; });
    commit("Remove imóvel " + p.codigo, function (d) {
      var i = byCode(d.imoveis, p.codigo);
      if (i > -1) d.imoveis.splice(i, 1);
    }, [], fotos, "Imóvel excluído ✅");
  });

  // ---------- Formulário ----------
  var form = $("form");
  var fields = {
    titulo: $("fTitulo"), tipo: $("fTipo"), bairro: $("fBairro"), destaque: $("fDestaque"),
    preco: $("fPreco"), condominio: $("fCond"), iptu: $("fIptu"), area: $("fArea"),
    descricao: $("fDesc"), codigo: $("fCodigo")
  };

  function setChoice(name, v) {
    form.querySelectorAll('[data-name="' + name + '"] button').forEach(function (b) {
      b.classList.toggle("is-on", b.getAttribute("data-v") === v);
    });
    if (name === "finalidade") $("precoLbl").textContent = v === "Aluguel" ? "Valor do aluguel por mês" : "Preço de venda";
  }
  function getChoice(name) {
    var b = form.querySelector('[data-name="' + name + '"] button.is-on');
    return b ? b.getAttribute("data-v") : "";
  }
  form.querySelectorAll(".seg, .chips").forEach(function (g) {
    g.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (b) setChoice(g.getAttribute("data-name"), b.getAttribute("data-v"));
    });
  });

  function setStep(name, v) { form.querySelector('[data-name="' + name + '"] output').textContent = v || 0; }
  function getStep(name) { return +form.querySelector('[data-name="' + name + '"] output').textContent || 0; }
  form.querySelectorAll(".stepper").forEach(function (s) {
    s.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      var out = s.querySelector("output");
      out.textContent = Math.max(0, Math.min(20, (+out.textContent || 0) + +b.getAttribute("data-d")));
    });
  });

  function fmtNum(n) { return n ? Number(n).toLocaleString("pt-BR") : ""; }
  function num(el) { return +el.value.replace(/\D/g, "") || 0; }
  [fields.preco, fields.condominio, fields.iptu, fields.area].forEach(function (el) {
    el.addEventListener("input", function () {
      var d = el.value.replace(/\D/g, "").slice(0, 10);
      el.value = d ? Number(d).toLocaleString("pt-BR") : "";
    });
  });

  function nextCode() {
    var max = 0;
    (data.imoveis || []).forEach(function (p) {
      var m = /^AM-(\d+)$/i.exec(p.codigo || "");
      if (m) max = Math.max(max, +m[1]);
    });
    return "AM-" + String(max + 1).padStart(2, "0");
  }

  function openForm(p) {
    editing = p ? p.codigo : null;
    $("formTitle").textContent = p ? "Editar " + p.codigo : "Novo imóvel";
    p = p || { finalidade: "Venda", status: "Disponível", tipo: "Apartamento", bairro: "Morumbi" };
    setChoice("finalidade", p.finalidade || "Venda");
    setChoice("status", p.status || "Disponível");
    fields.titulo.value = p.titulo || "";
    fields.tipo.value = p.tipo || "Apartamento";
    fields.bairro.value = p.bairro || "Morumbi";
    fields.destaque.checked = !!p.destaque;
    fields.preco.value = fmtNum(p.preco);
    fields.condominio.value = fmtNum(p.condominio);
    fields.iptu.value = fmtNum(p.iptu);
    fields.area.value = fmtNum(p.area);
    setStep("dormitorios", p.dormitorios);
    setStep("suites", p.suites);
    setStep("vagas", p.vagas);
    fields.descricao.value = p.descricao || "";
    fields.codigo.value = p.codigo || nextCode();
    photos = (p.fotos || []).map(function (f) { return { path: f, src: img(f) }; });
    renderPhotos();
    form.querySelectorAll(".is-bad").forEach(function (el) { el.classList.remove("is-bad"); });
    $("sheet").hidden = false;
    document.body.style.overflow = "hidden";
    form.querySelector(".sheet__body").scrollTop = 0;
  }
  function closeForm() {
    $("sheet").hidden = true;
    document.body.style.overflow = "";
  }
  $("closeForm").addEventListener("click", closeForm);
  $("cancelForm").addEventListener("click", closeForm);

  // Fotos
  function renderPhotos() {
    $("photos").innerHTML = photos.map(function (ph, i) {
      return '<div class="photo" style="background-image:url(\'' + esc(ph.src) + '\')">' +
        (i === 0 ? '<span class="photo__cover">CAPA</span>' : "") +
        '<div class="photo__bar">' +
          '<button type="button" data-a="left" data-i="' + i + '" aria-label="Mover para a esquerda"' + (i === 0 ? " disabled" : "") + '><svg><use href="#i-left"/></svg></button>' +
          '<button type="button" data-a="del" data-i="' + i + '" aria-label="Remover foto"><svg><use href="#i-x"/></svg></button>' +
          '<button type="button" data-a="right" data-i="' + i + '" aria-label="Mover para a direita"' + (i === photos.length - 1 ? " disabled" : "") + '><svg><use href="#i-right"/></svg></button>' +
        "</div></div>";
    }).join("");
  }
  $("photos").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    var i = +b.getAttribute("data-i");
    var a = b.getAttribute("data-a");
    if (a === "del") photos.splice(i, 1);
    if (a === "left" && i > 0) photos.splice(i - 1, 0, photos.splice(i, 1)[0]);
    if (a === "right" && i < photos.length - 1) photos.splice(i + 1, 0, photos.splice(i, 1)[0]);
    renderPhotos();
  });

  // Reduz a foto no próprio celular antes de enviar (máx. 1600 px, JPEG)
  function shrink(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var max = 1600;
        var s = Math.min(1, max / Math.max(im.width, im.height));
        var c = document.createElement("canvas");
        c.width = Math.round(im.width * s);
        c.height = Math.round(im.height * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var dataUrl = c.toDataURL("image/jpeg", 0.82);
        resolve({ src: dataUrl, base64: dataUrl.split(",")[1], isNew: true });
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error("foto")); };
      im.src = url;
    });
  }
  $("fileInput").addEventListener("change", function () {
    var files = Array.prototype.slice.call(this.files || []);
    this.value = "";
    if (!files.length) return;
    toast("Preparando " + files.length + (files.length === 1 ? " foto…" : " fotos…"));
    files.reduce(function (chain, f) {
      return chain.then(function () {
        return shrink(f).then(function (ph) { photos.push(ph); renderPhotos(); })
          .catch(function () { toast("Uma das fotos não pôde ser lida. Tente outra."); });
      });
    }, Promise.resolve());
  });

  function slug(t) {
    return String(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var bad = [];
    if (!fields.titulo.value.trim()) bad.push(fields.titulo);
    var code = fields.codigo.value.trim().toUpperCase() || nextCode();
    var clash = (data.imoveis || []).some(function (p) { return p.codigo === code && p.codigo !== editing; });
    if (clash) bad.push(fields.codigo);
    form.querySelectorAll(".is-bad").forEach(function (el) { el.classList.remove("is-bad"); });
    bad.forEach(function (el) { el.classList.add("is-bad"); });
    if (bad.length) {
      if (clash) { form.querySelector(".more").open = true; toast("Já existe um imóvel com o código " + code + "."); }
      else toast("Dê um título para o anúncio.");
      bad[0].scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!photos.length) { toast("Adicione pelo menos uma foto."); $("photos").scrollIntoView({ behavior: "smooth" }); return; }

    var stamp = Date.now().toString(36);
    var uploads = [];
    var fotos = photos.map(function (ph, i) {
      if (!ph.isNew) return ph.path;
      var path = "assets/imoveis/" + slug(code) + "-" + stamp + "-" + (i + 1) + ".jpg";
      uploads.push({ path: path, base64: ph.base64 });
      localSrc[path] = ph.src;
      return path;
    });

    var item = {
      codigo: code,
      titulo: fields.titulo.value.trim(),
      finalidade: getChoice("finalidade") || "Venda",
      status: getChoice("status") || "Disponível",
      destaque: fields.destaque.checked,
      tipo: fields.tipo.value,
      bairro: fields.bairro.value,
      preco: num(fields.preco),
      condominio: num(fields.condominio),
      iptu: num(fields.iptu),
      area: num(fields.area),
      dormitorios: getStep("dormitorios"),
      suites: getStep("suites"),
      vagas: getStep("vagas"),
      descricao: fields.descricao.value.trim(),
      fotos: fotos
    };

    var original = editing;
    var removals = [];
    if (original) {
      var old = (data.imoveis || [])[byCode(data.imoveis || [], original)];
      removals = ((old && old.fotos) || []).filter(function (f) { return fotos.indexOf(f) === -1 && f.indexOf("assets/imoveis/") === 0; });
    }

    commit((original ? "Atualiza " : "Novo imóvel ") + code + " — " + item.titulo, function (d) {
      d.imoveis = d.imoveis || [];
      var i = original ? byCode(d.imoveis, original) : -1;
      if (i > -1) d.imoveis[i] = item;
      else d.imoveis.unshift(item);
    }, uploads, removals, original ? "Alterações salvas! ✅" : "Imóvel cadastrado! 🎉").then(function (ok) {
      if (ok || DEMO) closeForm();
    });
  });
})();
