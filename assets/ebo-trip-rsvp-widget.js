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

  function resolveTripId(host) {
    var explicit = (host.getAttribute("data-trip-id") || "").trim();
    if (explicit) return explicit;
    var from = host.getAttribute("data-trip-id-from");
    if (from === "query") {
      var param = host.getAttribute("data-trip-id-param") || "tripId";
      var v = new URLSearchParams(window.location.search).get(param);
      return (v || "").trim() || null;
    }
    return null;
  }

  function renderError(host, msg) {
    clear(host);
    host.className = "ebo-rsvp ebo-rsvp--error";
    host.appendChild(el("div", { class: "ebo-rsvp-message ebo-rsvp-message--error", text: msg }));
  }

  function renderSignedOut(host) {
    clear(host);
    host.className = "ebo-rsvp ebo-rsvp--signed-out";
    host.appendChild(el("a", { class: "ebo-rsvp-button ebo-rsvp-button--signin", href: signinHref(), text: "Sign In to RSVP" }));
  }

  function labelFor(r) {
    if (r === "YES") return "Going";
    if (r === "NO") return "Not Going";
    return "RSVP";
  }

  function renderSignedIn(host, tripId, myRsvp) {
    clear(host);
    host.className = "ebo-rsvp ebo-rsvp--signed-in";

    var btn = el("button", { class: "ebo-rsvp-button", type: "button", text: labelFor(myRsvp) });
    btn.classList.add(myRsvp === "YES" ? "ebo-rsvp-button--going" : myRsvp === "NO" ? "ebo-rsvp-button--not-going" : "ebo-rsvp-button--unset");

    var chooser = el("div", { class: "ebo-rsvp-chooser", hidden: "true" });
    function closeChooser() {
      chooser.hidden = true;
      chooser.classList.remove("ebo-rsvp-chooser--open");
      btn.setAttribute("aria-expanded", "false");
    }
    function openChooser() {
      chooser.hidden = false;
      chooser.classList.add("ebo-rsvp-chooser--open");
      btn.setAttribute("aria-expanded", "true");
    }
    function toggleChooser() {
      if (chooser.hidden) openChooser();
      else closeChooser();
    }

    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", toggleChooser);

    function choice(label, value, cls) {
      var c = el("button", { class: "ebo-rsvp-choice " + cls, type: "button", text: label });
      c.addEventListener("click", function () {
        btn.disabled = true;
        c.disabled = true;
        fetch("/api/widgets/my-rsvp?tripId=" + encodeURIComponent(tripId), {
          method: "PUT",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json", "Idempotency-Key": (crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())) },
          body: JSON.stringify({ response: value }),
        })
          .then(function (r) {
            if (r.status === 401) throw new Error("signed-out");
            if (!r.ok) throw new Error("update-failed");
            return r.json();
          })
          .then(function (json) {
            renderSignedIn(host, tripId, (json && json.myRsvp) || value);
          })
          .catch(function (e) {
            if (e && e.message === "signed-out") renderSignedOut(host);
            else renderError(host, "Failed to update RSVP. Please try again.");
          });
      });
      return c;
    }

    chooser.appendChild(choice("Going", "YES", "ebo-rsvp-choice--yes"));
    chooser.appendChild(choice("Not Going", "NO", "ebo-rsvp-choice--no"));
    chooser.appendChild(choice("Clear RSVP", "UNSET", "ebo-rsvp-choice--unset"));

    function onDocClick(ev) {
      if (!host.contains(ev.target)) closeChooser();
    }
    document.addEventListener("click", onDocClick);

    host.appendChild(btn);
    host.appendChild(chooser);
  }

  function bootOne(host) {
    var tripId = resolveTripId(host);
    if (!tripId) return renderError(host, "Trip not specified.");

    host.className = "ebo-rsvp ebo-rsvp--loading";

    fetch("/api/session", { method: "GET", credentials: "include", cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("session");
        return r.json();
      })
      .then(function (json) {
        if (!json || !json.authenticated) return renderSignedOut(host);
        return fetch("/api/widgets/my-rsvp?tripId=" + encodeURIComponent(tripId), {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        })
          .then(function (r) {
            if (r.status === 401) throw new Error("signed-out");
            if (!r.ok) throw new Error("load-failed");
            return r.json();
          })
          .then(function (json2) {
            renderSignedIn(host, tripId, (json2 && json2.myRsvp) || "UNSET");
          });
      })
      .catch(function (e) {
        if (e && e.message === "signed-out") renderSignedOut(host);
        else renderSignedOut(host);
      });
  }

  function boot() {
    qsAll("[data-ebo-trip-rsvp]").forEach(bootOne);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


