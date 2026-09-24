(function () {
  const siteStorage = window.__siteStorage || window.localStorage;
  const navToggle = document.getElementById("nav-toggle");
  const mainNav = document.getElementById("main-nav");
  const navLinks = document.querySelectorAll(".nav-link");
  const backToTop = document.getElementById("back-to-top");
  const year = document.getElementById("year");
  const datetime = document.getElementById("header-datetime");
  const mapEl = document.getElementById("china-map");

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

  const PHOTOS_KEY = "xxj_album_photos_v1";
  const LIKES_KEY = "xxj_album_likes_v1";
  const LIKED_KEY = "xxj_album_liked_v1";
  const PHOTO_CM_KEY = "xxj_album_photo_comments_v1";
  const ALBUM_OWNER_KEY = "xxj_album_owner";
  const SHARED_OWNER_KEY = "xxj_owner_activated";
  const UID_KEY = "xxj_album_uid";
  const HIDDEN_OWNER_KEY = "xxj_album_hidden_owner_v1";
  const MINE_KEY = "xxj_album_mine_v1";
  const OWNER_LOC_KEY = "xxj_album_owner_locations_v1";

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
    } catch (e) {
      // 浏览器空间不足时，照片暂时只显示在本次打开中
    }
    return false;
  }

  function loadCommunity() {
    return readJSON(PHOTOS_KEY, {});
  }

  function loadLikes() {
    return readJSON(LIKES_KEY, {});
  }

  function loadLiked() {
    return readJSON(LIKED_KEY, []);
  }

  function deviceUid() {
    let uid = siteStorage.getItem(UID_KEY);
    if (!uid) {
      uid = "u" + Date.now() + Math.random().toString(36).slice(2, 10);
      siteStorage.setItem(UID_KEY, uid);
    }
    return uid;
  }

  function isAlbumOwner() {
    return siteStorage.getItem(ALBUM_OWNER_KEY) === "1";
  }

  function isOwnerDevice() {
    return siteStorage.getItem(SHARED_OWNER_KEY) === "1" || siteStorage.getItem(ALBUM_OWNER_KEY) === "1";
  }

  function loadPhotoComments() {
    return readJSON(PHOTO_CM_KEY, {});
  }

  const DB_NAME = "xxj_site";
  const DB_STORE = "albumPhotos";

  function openDB() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  async function dbPut(id, dataUrl) {
    try { siteStorage.setItem("__album_photo__" + id, dataUrl); } catch (e) {}
    const db = await openDB();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put({ id: id, dataUrl: dataUrl });
      tx.oncomplete = function () {
        resolve(true);
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  }

  async function dbGet(id) {
    try { const cached = siteStorage.getItem("__album_photo__" + id); if (cached) return cached; } catch (e) {}
    const db = await openDB();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = function () {
        resolve(req.result ? req.result.dataUrl : "");
      };
      req.onerror = function () {
        reject(req.error);
      };
    });
  }

  async function dbDelete(id) {
    try { siteStorage.removeItem("__album_photo__" + id); } catch (e) {}
    const db = await openDB();
    return new Promise(function (resolve, reject) {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = function () {
        resolve(true);
      };
      tx.onerror = function () {
        reject(tx.error);
      };
    });
  }

  function toggleLike(id) {
    const liked = loadLiked();
    const likes = loadLikes();
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

  function ownerId(shortName, category, index) {
    return "owner|" + shortName + "|" + category + "|" + index;
  }

  function communityId(shortName, category, id) {
    return "community|" + shortName + "|" + category + "|" + id;
  }

  const travelPlace = document.getElementById("travel-place");
  const travelHint = document.getElementById("travel-hint");
  const travelGallery = document.getElementById("travel-gallery");
  const uploadBtn = document.getElementById("upload-btn");
  const uploadInput = document.getElementById("upload-input");
  const travelTabs = document.getElementById("travel-tabs");
  let currentProvince = null;
  let currentCategory = "风景";
  let photoReplyFor = null;

  function getOwnerList(shortName, category) {
    const raw = window.TRAVEL_PHOTOS[shortName];
    if (Array.isArray(raw)) {
      return category === "风景" ? raw : [];
    }
    if (raw && typeof raw === "object") {
      return raw[category] || [];
    }
    return [];
  }

  async function getCommunityList(shortName, category) {
    const raw = loadCommunity()[shortName];
    const list = Array.isArray(raw)
      ? (category === "风景" ? raw : [])
      : (raw && typeof raw === "object" ? raw[category] || [] : []);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      const photo = list[i];
      const fullId = communityId(shortName, category, photo.id);
      const dataUrl = photo.dataUrl || (await dbGet(fullId));
      if (dataUrl) {
        out.push({
          id: fullId,
          dataUrl: dataUrl,
          uid: photo.uid || "",
          createdAt: photo.createdAt || 0,
          location: photo.location || ""
        });
      }
    }
    return out;
  }

  async function getAllPhotos(shortName, category) {
    const likes = loadLikes();
    const ownerLocations = readJSON(OWNER_LOC_KEY, {});
    const mine = readJSON(MINE_KEY, []);
    const hiddenOwner = readJSON(HIDDEN_OWNER_KEY, []);
    const ownerPhotos = getOwnerList(shortName, category)
      .map(function (src, index) {
        const id = ownerId(shortName, category, index);
        return {
          id: id,
          src: src,
          owner: true,
          location: ownerLocations[id] || "",
          editable: true,
          likes: likes[id] || 0,
          liked: loadLiked().indexOf(id) !== -1
        };
      })
      .filter(function (photo) {
        return hiddenOwner.indexOf(photo.id) === -1;
      });

    const communityPhotos = (await getCommunityList(shortName, category)).map(function (photo) {
      const id = photo.id;
      return {
        id: id,
        src: photo.dataUrl,
        owner: false,
        pinned: isAlbumOwner() && photo.uid === deviceUid(),
        location: photo.location || "",
        editable: true,
        likes: likes[id] || 0,
        liked: loadLiked().indexOf(id) !== -1,
        createdAt: photo.createdAt || 0
      };
    });

    communityPhotos.sort(function (a, b) {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      if (b.likes !== a.likes) {
        return b.likes - a.likes;
      }
      return b.createdAt - a.createdAt;
    });

    return ownerPhotos.concat(communityPhotos);
  }

  async function renderGallery() {
    travelGallery.innerHTML = "";
    const photos = await getAllPhotos(currentProvince, currentCategory);

    if (photos.length === 0) {
      travelHint.textContent = currentCategory + "这里还没有照片，你可以上传第一张。";
      const empty = document.createElement("p");
      empty.className = "travel-empty";
      empty.textContent = currentProvince + " · " + currentCategory + " · 暂无照片";
      travelGallery.appendChild(empty);
      return;
    }

    travelHint.textContent = currentCategory + " · 共 " + photos.length + " 张照片 · 我的照片置顶";
    photos.forEach(function (photo) {
      const item = document.createElement("figure");
      item.className = "travel-photo";
      item.dataset.photoId = photo.id;
      item.dataset.owner = photo.owner ? "1" : "0";
      item.dataset.editable = photo.editable ? "1" : "0";

      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = currentProvince + "的照片";
      img.loading = "lazy";
      item.appendChild(img);

      const meta = document.createElement("figcaption");
      meta.className = "photo-meta";

      const left = document.createElement("span");
      left.className = "photo-meta-left";

      if (photo.owner || photo.pinned) {
        const badge = document.createElement("span");
        badge.className = "owner-badge";
        badge.textContent = "置顶";
        left.appendChild(badge);
      }

      const locBtn = document.createElement("button");
      locBtn.type = "button";
      locBtn.className = "photo-loc-btn";
      locBtn.dataset.photoId = photo.id;
      locBtn.textContent = photo.location || (photo.editable ? "选择地点" : "未选择地点");
      locBtn.disabled = !photo.editable;
      locBtn.title = photo.editable ? "选择照片地点" : "仅发布者可修改";
      left.appendChild(locBtn);

      const likeBtn = document.createElement("button");
      likeBtn.type = "button";
      likeBtn.className = "like-btn" + (photo.liked ? " is-liked" : "");
      likeBtn.dataset.photoId = photo.id;
      likeBtn.innerHTML = (photo.liked ? "♥" : "♡") + ' <span>' + photo.likes + "</span>";

      meta.appendChild(left);
      meta.appendChild(likeBtn);
      item.appendChild(meta);
      item.appendChild(buildPhotoComments(photo.id));
      travelGallery.appendChild(item);
    });
  }

  function renderTravel(name) {
    currentProvince = SHORT_NAMES[name] || name;
    travelPlace.textContent = currentProvince;
    uploadBtn.disabled = false;
    renderGallery();
  }

  function buildPhotoComments(photoKey) {
    const box = document.createElement("div");
    box.className = "photo-comments";
    const list = loadPhotoComments()[photoKey] || [];
    const title = document.createElement("p");
    title.className = "photo-comments-title";
    title.textContent = "备注 " + list.length;
    box.appendChild(title);
    list.filter(function (c) {
      return !c.parentId;
    }).forEach(function (c) {
      box.appendChild(buildCommentItem(c, photoKey));
    });
    const form = document.createElement("div");
    form.className = "photo-comment-form";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "写个备注…";
    input.dataset.photoId = photoKey;
    const send = document.createElement("button");
    send.type = "button";
    send.className = "photo-comment-send";
    send.dataset.photoId = photoKey;
    send.textContent = "发送";
    form.appendChild(input);
    form.appendChild(send);
    box.appendChild(form);
    return box;
  }

  function buildCommentItem(comment, photoKey) {
    const list = loadPhotoComments()[photoKey] || [];
    const row = document.createElement("div");
    row.className = "photo-comment" + (comment.parentId ? " reply" : "");
    row.dataset.commentId = comment.id;
    row.dataset.uid = comment.uid || "";
    const head = document.createElement("div");
    head.className = "photo-comment-head";
    const author = document.createElement("span");
    author.className = "photo-comment-author";
    author.textContent = (comment.name || "访客") + (comment.owner ? " · 管理员" : "");
    const likeBtn = document.createElement("button");
    likeBtn.type = "button";
    const likeId = "pc|" + photoKey + "|" + comment.id;
    likeBtn.className = "photo-comment-like" + (loadLiked().indexOf(likeId) !== -1 ? " is-liked" : "");
    likeBtn.dataset.likeId = likeId;
    likeBtn.innerHTML = (loadLiked().indexOf(likeId) !== -1 ? "♥" : "♡") + " <span>" + (loadLikes()[likeId] || 0) + "</span>";
    head.appendChild(author);
    head.appendChild(likeBtn);
    const text = document.createElement("p");
    text.className = "photo-comment-text";
    text.textContent = comment.text;
    row.appendChild(head);
    row.appendChild(text);
    list.filter(function (c) {
      return c.parentId === comment.id;
    }).forEach(function (reply) {
      row.appendChild(buildCommentItem(reply, photoKey));
    });
    if (photoReplyFor === comment.id) {
      const form = document.createElement("div");
      form.className = "photo-comment-form reply-form";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = "回复这条备注…";
      input.dataset.photoId = photoKey;
      input.dataset.parent = comment.id;
      const send = document.createElement("button");
      send.type = "button";
      send.className = "photo-comment-send";
      send.dataset.photoId = photoKey;
      send.textContent = "回复";
      form.appendChild(input);
      form.appendChild(send);
      row.appendChild(form);
    }
    return row;
  }

  travelTabs.addEventListener("click", function (event) {
    const tab = event.target.closest(".travel-tab");
    if (!tab || !currentProvince) {
      return;
    }
    currentCategory = tab.dataset.category;
    travelTabs.querySelectorAll(".travel-tab").forEach(function (t) {
      t.classList.toggle("is-active", t === tab);
    });
    renderGallery();
  });

  const albumOwnerKey = document.getElementById("album-owner-key");
  if (albumOwnerKey) {
    albumOwnerKey.addEventListener("click", function () {
      if (!isOwnerDevice()) {
        return;
      }
      const on = isAlbumOwner();
      if (on) {
        siteStorage.removeItem(ALBUM_OWNER_KEY);
      } else {
        siteStorage.setItem(ALBUM_OWNER_KEY, "1");
      }
      albumOwnerKey.classList.toggle("is-owner", !on);
      document.body.classList.toggle("is-owner", !on);
      travelHint.textContent = on ? "已退出管理员模式" : "管理员模式已开启";
      renderGallery();
    });
  }
  if (location.hash === "#xxj-owner") {
    siteStorage.setItem(SHARED_OWNER_KEY, "1");
    siteStorage.setItem(ALBUM_OWNER_KEY, "1");
  }
  if (albumOwnerKey) {
    albumOwnerKey.classList.toggle("is-owner", isAlbumOwner());
  }
  document.body.classList.toggle("is-owner", isAlbumOwner());
  document.body.classList.toggle("is-owner-device", isOwnerDevice());

  const clearAlbum = document.getElementById("clear-album");
  if (clearAlbum) {
    clearAlbum.addEventListener("click", function () {
      if (!window.confirm("确定清空本机相册里的所有上传照片和评论吗？")) {
        return;
      }
      [
        "xxj_album_photos_v1",
        "xxj_album_photo_comments_v1",
        "xxj_album_likes_v1",
        "xxj_album_liked_v1",
        "xxj_album_mine_v1",
        "xxj_album_owner_locations_v1",
        "xxj_album_uid",
        "xxj_album_owner"
      ].forEach(function (key) {
        siteStorage.removeItem(key);
      });
      window.location.reload();
    });
  }

  travelGallery.addEventListener("click", function (event) {
    const send = event.target.closest(".photo-comment-send");
    if (send) {
      const form = send.closest(".photo-comment-form");
      const input = form.querySelector("input");
      const text = input.value.trim();
      if (!text) return;
      const parentId = input.dataset.parent || null;
      const comments = loadPhotoComments();
      comments[send.dataset.photoId] = comments[send.dataset.photoId] || [];
      comments[send.dataset.photoId].push({
        id: "c" + Date.now() + Math.random().toString(36).slice(2, 8),
        parentId: parentId,
        text: text,
        uid: deviceUid(),
        name: isAlbumOwner() ? "小小俊" : "访客",
        owner: isAlbumOwner(),
        createdAt: Date.now()
      });
      writeJSON(PHOTO_CM_KEY, comments);
      photoReplyFor = null;
      renderGallery();
      return;
    }

    const cLike = event.target.closest(".photo-comment-like");
    if (cLike && cLike.dataset.likeId) {
      toggleLike(cLike.dataset.likeId);
      renderGallery();
      return;
    }

    const cRow = event.target.closest(".photo-comment");
    const cTrigger = event.target.closest(".photo-comment-head, .photo-comment-text");
    if (cTrigger && cRow && !event.target.closest("button")) {
      const id = cRow.dataset.commentId;
      photoReplyFor = photoReplyFor === id ? null : id;
      renderGallery();
      return;
    }

    const imgEl = event.target.closest(".travel-photo > img");
    if (imgEl && lightbox && lightboxImg) {
      lightboxImg.src = imgEl.src;
      lightbox.hidden = false;
      return;
    }

    const likeBtn = event.target.closest(".like-btn");
    if (!likeBtn || !currentProvince) {
      return;
    }

    const id = likeBtn.dataset.photoId;
    const liked = loadLiked();
    const likes = loadLikes();
    const alreadyLiked = liked.indexOf(id) !== -1;
    if (alreadyLiked) {
      liked.splice(liked.indexOf(id), 1);
      likes[id] = Math.max(0, (likes[id] || 0) - 1);
    } else {
      liked.push(id);
      likes[id] = (likes[id] || 0) + 1;
    }
    writeJSON(LIKES_KEY, likes);
    writeJSON(LIKED_KEY, liked);
    renderGallery();
  });

  const photoMenu = document.createElement("div");
  photoMenu.className = "photo-menu";
  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "photo-menu-delete";
  deleteBtn.textContent = "删除";
  photoMenu.appendChild(deleteBtn);
  document.body.appendChild(photoMenu);

  const lightbox = document.createElement("div");
  lightbox.className = "photo-lightbox";
  lightbox.id = "photo-lightbox";
  lightbox.hidden = true;
  const lightboxImg = document.createElement("img");
  lightboxImg.id = "photo-lightbox-img";
  lightboxImg.alt = "查看大图";
  lightbox.appendChild(lightboxImg);
  document.body.appendChild(lightbox);
  lightbox.addEventListener("click", function () {
    lightbox.hidden = true;
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      lightbox.hidden = true;
    }
  });

  let pendingDelete = null;

  function hidePhotoMenu() {
    photoMenu.classList.remove("is-visible");
    pendingDelete = null;
  }

  travelGallery.addEventListener("contextmenu", function (event) {
    const comment = event.target.closest(".photo-comment");
    if (comment) {
      if (comment.dataset.uid !== deviceUid() && !isAlbumOwner()) {
        return;
      }
      event.preventDefault();
      pendingDelete = {
        type: "photoComment",
        photoKey: comment.closest(".travel-photo").dataset.photoId,
        commentId: comment.dataset.commentId
      };
      photoMenu.style.left = Math.min(event.clientX, window.innerWidth - 150) + "px";
      photoMenu.style.top = Math.min(event.clientY, window.innerHeight - 70) + "px";
      photoMenu.classList.add("is-visible");
      return;
    }

    const item = event.target.closest(".travel-photo");
    if (!item) {
      return;
    }
    const isOwnerPhoto = item.dataset.owner === "1";
    if (isOwnerPhoto && !isAlbumOwner()) {
      return;
    }
    event.preventDefault();
    pendingDelete = { type: "photo", id: item.dataset.photoId, ownerPhoto: isOwnerPhoto };
    photoMenu.style.left = Math.min(event.clientX, window.innerWidth - 150) + "px";
    photoMenu.style.top = Math.min(event.clientY, window.innerHeight - 70) + "px";
    photoMenu.classList.add("is-visible");
  });

  document.addEventListener("click", hidePhotoMenu);
  document.addEventListener("scroll", hidePhotoMenu, true);
  window.addEventListener("blur", hidePhotoMenu);

  deleteBtn.addEventListener("click", async function () {
    if (!pendingDelete) {
      return;
    }
    const targetPhotoId = pendingDelete.id;
    const targetCommentId = pendingDelete.commentId;
    const targetPhotoKey = pendingDelete.photoKey;
    if (pendingDelete.type === "photo" && pendingDelete.ownerPhoto) {
      const hidden = readJSON(HIDDEN_OWNER_KEY, []);
      if (hidden.indexOf(targetPhotoId) === -1) {
        hidden.push(targetPhotoId);
        writeJSON(HIDDEN_OWNER_KEY, hidden);
      }
      hidePhotoMenu();
      if (currentProvince) {
        renderGallery();
      }
      return;
    }
    if (pendingDelete.type === "photo") {
      const parts = targetPhotoId.split("|");
      if (parts[0] === "community" && parts.length === 4) {
        const province = parts[1];
        const category = parts[2];
        const photoId = parts[3];
        const community = loadCommunity();
        const provinceData = community[province];
        if (provinceData && typeof provinceData === "object") {
          const list = provinceData[category] || [];
          provinceData[category] = list.filter(function (p) {
            return p.id !== photoId;
          });
          writeJSON(PHOTOS_KEY, community);
        }
        await dbDelete(targetPhotoId);
        const comments = loadPhotoComments();
        if (comments[targetPhotoId]) {
          delete comments[targetPhotoId];
          writeJSON(PHOTO_CM_KEY, comments);
        }
      }
    } else if (pendingDelete.type === "photoComment") {
      const comments = loadPhotoComments();
      if (comments[targetPhotoKey]) {
        comments[targetPhotoKey] = comments[targetPhotoKey].filter(function (c) {
          return c.id !== targetCommentId;
        });
        writeJSON(PHOTO_CM_KEY, comments);
      }
    }
    hidePhotoMenu();
    if (currentProvince) {
      renderGallery();
    }
  });

  const locModal = document.createElement("div");
  locModal.className = "loc-modal";
  locModal.innerHTML =
    '<div class="loc-modal-panel" role="dialog" aria-modal="true" aria-label="选择地点">' +
    '<div class="loc-modal-head">' +
    '<button type="button" class="loc-back" hidden>返回</button>' +
    '<p class="loc-title">选择地址</p>' +
    '<button type="button" class="loc-close">✕</button>' +
    "</div>" +
    '<div class="loc-list"></div>' +
    "</div>";
  document.body.appendChild(locModal);

  const locList = locModal.querySelector(".loc-list");
  const locBack = locModal.querySelector(".loc-back");
  const locClose = locModal.querySelector(".loc-close");
  let pendingLocPhoto = null;
  let pendingLocCity = null;

  function normalizeProvinceName(name) {
    return String(name)
      .replace("壮族自治区", "")
      .replace("回族自治区", "")
      .replace("维吾尔自治区", "")
      .replace("自治区", "")
      .replace("特别行政区", "")
      .replace("省", "")
      .replace("市", "");
  }

  function findDivisionProvince(shortName) {
    const keys = Object.keys(window.CHINA_DIVISION || {});
    for (let i = 0; i < keys.length; i++) {
      if (normalizeProvinceName(keys[i]) === shortName) {
        return keys[i];
      }
    }
    return null;
  }

  function showLocationModal(photo) {
    pendingLocPhoto = photo;
    pendingLocCity = null;
    locBack.hidden = true;
    const division = window.CHINA_DIVISION && findDivisionProvince(currentProvince);
    if (!division) {
      return;
    }
    const cities = Object.keys(window.CHINA_DIVISION[division]);
    renderLocCities(cities);
    locModal.classList.add("is-visible");
  }

  function renderLocCities(cities) {
    locList.innerHTML = "";
    locBack.hidden = true;
    cities.forEach(function (city) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "loc-option";
      btn.dataset.city = city;
      btn.textContent = city;
      locList.appendChild(btn);
    });
  }

  function renderLocAreas(provinceKey, city) {
    locList.innerHTML = "";
    locBack.hidden = false;
    const areas = window.CHINA_DIVISION[provinceKey][city] || [];
    areas.forEach(function (area) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "loc-option";
      btn.dataset.area = area;
      btn.textContent = area;
      locList.appendChild(btn);
    });
  }

  function savePhotoLocation(location) {
    if (!pendingLocPhoto) {
      return;
    }
    const id = pendingLocPhoto.id;
    if (pendingLocPhoto.owner) {
      const locations = readJSON(OWNER_LOC_KEY, {});
      locations[id] = location;
      writeJSON(OWNER_LOC_KEY, locations);
    } else {
      const parts = id.split("|");
      if (parts[0] === "community" && parts.length === 4) {
        const community = loadCommunity();
        const provinceData = community[parts[1]];
        if (provinceData && typeof provinceData === "object") {
          const list = provinceData[parts[2]] || [];
          for (let i = 0; i < list.length; i++) {
            if (list[i].id === parts[3]) {
              list[i].location = location;
              break;
            }
          }
          writeJSON(PHOTOS_KEY, community);
        }
      }
    }
    locModal.classList.remove("is-visible");
    pendingLocPhoto = null;
    pendingLocCity = null;
    renderGallery();
  }

  locList.addEventListener("click", function (event) {
    const cityBtn = event.target.closest(".loc-option[data-city]");
    if (cityBtn && pendingLocPhoto) {
      pendingLocCity = cityBtn.dataset.city;
      const division = findDivisionProvince(currentProvince);
      if (division) {
        renderLocAreas(division, pendingLocCity);
      }
      return;
    }
    const areaBtn = event.target.closest(".loc-option[data-area]");
    if (areaBtn && pendingLocPhoto && pendingLocCity) {
      savePhotoLocation(pendingLocCity + " · " + areaBtn.dataset.area);
    }
  });

  locBack.addEventListener("click", function () {
    const division = findDivisionProvince(currentProvince);
    if (division) {
      renderLocCities(Object.keys(window.CHINA_DIVISION[division]));
    }
  });

  locClose.addEventListener("click", function () {
    locModal.classList.remove("is-visible");
    pendingLocPhoto = null;
    pendingLocCity = null;
  });

  locModal.addEventListener("click", function (event) {
    if (event.target === locModal) {
      locModal.classList.remove("is-visible");
      pendingLocPhoto = null;
      pendingLocCity = null;
    }
  });

  travelGallery.addEventListener("click", function (event) {
    const locBtn = event.target.closest(".photo-loc-btn");
    if (locBtn && !locBtn.disabled) {
      const item = locBtn.closest(".travel-photo");
      const photo = {
        id: item.dataset.photoId,
        owner: item.dataset.owner === "1"
      };
      showLocationModal(photo);
    }
  });

  uploadBtn.addEventListener("click", function () {
    uploadInput.click();
  });

  uploadInput.addEventListener("change", function () {
    const file = uploadInput.files && uploadInput.files[0];
    if (!file || !currentProvince) {
      return;
    }
    if (!file.type || !file.type.startsWith("image/")) {
      travelHint.textContent = "这个文件不是照片（视频无法上传），请选择 JPG/PNG 图片";
      uploadInput.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
      const image = new Image();
      image.onerror = function () {
        travelHint.textContent = "这张照片太大或格式不支持，请使用压缩版重试";
        uploadInput.value = "";
      };
      image.onload = async function () {
        const maxSize = 720;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);

        const community = loadCommunity();
        let provinceData = community[currentProvince];
        if (Array.isArray(provinceData)) {
          provinceData = { "风景": provinceData };
          community[currentProvince] = provinceData;
        }
        if (!provinceData || typeof provinceData !== "object") {
          provinceData = {};
          community[currentProvince] = provinceData;
        }
        provinceData[currentCategory] = provinceData[currentCategory] || [];
        const newPhoto = {
          id: "p" + Date.now() + Math.random().toString(36).slice(2, 8),
          createdAt: Date.now()
        };
        provinceData[currentCategory].push(newPhoto);
        if (!writeJSON(PHOTOS_KEY, community)) {
          travelHint.textContent = "存储空间不足，照片未能保存";
          return;
        }
        const fullId = communityId(currentProvince, currentCategory, newPhoto.id);
        try {
          await dbPut(fullId, dataUrl);
        } catch (e) {
          provinceData[currentCategory] = provinceData[currentCategory].filter(function (p) {
            return p.id !== newPhoto.id;
          });
          writeJSON(PHOTOS_KEY, community);
          travelHint.textContent = "照片保存失败，请重试";
          return;
        }

        travelHint.textContent = "上传成功，照片已经加入" + currentProvince;
        renderGallery();
        uploadInput.value = "";
      };
      image.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });

  if (mapEl && window.echarts && window.CHINA_MAP && window.TRAVEL_PHOTOS) {
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
            fontSize: 11,
            fontFamily: "Noto Serif SC, serif"
          },
          itemStyle: {
            areaColor: "#26343b",
            borderColor: "rgba(198, 164, 104, 0.7)",
            borderWidth: 0.8
          },
          emphasis: {
            label: { color: "#f0e6d2", fontSize: 13 },
            itemStyle: {
              areaColor: "#35535e",
              shadowBlur: 18,
              shadowColor: "rgba(192, 138, 107, 0.45)"
            }
          },
          data: Object.keys(SHORT_NAMES).map(function (official) {
            return { name: official };
          })
        }
      ]
    });

    chart.on("click", function (params) {
      if (params.name) {
        renderTravel(params.name);
      }
    });

    window.addEventListener("resize", function () {
      chart.resize();
    });
  }

  (async function () {
    const community = loadCommunity();
    let changed = false;
    for (const province of Object.keys(community)) {
      const raw = community[province];
      const cats = Array.isArray(raw) ? { "风景": raw } : raw;
      if (!cats || typeof cats !== "object") {
        continue;
      }
      for (const category of Object.keys(cats)) {
        const list = cats[category] || [];
        for (const photo of list) {
          if (photo.dataUrl) {
            await dbPut(communityId(province, category, photo.id), photo.dataUrl).catch(function () {});
            delete photo.dataUrl;
            changed = true;
          }
        }
      }
    }
    if (changed) {
      writeJSON(PHOTOS_KEY, community);
    }
  })();
})();
