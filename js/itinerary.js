(function () {
  const siteStorage = window.__siteStorage || window.localStorage;
  const ITIN_KEY = "xxj_itinerary_v1";
  const CM_KEY = "xxj_itinerary_comments_v1";
  const LIKES_KEY = "xxj_itinerary_likes_v1";
  const LIKED_KEY = "xxj_itinerary_liked_v1";
  const UID_KEY = "xxj_itinerary_uid";
  const OWNER_KEY = "xxj_itinerary_owner";
  const SHARED_OWNER_KEY = "xxj_owner_activated";

  const SLOTS = [
    { id: "morning", label: "早上", time: "08:00 - 12:00" },
    { id: "noon", label: "中午", time: "12:00 - 18:00" },
    { id: "night", label: "晚上", time: "18:00 - 24:00" }
  ];
  const WEEK_CN = ["日", "一", "二", "三", "四", "五", "六"];
  const MONTH_EN = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];

  const calendarGrid = document.getElementById("calendar-grid");
  const calendarYearMonth = document.getElementById("cal-year-month");
  const calendarEn = document.getElementById("calendar-en");
  const calPicker = document.getElementById("cal-picker");
  const calYearGrid = document.getElementById("cal-year-grid");
  const calMonthGrid = document.getElementById("cal-month-grid");
  const calPickerClose = document.getElementById("cal-picker-close");
  const dayPanel = document.getElementById("day-panel");
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");
  const navLinks = document.querySelectorAll(".nav-link");
  const backToTop = document.getElementById("back-to-top");
  const year = document.getElementById("year");
  const datetime = document.getElementById("header-datetime");
  const ownerKey = document.getElementById("owner-key");
  const toast = document.getElementById("toast");
  const photoInput = document.getElementById("photo-input");
  const photoMenu = document.getElementById("photo-menu");

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

  window.addEventListener("scroll", function () {
    backToTop.classList.toggle("is-visible", window.scrollY > 500);
  });

  backToTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function readJSON(key, fallback) {
    try {
      const value = siteStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      siteStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {}
    return false;
  }

  function deviceUid() {
    let uid = siteStorage.getItem(UID_KEY);
    if (!uid) {
      uid = "u" + Date.now() + Math.random().toString(36).slice(2, 10);
      siteStorage.setItem(UID_KEY, uid);
    }
    return uid;
  }

  function isOwner() {
    return siteStorage.getItem(OWNER_KEY) === "1";
  }

  function isOwnerDevice() {
    return siteStorage.getItem(SHARED_OWNER_KEY) === "1" || siteStorage.getItem(OWNER_KEY) === "1";
  }

  function setOwnerMode(on) {
    if (on) {
      siteStorage.setItem(OWNER_KEY, "1");
    } else {
      siteStorage.removeItem(OWNER_KEY);
    }
    document.body.classList.toggle("is-owner", on);
    ownerKey.classList.toggle("is-owner", on);
    renderDay();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  ownerKey.addEventListener("click", function () {
    if (!isOwnerDevice()) {
      return;
    }
    const next = !isOwner();
    setOwnerMode(next);
    showToast(next ? "管理员模式已开启" : "已退出管理员模式");
  });

  const now = new Date();
  let viewYear = now.getFullYear();
  let viewMonth = now.getMonth();
  let selectedDate = toDateStr(now);
  let replyFor = null;
  let currentUploadSlot = null;
  let pendingDelete = null;

  function toDateStr(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function parseDateStr(str) {
    const parts = str.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function loadItin() {
    return readJSON(ITIN_KEY, {});
  }

  function loadComments() {
    return readJSON(CM_KEY, {});
  }

  function loadLikes() {
    return readJSON(LIKES_KEY, {});
  }

  function loadLiked() {
    return readJSON(LIKED_KEY, []);
  }

  function getSlotData(dateStr, slotId) {
    const itin = loadItin();
    return itin[dateStr] && itin[dateStr][slotId]
      ? itin[dateStr][slotId]
      : { text: "", photos: [] };
  }

  function renderCalendar() {
    calendarYearMonth.textContent = viewYear + " · " + pad(viewMonth + 1);
    calendarEn.textContent = MONTH_EN[viewMonth] + " · MAKE IT HAPPEN";
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const todayStr = toDateStr(new Date());

    calendarGrid.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const dayNum = i - firstDay + 1;
      const btn = document.createElement("button");
      btn.type = "button";
      if (dayNum < 1 || dayNum > daysInMonth) {
        btn.className = "cal-day is-empty";
        calendarGrid.appendChild(btn);
        continue;
      }
      const dateStr = viewYear + "-" + pad(viewMonth + 1) + "-" + pad(dayNum);
      btn.className = "cal-day";
      const num = document.createElement("span");
      num.className = "cal-day-num";
      num.textContent = String(dayNum);
      btn.appendChild(num);
      btn.dataset.date = dateStr;
      if (dateStr === todayStr) {
        btn.classList.add("is-today");
      }
      if (dateStr === selectedDate) {
        btn.classList.add("is-selected");
      }
      const marks = getDayMarks(viewYear, viewMonth + 1, dayNum);
      if (marks.length > 0) {
        const wrap = document.createElement("span");
        wrap.className = "day-marks";
        marks.slice(0, 2).forEach(function (mark) {
          const chip = document.createElement("span");
          chip.className = "day-mark " + mark.type;
          chip.textContent = mark.text;
          chip.style.setProperty("--rot", (Math.random() * 14 - 7).toFixed(1) + "deg");
          wrap.appendChild(chip);
        });
        btn.appendChild(wrap);
        if (marks.some(function (m) { return m.type === "holiday"; })) {
          btn.classList.add("has-holiday");
        }
      }
      calendarGrid.appendChild(btn);
    }
  }

  function getDayMarks(year, month, day) {
    const marks = [];
    if (!window.Solar || !window.HolidayUtil) {
      return marks;
    }
    try {
      const solar = Solar.fromYmd(year, month, day);
      const lunar = solar.getLunar();
      const holiday = HolidayUtil.getHoliday(year, month, day);
      if (holiday && holiday.getRest && holiday.getRest()) {
        marks.push({ text: holiday.getName(), type: "holiday" });
      }
      const jieqi = lunar.getJieQi();
      if (jieqi) {
        marks.push({ text: jieqi, type: "term" });
      }
      [lunar.getFestivals(), solar.getFestivals(), lunar.getOtherFestivals()].forEach(function (list) {
        (list || []).forEach(function (name) {
          if (name && !marks.some(function (m) { return m.text === name; })) {
            marks.push({ text: name, type: "festival" });
          }
        });
      });
    } catch (e) {}
    return marks;
  }

  calendarGrid.addEventListener("click", function (event) {
    const day = event.target.closest(".cal-day[data-date]");
    if (!day) return;
    selectedDate = day.dataset.date;
    replyFor = null;
    renderCalendar();
    renderDay();
  });

  document.getElementById("cal-prev").addEventListener("click", function () {
    viewMonth -= 1;
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    renderCalendar();
  });

  document.getElementById("cal-next").addEventListener("click", function () {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    renderCalendar();
  });

  function openPicker() {
    renderYearGrid();
    renderMonthGrid();
    calPicker.hidden = false;
  }

  function closePicker() {
    calPicker.hidden = true;
  }

  function renderYearGrid() {
    calYearGrid.innerHTML = "";
    const start = viewYear - 8;
    for (let i = 0; i < 17; i++) {
      const y = start + i;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = String(y);
      btn.dataset.year = String(y);
      if (y === viewYear) {
        btn.classList.add("is-current");
      }
      calYearGrid.appendChild(btn);
    }
  }

  function renderMonthGrid() {
    calMonthGrid.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = pad(i + 1) + "月";
      btn.dataset.month = String(i);
      if (i === viewMonth) {
        btn.classList.add("is-current");
      }
      calMonthGrid.appendChild(btn);
    }
  }

  calendarYearMonth.addEventListener("click", function () {
    openPicker();
  });

  calPickerClose.addEventListener("click", closePicker);

  calPicker.addEventListener("click", function (event) {
    if (event.target === calPicker) {
      closePicker();
    }
  });

  calYearGrid.addEventListener("click", function (event) {
    const btn = event.target.closest("button[data-year]");
    if (!btn) return;
    viewYear = parseInt(btn.dataset.year, 10);
    renderYearGrid();
    renderMonthGrid();
    renderCalendar();
  });

  calMonthGrid.addEventListener("click", function (event) {
    const btn = event.target.closest("button[data-month]");
    if (!btn) return;
    viewMonth = parseInt(btn.dataset.month, 10);
    closePicker();
    renderCalendar();
  });

  function commentLikeId(dateStr, slotId, commentId) {
    return "c|" + dateStr + "|" + slotId + "|" + commentId;
  }

  function photoLikeId(dateStr, slotId, photoId) {
    return "p|" + dateStr + "|" + slotId + "|" + photoId;
  }

  function toggleLike(id) {
    const likes = loadLikes();
    const liked = loadLiked();
    const idx = liked.indexOf(id);
    if (idx !== -1) {
      liked.splice(idx, 1);
      likes[id] = Math.max(0, (likes[id] || 0) - 1);
    } else {
      liked.push(id);
      likes[id] = (likes[id] || 0) + 1;
    }
    writeJSON(LIKES_KEY, likes);
    writeJSON(LIKED_KEY, liked);
  }

  function canDelete(item) {
    return item.uid === deviceUid() || isOwner();
  }

  function renderDay() {
    if (!selectedDate) return;
    const d = parseDateStr(selectedDate);
    const owner = isOwner();
    dayPanel.innerHTML = "";

    const head = document.createElement("div");
    head.className = "day-head";
    head.innerHTML =
      '<h2 class="display">' + (d.getMonth() + 1) + "月" + d.getDate() + "日</h2>" +
      '<p>星期' + WEEK_CN[d.getDay()] + " · " + MONTH_EN[d.getMonth()] + " · DAY PLAN</p>";
    dayPanel.appendChild(head);

    SLOTS.forEach(function (slot) {
      const card = document.createElement("article");
      card.className = "slot-card";
      card.dataset.slot = slot.id;

      const slotData = getSlotData(selectedDate, slot.id);

      const slotHead = document.createElement("div");
      slotHead.className = "slot-head";
      slotHead.innerHTML =
        '<div class="slot-title"><h3>' + slot.label + "</h3>" +
        '<span class="slot-time">' + slot.time + "</span></div>";
      card.appendChild(slotHead);

      const body = document.createElement("div");
      body.className = "slot-body";

      if (owner) {
        const editor = document.createElement("div");
        editor.className = "slot-editor";
        const ta = document.createElement("textarea");
        ta.dataset.slot = slot.id;
        ta.placeholder = "写下这个时段的安排…";
        ta.value = slotData.text || "";
        const save = document.createElement("button");
        save.type = "button";
        save.className = "save-slot";
        save.dataset.slot = slot.id;
        save.textContent = "保存行程";
        editor.appendChild(ta);
        editor.appendChild(save);
        body.appendChild(editor);
      } else {
        const p = document.createElement("p");
        p.className = "slot-text" + (slotData.text ? "" : " is-empty-text");
        p.textContent = slotData.text || "这一天暂时还没有安排，晚点再来看看吧。";
        body.appendChild(p);
      }

      const photos = slotData.photos || [];
      if (photos.length > 0) {
        const grid = document.createElement("div");
        grid.className = "slot-photos";
        photos.forEach(function (photo) {
          const figure = document.createElement("figure");
          figure.className = "slot-photo";
          figure.dataset.photoId = photo.id;
          figure.dataset.uid = photo.uid || "";
          const img = document.createElement("img");
          img.src = photo.dataUrl;
          img.alt = slot.label + "照片";
          img.loading = "lazy";
          const meta = document.createElement("figcaption");
          meta.className = "slot-photo-meta";
          const likeBtn = document.createElement("button");
          likeBtn.type = "button";
          const likeId = photoLikeId(selectedDate, slot.id, photo.id);
          likeBtn.className = "slot-like" + (loadLiked().indexOf(likeId) !== -1 ? " is-liked" : "");
          likeBtn.dataset.likeId = likeId;
          likeBtn.innerHTML = (loadLiked().indexOf(likeId) !== -1 ? "♥" : "♡") + " <span>" + (loadLikes()[likeId] || 0) + "</span>";
          meta.appendChild(likeBtn);
          figure.appendChild(img);
          figure.appendChild(meta);
          grid.appendChild(figure);
        });
        body.appendChild(grid);
      }

      const upload = document.createElement("button");
      upload.type = "button";
      upload.className = "upload-photo";
      upload.dataset.slot = slot.id;
      upload.textContent = "+ 放一张照片";
      body.appendChild(upload);

      const comments = loadComments();
      const slotComments = (comments[selectedDate] && comments[selectedDate][slot.id]) || [];
      if (slotComments.length > 0) {
        const commentsBox = document.createElement("div");
        commentsBox.className = "comments";
        const title = document.createElement("p");
        title.className = "comments-title";
        title.textContent = "行程留言 · " + slotComments.length + " 条";
        commentsBox.appendChild(title);

        const topLevel = slotComments.filter(function (c) {
          return !c.parentId;
        });
        topLevel.forEach(function (comment) {
          commentsBox.appendChild(buildComment(comment, slot.id, comments, 0));
        });
        body.appendChild(commentsBox);
      }

      const form = document.createElement("div");
      form.className = "comment-form";
      const ta = document.createElement("textarea");
      ta.dataset.slot = slot.id;
      ta.placeholder = "说点什么…";
      const submit = document.createElement("button");
      submit.type = "button";
      submit.dataset.slot = slot.id;
      submit.textContent = "发言";
      form.appendChild(ta);
      form.appendChild(submit);
      body.appendChild(form);

      card.appendChild(body);
      dayPanel.appendChild(card);
    });
  }

  function buildComment(comment, slotId, comments, depth) {
    const wrap = document.createElement("div");
    wrap.className = "comment" + (comment.parentId ? " reply" : "");
    wrap.dataset.commentId = comment.id;
    wrap.dataset.uid = comment.uid || "";

    const main = document.createElement("div");
    main.className = "comment-main";

    const body = document.createElement("div");
    body.className = "comment-body";
    const author = document.createElement("p");
    author.className = "comment-author";
    author.innerHTML = escapeHtml(comment.name || "访客") +
      (comment.owner ? '<span class="admin-tag">管理员</span>' : "");
    const text = document.createElement("p");
    text.className = "comment-text";
    text.textContent = comment.text;
    body.appendChild(author);
    body.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "comment-actions";
    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    const likeId = commentLikeId(selectedDate, slotId, comment.id);
    likeBtn.className = "comment-like" + (loadLiked().indexOf(likeId) !== -1 ? " is-liked" : "");
    likeBtn.dataset.likeId = likeId;
    likeBtn.innerHTML = (loadLiked().indexOf(likeId) !== -1 ? "♥" : "♡") + " <span>" + (loadLikes()[likeId] || 0) + "</span>";
    actions.appendChild(likeBtn);

    main.appendChild(body);
    main.appendChild(actions);
    wrap.appendChild(main);

    const replies = comments[selectedDate][slotId].filter(function (c) {
      return c.parentId === comment.id;
    });
    replies.forEach(function (reply) {
      wrap.appendChild(buildComment(reply, slotId, comments, depth + 1));
    });

    if (replyFor && replyFor.date === selectedDate && replyFor.slot === slotId && replyFor.id === comment.id) {
      const form = document.createElement("div");
      form.className = "comment-form reply-form";
      const ta = document.createElement("textarea");
      ta.dataset.slot = slotId;
      ta.dataset.parent = comment.id;
      ta.placeholder = "回复这条留言…";
      const submit = document.createElement("button");
      submit.type = "button";
      submit.dataset.slot = slotId;
      submit.dataset.parent = comment.id;
      submit.textContent = "回复";
      form.appendChild(ta);
      form.appendChild(submit);
      wrap.appendChild(form);
    }

    return wrap;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  dayPanel.addEventListener("click", function (event) {
    const save = event.target.closest(".save-slot");
    if (save) {
      const slotId = save.dataset.slot;
      const ta = dayPanel.querySelector('.slot-editor textarea[data-slot="' + slotId + '"]');
      if (!ta) return;
      const itin = loadItin();
      itin[selectedDate] = itin[selectedDate] || {};
      itin[selectedDate][slotId] = itin[selectedDate][slotId] || { photos: [] };
      itin[selectedDate][slotId].text = ta.value;
      writeJSON(ITIN_KEY, itin);
      showToast("行程已保存");
      renderDay();
      return;
    }

    const upload = event.target.closest(".upload-photo");
    if (upload) {
      currentUploadSlot = upload.dataset.slot;
      photoInput.value = "";
      photoInput.click();
      return;
    }

    const like = event.target.closest(".slot-like, .comment-like");
    if (like && like.dataset.likeId) {
      toggleLike(like.dataset.likeId);
      renderDay();
      return;
    }

    const submit = event.target.closest(".comment-form button");
    if (submit) {
      const slotId = submit.dataset.slot;
      const parentId = submit.dataset.parent || null;
      const form = submit.closest(".comment-form");
      const ta = form.querySelector("textarea");
      const text = ta.value.trim();
      if (!text) return;
      const comments = loadComments();
      comments[selectedDate] = comments[selectedDate] || {};
      comments[selectedDate][slotId] = comments[selectedDate][slotId] || [];
      comments[selectedDate][slotId].push({
        id: "c" + Date.now() + Math.random().toString(36).slice(2, 8),
        parentId: parentId,
        text: text,
        uid: deviceUid(),
        name: isOwner() ? "小小俊" : "访客",
        owner: isOwner(),
        createdAt: Date.now()
      });
      writeJSON(CM_KEY, comments);
      replyFor = null;
      showToast("留言已发布");
      renderDay();
      return;
    }

    const comment = event.target.closest(".comment-main");
    if (comment && !event.target.closest(".comment-form")) {
      const wrap = comment.closest(".comment");
      const id = wrap.dataset.commentId;
      const slotId = wrap.closest(".slot-card").dataset.slot;
      if (replyFor && replyFor.id === id) {
        replyFor = null;
      } else {
        replyFor = { date: selectedDate, slot: slotId, id: id };
      }
      renderDay();
    }
  });

  photoInput.addEventListener("change", function () {
    const file = photoInput.files && photoInput.files[0];
    if (!file || !currentUploadSlot) return;
    if (!file.type || !file.type.startsWith("image/")) {
      showToast("这个文件不是照片（视频无法上传），请选择 JPG/PNG 图片");
      photoInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = function (event) {
      const image = new Image();
      image.onerror = function () {
        showToast("这张照片太大或格式不支持，请使用压缩版重试");
        currentUploadSlot = null;
        photoInput.value = "";
      };
      image.onload = function () {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

        const itin = loadItin();
        itin[selectedDate] = itin[selectedDate] || {};
        itin[selectedDate][currentUploadSlot] = itin[selectedDate][currentUploadSlot] || { photos: [] };
        itin[selectedDate][currentUploadSlot].photos.push({
          id: "p" + Date.now() + Math.random().toString(36).slice(2, 8),
          dataUrl: dataUrl,
          uid: deviceUid(),
          createdAt: Date.now()
        });
        if (!writeJSON(ITIN_KEY, itin)) {
          showToast("存储空间不足，照片未能保存");
          return;
        }
        currentUploadSlot = null;
        showToast("照片已放进去");
        renderDay();
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  function showPhotoMenu(x, y) {
    photoMenu.style.left = Math.min(x, window.innerWidth - 130) + "px";
    photoMenu.style.top = Math.min(y, window.innerHeight - 60) + "px";
    photoMenu.classList.add("is-visible");
  }

  dayPanel.addEventListener("contextmenu", function (event) {
    const photo = event.target.closest(".slot-photo");
    const comment = event.target.closest(".comment");
    if (photo) {
      const uid = photo.dataset.uid;
      if (uid !== deviceUid() && !isOwner()) return;
      event.preventDefault();
      pendingDelete = { type: "photo", date: selectedDate, slot: photo.closest(".slot-card").dataset.slot, id: photo.dataset.photoId };
      showPhotoMenu(event.clientX, event.clientY);
      return;
    }
    if (comment) {
      const uid = comment.dataset.uid;
      if (uid !== deviceUid() && !isOwner()) return;
      event.preventDefault();
      pendingDelete = { type: "comment", date: selectedDate, slot: comment.closest(".slot-card").dataset.slot, id: comment.dataset.commentId };
      showPhotoMenu(event.clientX, event.clientY);
    }
  });

  document.addEventListener("click", function () {
    photoMenu.classList.remove("is-visible");
    pendingDelete = null;
  });

  photoMenu.querySelector(".photo-menu-delete").addEventListener("click", function () {
    if (!pendingDelete) return;
    if (pendingDelete.type === "photo") {
      const itin = loadItin();
      const slot = itin[pendingDelete.date] && itin[pendingDelete.date][pendingDelete.slot];
      if (slot) {
        slot.photos = (slot.photos || []).filter(function (p) {
          return p.id !== pendingDelete.id;
        });
        writeJSON(ITIN_KEY, itin);
      }
    } else {
      const comments = loadComments();
      const list = comments[pendingDelete.date] && comments[pendingDelete.date][pendingDelete.slot];
      if (list) {
        comments[pendingDelete.date][pendingDelete.slot] = list.filter(function (c) {
          return c.id !== pendingDelete.id && c.parentId !== pendingDelete.id;
        });
        writeJSON(CM_KEY, comments);
      }
    }
    photoMenu.classList.remove("is-visible");
    pendingDelete = null;
    showToast("已删除");
    renderDay();
  });

  if (location.hash === "#xxj-owner") {
    siteStorage.setItem(SHARED_OWNER_KEY, "1");
    setOwnerMode(true);
  }

  document.body.classList.toggle("is-owner", isOwner());
  document.body.classList.toggle("is-owner-device", isOwnerDevice());
  ownerKey.classList.toggle("is-owner", isOwner());
  renderCalendar();
  renderDay();
})();
