/* Acesso ao repositório do site pela API do GitHub (um commit por salvamento) */
(function (root) {
  "use strict";
  var REPO = "amoury-imoveis/amoury-imoveis.github.io";
  var BRANCH = "main";
  var DATA = "data/imoveis.json";
  var API = "https://api.github.com/repos/" + REPO;

  function Repo(token) { this.token = token; }

  Repo.prototype.call = function (path, opts) {
    opts = opts || {};
    return fetch(API + path, {
      method: opts.method || "GET",
      headers: {
        Authorization: "Bearer " + this.token,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json"
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: "no-store"
    }).then(function (r) {
      if (!r.ok) {
        return r.text().then(function (t) {
          var e = new Error("GitHub " + r.status + ": " + t.slice(0, 200));
          e.status = r.status;
          throw e;
        });
      }
      return r.status === 204 ? null : r.json();
    });
  };

  // Confere se a chave tem permissão de escrita no repositório
  Repo.prototype.check = function () {
    return this.call("").then(function (repo) {
      if (!repo.permissions || !repo.permissions.push) throw new Error("A chave não tem permissão para editar o site.");
      return repo;
    });
  };

  function decode(b64) {
    var bin = atob(b64.replace(/\n/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }

  Repo.prototype.load = function () {
    return this.call("/contents/" + DATA + "?ref=" + BRANCH).then(function (f) {
      return JSON.parse(decode(f.content));
    });
  };

  /*
   * Salva em um único commit:
   *   change(data) -> recebe a versão mais recente do JSON e a altera
   *   uploads      -> [{ path, base64 }] arquivos novos
   *   removals     -> [path] arquivos a apagar
   */
  Repo.prototype.save = function (message, change, uploads, removals, onStep) {
    var self = this;
    var step = onStep || function () {};
    var head, baseTree, data;
    uploads = uploads || [];
    removals = removals || [];

    return self.call("/git/ref/heads/" + BRANCH)
      .then(function (ref) { head = ref.object.sha; return self.call("/git/commits/" + head); })
      .then(function (c) { baseTree = c.tree.sha; return self.load(); })
      .then(function (fresh) {
        data = fresh;
        change(data);
        var blobs = [];
        var chain = Promise.resolve();
        uploads.forEach(function (u, i) {
          chain = chain.then(function () {
            step("Enviando fotos (" + (i + 1) + "/" + uploads.length + ")…");
            return self.call("/git/blobs", { method: "POST", body: { content: u.base64, encoding: "base64" } })
              .then(function (b) { blobs.push({ path: u.path, mode: "100644", type: "blob", sha: b.sha }); });
          });
        });
        return chain.then(function () { return blobs; });
      })
      .then(function (blobs) {
        step("Publicando no site…");
        return self.call("/git/blobs", { method: "POST", body: { content: JSON.stringify(data, null, 2) + "\n", encoding: "utf-8" } })
          .then(function (b) {
            var tree = blobs.concat([{ path: DATA, mode: "100644", type: "blob", sha: b.sha }]);
            removals.forEach(function (p) { tree.push({ path: p, mode: "100644", type: "blob", sha: null }); });
            return self.call("/git/trees", { method: "POST", body: { base_tree: baseTree, tree: tree } });
          });
      })
      .then(function (t) {
        return self.call("/git/commits", { method: "POST", body: { message: message, tree: t.sha, parents: [head] } });
      })
      .then(function (c) {
        return self.call("/git/refs/heads/" + BRANCH, { method: "PATCH", body: { sha: c.sha } });
      })
      .then(function () { return data; });
  };

  root.AmouryRepo = Repo;
  if (typeof module !== "undefined") module.exports = Repo;
})(typeof window !== "undefined" ? window : globalThis);
