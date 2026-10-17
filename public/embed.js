// Chairside embed: adds a "Try your look" button that opens the consultation in an overlay.
(function () {
  var me = document.currentScript || document.querySelector('script[src*="embed.js"]');
  var origin = new URL(me.src, location.href).origin;
  var salon = (me && me.getAttribute("data-salon")) || "";

  var btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Try your look";
  btn.setAttribute(
    "style",
    "position:fixed;right:20px;bottom:20px;z-index:2147483646;padding:16px 22px;background:#141414;color:#fff;border:0;" +
      "font:500 13px/1 Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18)"
  );

  var overlay = document.createElement("div");
  overlay.setAttribute(
    "style",
    "position:fixed;inset:0;z-index:2147483647;background:rgba(20,20,20,.7);display:none;flex-direction:column;align-items:center;padding:0 0 env(safe-area-inset-bottom)"
  );
  var frame = document.createElement("iframe");
  frame.setAttribute("allow", "camera");
  frame.setAttribute("title", "Chairside consultation");
  // Full screen on phones; a centred panel on larger screens. The close button sits in its own bar, never over the page.
  var wide = window.matchMedia("(min-width: 768px)").matches;
  frame.setAttribute("style", "flex:1;width:" + (wide ? "min(1100px,calc(100% - 32px))" : "100%") + ";max-height:" + (wide ? "860px" : "none") + ";border:0;background:#fff;margin-bottom:" + (wide ? "16px" : "0"));
  var bar = document.createElement("div");
  bar.setAttribute("style", "width:" + (wide ? "min(1100px,calc(100% - 32px))" : "100%") + ";display:flex;justify-content:flex-end;padding-top:" + (wide ? "8px" : "0") + ";background:" + (wide ? "transparent" : "#141414"));
  var close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.textContent = "×";
  close.setAttribute(
    "style",
    "width:48px;height:48px;border:0;background:transparent;color:#fff;font:30px/1 Helvetica,Arial;cursor:pointer"
  );
  bar.appendChild(close);
  overlay.appendChild(bar);
  overlay.appendChild(frame);
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Chairside consultation");

  btn.onclick = function () {
    if (!frame.src) frame.src = origin + "/consult?embed=1&salon=" + encodeURIComponent(salon);
    overlay.style.display = "flex";
    document.documentElement.style.overflow = "hidden";
    close.focus();
  };
  function hide() {
    overlay.style.display = "none";
    document.documentElement.style.overflow = "";
    btn.focus();
  }
  close.onclick = hide;
  overlay.onclick = function (e) {
    if (e.target === overlay) hide();
  };
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.style.display === "flex") hide();
  });

  document.body.appendChild(btn);
  document.body.appendChild(overlay);
})();
