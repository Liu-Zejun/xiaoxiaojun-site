(function () {
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");
  const navLinks = document.querySelectorAll(".nav-link");
  const backToTop = document.getElementById("back-to-top");
  const year = document.getElementById("year");
  const datetime = document.getElementById("header-datetime");
  const progressBar = document.getElementById("progress-bar");
  const header = document.getElementById("site-header");
  const copyEmail = document.getElementById("copy-email");
  const toast = document.getElementById("toast");
  const wechatLink = document.getElementById("wechat-link");

  year.textContent = new Date().getFullYear();

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function updateDatetime() {
    const d = new Date();
    datetime.textContent =
      d.getFullYear() + "." + pad(d.getMonth() + 1) + "." + pad(d.getDate()) +
      " " + pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  }
  updateDatetime();
  setInterval(updateDatetime, 1000);

  function closeMenu() {
    mainNav.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  navToggle.addEventListener("click", function () {
    const isOpen = mainNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });

  let ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? scrolled / max : 0;
      progressBar.style.setProperty("--progress", String(ratio));
      progressBar.classList.toggle("has-progress", ratio > 0.001);
      header.classList.toggle("is-scrolled", scrolled > 10);
      backToTop.classList.toggle("is-visible", scrolled > 500);
      ticking = false;
    });
  });

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  copyEmail.addEventListener("click", function () {
    copyText("481116384@qq.com")
      .then(function () {
        showToast("邮箱已复制");
      })
      .catch(function () {});
  });

  if (wechatLink) {
    wechatLink.addEventListener("click", function () {
      copyText("19851706601")
        .then(function () {
          showToast("手机号已复制，打开微信粘贴搜索即可添加");
        })
        .catch(function () {});
    });
  }

  const revealItems = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach(function (item) {
    revealObserver.observe(item);
  });

  const counters = document.querySelectorAll("[data-count]");
  const counterObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterObserver.unobserve(el);
        const target = parseInt(el.getAttribute("data-count"), 10);
        const start = performance.now();
        const duration = 900;
        function step(now) {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(target * eased)).padStart(2, "0");
          if (p < 1) {
            window.requestAnimationFrame(step);
          }
        }
        window.requestAnimationFrame(step);
      });
    },
    { threshold: 0.6 }
  );

  counters.forEach(function (counter) {
    counterObserver.observe(counter);
  });

  const sections = document.querySelectorAll("main section[id]");
  const navObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const current = "#" + entry.target.id;
          navLinks.forEach(function (link) {
            const isActive = link.getAttribute("href") === current;
            link.classList.toggle("is-active", isActive);
          });
        }
      });
    },
    { rootMargin: "-40% 0px -55% 0px" }
  );

  sections.forEach(function (section) {
    navObserver.observe(section);
  });

  const mapEl = document.getElementById("china-map");
  if (mapEl && window.echarts && window.CHINA_MAP && window.TRAVEL_PHOTOS) {
    const SHORT_NAMES = {
      "北京市": "北京",
      "天津市": "天津",
      "河北省": "河北",
      "山西省": "山西",
      "内蒙古自治区": "内蒙古",
      "辽宁省": "辽宁",
      "吉林省": "吉林",
      "黑龙江省": "黑龙江",
      "上海市": "上海",
      "江苏省": "江苏",
      "浙江省": "浙江",
      "安徽省": "安徽",
      "福建省": "福建",
      "江西省": "江西",
      "山东省": "山东",
      "河南省": "河南",
      "湖北省": "湖北",
      "湖南省": "湖南",
      "广东省": "广东",
      "广西壮族自治区": "广西",
      "海南省": "海南",
      "重庆市": "重庆",
      "四川省": "四川",
      "贵州省": "贵州",
      "云南省": "云南",
      "西藏自治区": "西藏",
      "陕西省": "陕西",
      "甘肃省": "甘肃",
      "青海省": "青海",
      "宁夏回族自治区": "宁夏",
      "新疆维吾尔自治区": "新疆",
      "台湾省": "台湾",
      "香港特别行政区": "香港",
      "澳门特别行政区": "澳门"
    };

    echarts.registerMap("china", window.CHINA_MAP);
    const chart = echarts.init(mapEl);
    chart.setOption({
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(27, 30, 34, 0.95)",
        borderColor: "rgba(198, 164, 104, 0.5)",
        textStyle: { color: "#ece5d8" },
        formatter: function (params) {
          return params.name;
        }
      },
      series: [
        {
          type: "map",
          map: "china",
          roam: false,
          selectedMode: false,
          label: {
            show: true,
            color: "#d8cbb3",
            fontSize: 10,
            fontFamily: "Noto Serif SC, serif"
          },
          itemStyle: {
            areaColor: "#26343b",
            borderColor: "rgba(198, 164, 104, 0.7)",
            borderWidth: 0.8
          },
          emphasis: {
            label: { color: "#f0e6d2", fontSize: 12 },
            itemStyle: {
              areaColor: "#35535e",
              shadowBlur: 18,
              shadowColor: "rgba(192, 138, 107, 0.45)"
            }
          },
          data: Object.keys(SHORT_NAMES).map(function (official) {
            return {
              name: official,
              value: (window.TRAVEL_PHOTOS[SHORT_NAMES[official]] || []).length
            };
          })
        }
      ]
    });

    const travelPlace = document.getElementById("travel-place");
    const travelHint = document.getElementById("travel-hint");
    const travelGallery = document.getElementById("travel-gallery");

    function renderTravel(name) {
      const shortName = SHORT_NAMES[name] || name;
      const photos = window.TRAVEL_PHOTOS[shortName] || [];
      travelPlace.textContent = shortName;
      travelGallery.innerHTML = "";

      if (photos.length === 0) {
        travelHint.textContent = "这个省份还没有照片，放进来的照片会自动显示在这里。";
        const empty = document.createElement("p");
        empty.className = "travel-empty";
        empty.textContent = shortName + " · 暂无照片";
        travelGallery.appendChild(empty);
        return;
      }

      travelHint.textContent = "共 " + photos.length + " 张照片";
      photos.forEach(function (src) {
        const item = document.createElement("figure");
        item.className = "travel-photo";
        const img = document.createElement("img");
        img.src = src;
        img.alt = shortName + "的照片";
        img.loading = "lazy";
        item.appendChild(img);
        travelGallery.appendChild(item);
      });
    }

    chart.on("click", function (params) {
      if (params.name) {
        renderTravel(params.name);
      }
    });

    window.addEventListener("resize", function () {
      chart.resize();
    });
  }
})();
