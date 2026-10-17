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
    "position:fixed;inset:0;z-index:2147483647;background:rgba(20,20,20,.55);display:none;align-items:center;justify-content:center;padding:16px"
  );
  var frame = document.createElement("iframe");
  frame.setAttribute("allow", "camera");
  frame.setAttribute("title", "Chairside consultation");
  frame.setAttribute("style", "width:min(1100px,100%);height:min(860px,100%);border:0;background:#fff");
  var close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Close");
  close.textContent = "×";
  close.setAttribute(
    "style",
    "position:absolute;top:12px;right:16px;width:44px;height:44px;border:0;background:#fff;font:28px/1 Helvetica,Arial;cursor:pointer"
  );
  overlay.appendChild(frame);
  overlay.appendChild(close);

  btn.onclick = function () {
    if (!frame.src) frame.src = origin + "/consult?embed=1&salon=" + encodeURIComponent(salon);
    overlay.style.display = "flex";
  };
  close.onclick = function () {
    overlay.style.display = "none";
  };
  overlay.onclick = function (e) {
    if (e.target === overlay) overlay.style.display = "none";
  };

  document.body.appendChild(btn);
  document.body.appendChild(overlay);
})();
