(function () {
  var scene = document.getElementById("entry-scene");
  var time = document.getElementById("entry-time");
  var year = document.getElementById("entry-year");
  var sceneImages = Array.prototype.slice.call(document.querySelectorAll(".entry-scene-image"));
  var archiveCards = Array.prototype.slice.call(document.querySelectorAll(".entry-archive-card"));
  var filmItems = Array.prototype.slice.call(document.querySelectorAll(".entry-film-item"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var activeIndex = 0;
  var pointerFrame = 0;
  var leaving = false;

  function setActiveFrame(index) {
    if (index === activeIndex || !sceneImages[index]) return;
    activeIndex = index;

    sceneImages.forEach(function (image, imageIndex) {
      image.classList.toggle("is-active", imageIndex === index);
    });
    archiveCards.forEach(function (card, cardIndex) {
      card.classList.toggle("is-active", cardIndex === index);
    });
    filmItems.forEach(function (item, itemIndex) {
      item.classList.toggle("is-active", itemIndex === index);
    });
  }

  function updateClock() {
    var now = new Date();
    var formatted = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now);

    if (time) {
      time.textContent = formatted;
      time.dateTime = now.toISOString();
    }

    if (year) {
      var currentYear = new Intl.DateTimeFormat("zh-CN", { year: "numeric" })
        .formatToParts(now)
        .find(function (part) { return part.type === "year"; });
      year.textContent = currentYear ? currentYear.value : String(now.getFullYear());
    }
  }

  function updatePointer(event) {
    if (!scene || reduceMotion.matches || event.pointerType === "touch") return;
    var x = Math.min(1, Math.max(0, event.clientX / window.innerWidth));
    var y = Math.min(1, Math.max(0, event.clientY / window.innerHeight));

    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = requestAnimationFrame(function () {
      scene.style.setProperty("--pointer-x", x.toFixed(3));
      scene.style.setProperty("--pointer-y", y.toFixed(3));
      setActiveFrame(Math.min(sceneImages.length - 1, Math.floor(x * sceneImages.length)));
    });
  }

  if (time) {
    updateClock();
    window.setInterval(updateClock, 1000);
  }

  if (!scene) return;

  scene.addEventListener("pointermove", updatePointer, { passive: true });

  scene.addEventListener("keydown", function (event) {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      scene.click();
    }
  });

  scene.addEventListener("click", function (event) {
    if (
      leaving ||
      reduceMotion.matches ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    leaving = true;
    scene.classList.add("is-leaving");
    scene.setAttribute("aria-busy", "true");
    window.setTimeout(function () {
      window.location.href = scene.href;
    }, 360);
  });
})();
