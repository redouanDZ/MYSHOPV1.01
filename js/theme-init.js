(function () {
  'use strict';

  var STORAGE_KEY = 'theme';

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    var normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    var root = document.documentElement;
    root.setAttribute('data-theme', normalizedTheme);
    root.classList.toggle('dark', normalizedTheme === 'dark');
    if (document.body) {
      document.body.classList.toggle('dark-mode', normalizedTheme === 'dark');
    }
    return normalizedTheme;
  }

  function applySavedTheme() {
    var savedTheme = null;
    try {
      savedTheme = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}
    return applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : getSystemTheme());
  }

  function setTheme(theme) {
    var normalizedTheme = theme === 'dark' ? 'dark' : 'light';
    try {
      localStorage.setItem(STORAGE_KEY, normalizedTheme);
    } catch (e) {}
    return applyTheme(normalizedTheme);
  }

  window.ThemeManager = {
    getCurrentTheme: getCurrentTheme,
    applySavedTheme: applySavedTheme,
    setTheme: setTheme
  };

  applySavedTheme();
})();
