(function () {
  var scene = document.getElementById("entry-scene");
  var year = document.getElementById("entry-year");

  if (year) {
    var currentYear = new Intl.DateTimeFormat("zh-CN", { year: "numeric" })
      .formatToParts(new Date())
      .find(function (part) { return part.type === "year"; });
    year.textContent = currentYear ? currentYear.value : String(new Date().getFullYear());
  }

  if (!scene) return;

  scene.addEventListener("keydown", function (event) {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      scene.click();
    }
  });
})();
