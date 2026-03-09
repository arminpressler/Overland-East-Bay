(function () {
  function qsAll(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "text") node.textContent = attrs[k];
        else if (k === "class") node.className = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function currentUrl() {
    return window.location.href;
  }

  function signinHref() {
    return "/auth/signin?returnTo=" + encodeURIComponent(currentUrl());
  }

  function renderSignedOut(host) {
    clear(host);
    var a = el("a", { class: "ebo-auth-button ebo-auth-button--signin", href: signinHref(), text: "Sign In" });
    host.appendChild(a);
  }

  function renderSignedIn(host) {
    clear(host);
    var btn = el("button", { class: "ebo-auth-button ebo-auth-button--signout", type: "button", text: "Sign Out" });
    btn.addEventListener("click", function () {
      btn.disabled = true;
      fetch("/auth/logout", { method: "POST", credentials: "include" })
        .catch(function () {})
        .finally(function () {
          window.location.reload();
        });
    });
    host.appendChild(btn);
  }

  function bootOne(host) {
    fetch("/api/session", { method: "GET", credentials: "include", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("session");
        return r.json();
      })
      .then(function (json) {
        if (json && json.authenticated) renderSignedIn(host);
        else renderSignedOut(host);
      })
      .catch(function () {
        renderSignedOut(host);
      });
  }

  function boot() {
    qsAll("[data-ebo-auth-status]").forEach(bootOne);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


