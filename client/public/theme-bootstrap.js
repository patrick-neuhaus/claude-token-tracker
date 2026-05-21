// Theme bootstrap (FOUC prevention) — externalized from index.html inline script
// per Onda 9 Worker BB to allow CSP scriptSrc 'self' without 'unsafe-inline'.
// Runs synchronously before <body> renders to set .dark class before paint.
(function () {
  try {
    var theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
