(function () {
  const siteStorage = window.__siteStorage || window.localStorage;
  const TH_KEY = "xxj_reflections_v1";
  const CM_KEY = "xxj_reflections_comments_v1";
  const LIKES_KEY = "xxj_reflections_likes_v1";
  const LIKED_KEY = "xxj_reflections_liked_v1";
  const UID_KEY = "xxj_reflections_uid";
  const OWNER_KEY = "xxj_reflections_owner";
  const SHARED_OWNER_KEY = "xxj_owner_activated";

  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");
  const backToTop = document.getElementById("back-to-top");
  const year = document.getElementById("year");
  const datetime = document.getElementById("header-datetime");
  const ownerKey = document.getElementById("owner-key");
  const toast = document.getElementById("toast");
  const thoughtBody = document.getElementById("thought-body");
  const snapsGrid = document.getElementById("snaps-grid");
  const notesList = document.getElementById("notes-list");
  const noteInput = document.getElementById("note-input");
  const noteSubmit = document.getElementById("note-submit");
  const uploadPhoto = document.getElementById("upload-photo");
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

  document.querySelectorAll(".nav-link").forEach(function (link) {
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
    renderAll();
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

  function loadThought() {
    return readJSON(TH_KEY, { text: "", photos: [] });
  }

  function loadComments() {
    return readJSON(CM_KEY, []);
  }

  function loadLikes() {
    return readJSON(LIKES_KEY, {});
  }

  function loadLiked() {
    return readJSON(LIKED_KEY, []);
  }

  function likeId(type, id) {
    return type + "|" + id;
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

  function canDelete(uid) {
    return uid === deviceUid() || isOwner();
  }

  function renderAll() {
    renderThought();
    renderSnaps();
    renderNotes();
  }

  function renderThought() {
    const data = loadThought();
    thoughtBody.innerHTML = "";
    if (isOwner()) {
      const editor = document.createElement("div");
      editor.className = "thought-editor";
      const ta = document.createElement("textarea");
      ta.id = "thought-input";
      ta.placeholder = "写下今天的心得…";
      ta.value = data.text || "";
      const save = document.createElement("button");
      save.type = "button";
      save.className = "save-thought";
      save.textContent = "保存心得";
      editor.appendChild(ta);
      editor.appendChild(save);
      thoughtBody.appendChild(editor);
    } else {
      const p = document.createElement("p");
      p.className = "thought-text" + (data.text ? "" : " is-empty");
      p.textContent = data.text || "还没有写下心得，晚点再来看看吧。";
      thoughtBody.appendChild(p);
    }
  }

  function renderSnaps() {
    const data = loadThought();
    snapsGrid.innerHTML = "";
    (data.photos || []).forEach(function (photo) {
      const figure = document.createElement("figure");
      figure.className = "snap-photo";
      figure.dataset.photoId = photo.id;
      figure.dataset.uid = photo.uid || "";
      const img = document.createElement("img");
      img.src = photo.dataUrl;
      img.alt = "随手拍";
      img.loading = "lazy";
      const meta = document.createElement("figcaption");
      meta.className = "snap-meta";
      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      const id = likeId("p", photo.id);
      likeBtn.className = "snap-like" + (loadLiked().indexOf(id) !== -1 ? " is-liked" : "");
      likeBtn.dataset.likeId = id;
      likeBtn.innerHTML = (loadLiked().indexOf(id) !== -1 ? "♥" : "♡") + " <span>" + (loadLikes()[id] || 0) + "</span>";
      meta.appendChild(likeBtn);
      figure.appendChild(img);
      figure.appendChild(meta);
      snapsGrid.appendChild(figure);
    });
  }

  function renderNotes() {
    notesList.innerHTML = "";
    const comments = loadComments();
    if (comments.length === 0) {
      const empty = document.createElement("p");
      empty.className = "note-empty";
      empty.textContent = "还没有留言，来留下第一句话吧。";
      empty.style.color = "var(--muted)";
      empty.style.fontSize = "0.9rem";
      notesList.appendChild(empty);
      return;
    }
    const topLevel = comments.filter(function (c) {
      return !c.parentId;
    });
    topLevel.forEach(function (comment) {
      notesList.appendChild(buildNote(comment));
    });
  }

  function buildNote(comment) {
    const wrap = document.createElement("div");
    wrap.className = "note-item" + (comment.parentId ? " reply" : "");
    wrap.dataset.commentId = comment.id;
    wrap.dataset.uid = comment.uid || "";

    const main = document.createElement("div");
    main.className = "note-main";

    const body = document.createElement("div");
    body.className = "note-body";
    const author = document.createElement("p");
    author.className = "note-author";
    author.innerHTML = escapeHtml(comment.name || "访客") +
      (comment.owner ? '<span class="admin-tag">管理员</span>' : "");
    const text = document.createElement("p");
    text.className = "note-text";
    text.textContent = comment.text;
    body.appendChild(author);
    body.appendChild(text);

    const actions = document.createElement("div");
    actions.className = "note-actions";
    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    const id = likeId("c", comment.id);
    likeBtn.className = "note-like" + (loadLiked().indexOf(id) !== -1 ? " is-liked" : "");
    likeBtn.dataset.likeId = id;
    likeBtn.innerHTML = (loadLiked().indexOf(id) !== -1 ? "♥" : "♡") + " <span>" + (loadLikes()[id] || 0) + "</span>";
    actions.appendChild(likeBtn);

    main.appendChild(body);
    main.appendChild(actions);
    wrap.appendChild(main);

    loadComments().filter(function (c) {
      return c.parentId === comment.id;
    }).forEach(function (reply) {
      wrap.appendChild(buildNote(reply));
    });

    if (replyFor === comment.id) {
      const form = document.createElement("div");
      form.className = "comment-form reply-form";
      const ta = document.createElement("textarea");
      ta.dataset.parent = comment.id;
      ta.placeholder = "回复这条留言…";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.parent = comment.id;
      btn.textContent = "回复";
      form.appendChild(ta);
      form.appendChild(btn);
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

  thoughtBody.addEventListener("click", function (event) {
    const save = event.target.closest(".save-thought");
    if (!save) return;
    const ta = document.getElementById("thought-input");
    if (!ta) return;
    const data = loadThought();
    data.text = ta.value;
    writeJSON(TH_KEY, data);
    showToast("心得已保存");
    renderAll();
  });

  uploadPhoto.addEventListener("click", function () {
    photoInput.value = "";
    photoInput.click();
  });

  photoInput.addEventListener("change", function () {
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
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
        const data = loadThought();
        data.photos = data.photos || [];
        data.photos.push({
          id: "p" + Date.now() + Math.random().toString(36).slice(2, 8),
          dataUrl: canvas.toDataURL("image/jpeg", 0.7),
          uid: deviceUid(),
          createdAt: Date.now()
        });
        if (!writeJSON(TH_KEY, data)) {
          showToast("存储空间不足，照片未能保存");
          return;
        }
        showToast("照片已放进去");
        renderAll();
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  snapsGrid.addEventListener("click", function (event) {
    const like = event.target.closest(".snap-like");
    if (like && like.dataset.likeId) {
      toggleLike(like.dataset.likeId);
      renderSnaps();
    }
  });

  function submitComment(textarea, parentId) {
    const text = textarea.value.trim();
    if (!text) return;
    const comments = loadComments();
    comments.push({
      id: "c" + Date.now() + Math.random().toString(36).slice(2, 8),
      parentId: parentId || null,
      text: text,
      uid: deviceUid(),
      name: isOwner() ? "小小俊" : "访客",
      owner: isOwner(),
      createdAt: Date.now()
    });
    writeJSON(CM_KEY, comments);
    replyFor = null;
    showToast("留言已发布");
    renderAll();
  }

  noteSubmit.addEventListener("click", function () {
    submitComment(noteInput, null);
    noteInput.value = "";
  });

  notesList.addEventListener("click", function (event) {
    const like = event.target.closest(".note-like");
    if (like && like.dataset.likeId) {
      toggleLike(like.dataset.likeId);
      renderNotes();
      return;
    }

    const submit = event.target.closest(".comment-form button");
    if (submit) {
      const form = submit.closest(".comment-form");
      const ta = form.querySelector("textarea");
      submitComment(ta, submit.dataset.parent || null);
      return;
    }

    const main = event.target.closest(".note-main");
    if (main && !event.target.closest(".comment-form")) {
      const id = main.closest(".note-item").dataset.commentId;
      replyFor = replyFor === id ? null : id;
      renderNotes();
    }
  });

  function showMenu(x, y) {
    photoMenu.style.left = Math.min(x, window.innerWidth - 130) + "px";
    photoMenu.style.top = Math.min(y, window.innerHeight - 60) + "px";
    photoMenu.classList.add("is-visible");
  }

  snapsGrid.addEventListener("contextmenu", function (event) {
    const target = event.target.closest(".snap-photo");
    if (!target) return;
    if (!canDelete(target.dataset.uid)) return;
    event.preventDefault();
    pendingDelete = { type: "photo", id: target.dataset.photoId };
    showMenu(event.clientX, event.clientY);
  });

  notesList.addEventListener("contextmenu", function (event) {
    const target = event.target.closest(".note-item");
    if (!target) return;
    if (!canDelete(target.dataset.uid)) return;
    event.preventDefault();
    pendingDelete = { type: "comment", id: target.dataset.commentId };
    showMenu(event.clientX, event.clientY);
  });

  let pendingDelete = null;

  document.addEventListener("click", function () {
    photoMenu.classList.remove("is-visible");
    pendingDelete = null;
  });

  photoMenu.querySelector(".photo-menu-delete").addEventListener("click", function () {
    if (!pendingDelete) return;
    if (pendingDelete.type === "photo") {
      const data = loadThought();
      data.photos = (data.photos || []).filter(function (p) {
        return p.id !== pendingDelete.id;
      });
      writeJSON(TH_KEY, data);
    } else {
      const comments = loadComments().filter(function (c) {
        return c.id !== pendingDelete.id && c.parentId !== pendingDelete.id;
      });
      writeJSON(CM_KEY, comments);
    }
    photoMenu.classList.remove("is-visible");
    pendingDelete = null;
    showToast("已删除");
    renderAll();
  });

  if (location.hash === "#xxj-owner") {
    siteStorage.setItem(SHARED_OWNER_KEY, "1");
    setOwnerMode(true);
  }

  document.body.classList.toggle("is-owner", isOwner());
  document.body.classList.toggle("is-owner-device", isOwnerDevice());
  ownerKey.classList.toggle("is-owner", isOwner());
  renderAll();
})();
