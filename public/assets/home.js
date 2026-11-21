(function () {
  // Programme unfolding: rows assemble on scroll; content stays visible without JS or under reduced motion.
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce && "IntersectionObserver" in window) {
    document.documentElement.classList.add("home-motion");
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("in-view");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.15 });

    document.querySelectorAll("[data-reveal]").forEach(function (el, i) {
      el.style.setProperty("--i", String(i % 5));
      io.observe(el);
    });

    var newsList = document.getElementById("home-news-list");
    if (newsList && "MutationObserver" in window) {
      new MutationObserver(function () {
        newsList.querySelectorAll(".home-news-item").forEach(function (row, idx) {
          if (row.hasAttribute("data-reveal")) return;
          row.setAttribute("data-reveal", "");
          row.style.setProperty("--i", String(idx % 5));
          io.observe(row);
        });
      }).observe(newsList, { childList: true });
    }
  }

  // Fold-out: named states "show details" / "hide details". site.js owns the
  // masthead notice line and the notices rows (one shared /api/news call).
  var foldBtn = document.querySelector("[data-works-fold]");
  var worksList = document.getElementById("works-list");
  if (!foldBtn || !worksList) return;

  // Details start folded: the control adds information, it never removes it.
  var glance = true;
  try {
    glance = localStorage.getItem("works-fold") !== "full";
  } catch (e) {}

  function applyFold() {
    worksList.dataset.fold = glance ? "glance" : "full";
    foldBtn.setAttribute("aria-expanded", String(!glance));
    foldBtn.textContent = glance ? "Full programme" : "At a glance";
  }

  foldBtn.addEventListener("click", function () {
    glance = !glance;
    try {
      localStorage.setItem("works-fold", glance ? "glance" : "full");
    } catch (e) {}
    applyFold();
  });

  applyFold();
})();
