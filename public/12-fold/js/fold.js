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

  /* --- diorama tilt: the open spread leans gently toward the cursor, as
     though you were tipping the whole pop-up book to peer into it. This
     is purely event-driven (no rAF loop runs while the mouse is still)
     and rAF-throttled while it does move; fine pointers only, and never
     under prefers-reduced-motion. --- */
  var fine = window.matchMedia("(pointer: fine)");
  if (fine.matches && !reduced.matches) {
    var root = document.documentElement;
    var nx = 0, ny = 0, queued = false;
    var MAX_X = 3.4, MAX_Y = 2.4; /* degrees */
    function applyTilt() {
      queued = false;
      root.style.setProperty("--tiltX", (nx * MAX_X).toFixed(2));
      root.style.setProperty("--tiltY", (ny * MAX_Y).toFixed(2));
    }
    window.addEventListener("pointermove", function (e) {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!queued) { queued = true; requestAnimationFrame(applyTilt); }
    }, { passive: true });
    document.addEventListener("pointerleave", function () {
      nx = 0; ny = 0;
      if (!queued) { queued = true; requestAnimationFrame(applyTilt); }
    });
  }
})();
