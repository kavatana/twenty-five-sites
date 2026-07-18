/* FOLD · The Smallest Mountain
   Pop-up choreography: an IntersectionObserver toggles .in on each
   spread; CSS transitions with an overshoot cubic-bezier do the
   actual paper-raising. JS stays tiny on purpose. */
(function () {
  "use strict";

  var spreads = Array.prototype.slice.call(document.querySelectorAll(".spread"));
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var curl = document.querySelector(".curl");
  var again = document.querySelector(".again");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  var current = 0;

  /* --- raise / lower spreads as they cross the fold of the viewport --- */
  var popIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle("in", entry.isIntersecting);
    });
  }, { threshold: 0.33 });

  /* --- track which spread is "the open page" for tabs + curl --- */
  var pageIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        current = spreads.indexOf(entry.target);
        tabs.forEach(function (tab, i) {
          if (i === current) tab.setAttribute("aria-current", "true");
          else tab.removeAttribute("aria-current");
        });
        if (curl) {
          curl.setAttribute("aria-label",
            current === spreads.length - 1 ? "Back to the first page" : "Turn the page");
        }
      }
    });
  }, { threshold: 0.55 });

  spreads.forEach(function (s) { popIO.observe(s); pageIO.observe(s); });

  function goTo(i) {
    spreads[i].scrollIntoView({
      behavior: reduced.matches ? "auto" : "smooth",
      block: "start"
    });
  }

  if (curl) {
    curl.addEventListener("click", function () {
      goTo((current + 1) % spreads.length);
      if (!reduced.matches) {
        document.body.classList.remove("flipping");
        // eslint-disable-next-line no-unused-expressions
        curl.offsetWidth; /* restart the animation even on rapid re-clicks */
        document.body.classList.add("flipping");
        window.setTimeout(function () {
          document.body.classList.remove("flipping");
        }, 780);
      }
    });
  }
  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      goTo(parseInt(tab.dataset.go, 10));
    });
  });
  if (again) {
    again.addEventListener("click", function () { goTo(0); });
  }

  /* --- be a good citizen: freeze the paper theatre when unwatched --- */
  document.addEventListener("visibilitychange", function () {
    document.body.classList.toggle("paused", document.hidden);
  });
})();
