/*
 * Mock-up switch only: ?lang=en and ?theme=dark. No other behaviour.
 * Without this file the page shows Thai in the system's colour scheme.
 * It also carries the two parameters onto links to the other mock-up pages
 * and updates the toggle links, so the choice survives navigation.
 */
(function () {
  var q = new URLSearchParams(location.search);
  var root = document.documentElement;
  var lang = q.get("lang") === "en" ? "en" : "th";
  var theme = q.get("theme") === "dark" ? "dark" : q.get("theme") === "light" ? "light" : "";
  root.lang = lang;
  if (theme) root.setAttribute("data-theme", theme);

  var titleEn = document.querySelector('meta[name="title-en"]');
  if (lang === "en" && titleEn) document.title = titleEn.content;

  function href(l, t, base) {
    var p = new URLSearchParams();
    if (l === "en") p.set("lang", "en");
    if (t) p.set("theme", t);
    var s = p.toString();
    return (base || "") + (s ? "?" + s : "");
  }

  document.querySelectorAll("a[href]").forEach(function (a) {
    var h = a.getAttribute("data-switch");
    if (h === "lang-th") a.href = href("th", theme);
    else if (h === "lang-en") a.href = href("en", theme);
    else if (h === "theme-light") a.href = href(lang, "light");
    else if (h === "theme-dark") a.href = href(lang, "dark");
    else {
      var raw = a.getAttribute("href");
      if (/^[\w-]+\.html(#.*)?$/.test(raw)) {
        var parts = raw.split("#");
        a.href = href(lang, theme, parts[0]) + (parts[1] ? "#" + parts[1] : "");
      }
    }
  });

  document.querySelectorAll("[data-switch]").forEach(function (a) {
    var k = a.getAttribute("data-switch");
    var on = (k === "lang-" + lang) || (k === "theme-dark" && theme === "dark") || (k === "theme-light" && theme === "light");
    if (on) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
  });
})();
