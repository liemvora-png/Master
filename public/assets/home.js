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

  // Masthead furniture: the newest dated notice, real data from /api/news.
  var latest = document.querySelector("[data-latest-notice]");
  if (latest) {
    fetch("/api/news", { headers: { Accept: "application/json" } })
      .then(function (response) {
        if (!response.ok) throw new Error("News request returned " + response.status + ".");
        return response.json();
      })
      .then(function (data) {
        var items = Array.isArray(data.news) ? data.news : [];
        if (items.length === 0) return;
        var item = items[0];

        var folio = document.createElement("span");
        folio.className = "latest-folio";
        folio.textContent = "Latest notice";

        var stamp = item.published_at || "";
        if (stamp && !Number.isNaN(new Date(stamp).getTime())) {
          var when = document.createElement("time");
          when.dateTime = stamp;
          when.textContent = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(stamp));
          when.append(" \u00b7 ");
          folio.append(when);
        }

        var link = document.createElement("a");
        link.href = "/news";
        link.textContent = item.headline || "Untitled";
        link.append(" \u2197");

        latest.append(folio, " ", link);
        latest.hidden = false;
      })
      .catch(function () {
        /* the line simply stays hidden if news is unavailable */
      });
  }

  // Fold-out: named states "full programme" / "at a glance".
  var foldBtn = document.querySelector("[data-works-fold]");
  var worksList = document.getElementById("works-list");
  if (!foldBtn || !worksList) return;

  var glance = false;
  try {
    glance = localStorage.getItem("works-fold") === "glance";
  } catch (e) {}

  function applyFold() {
    worksList.dataset.fold = glance ? "glance" : "full";
    foldBtn.setAttribute("aria-expanded", String(!glance));
    foldBtn.textContent = glance ? "Full programme" : "At a glance";
    foldBtn.setAttribute("aria-label", glance ? "Expand programme entries" : "Collapse programme entries");
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
