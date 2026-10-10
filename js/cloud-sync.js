(function () {
  var SUPABASE_URL = "https://eyhgxppjegnwxewiygae.supabase.co";
  var SUPABASE_KEY = "sb_publishable_KJB4xKmtEnJ_PbTp02roLw_mzDqVZle";
  var ROW_ID = "site";
  var LOCAL_ONLY = {
    "xxj_owner_activated": 1,
    "xxj_album_owner": 1,
    "xxj_itinerary_owner": 1,
    "xxj_reflections_owner": 1,
    "xxj_album_uid": 1,
    "xxj_itinerary_uid": 1,
    "xxj_reflections_uid": 1,
    "xxj_album_hidden_owner_v1": 1,
    "xxj_album_mine_v1": 1
  };
  var cache = {};
  var saving = false;
  var saveTimer = null;

  function parseStoredObject(value) {
    if (!value) return {};
    if (typeof value === "object") return value;
    try {
      var parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  // 某些栏目以站内数据为准：替换掉这一栏目的旧照片与旧评论，
  // 避免云端或浏览器里的残留数据把已经删掉的内容又带回来。
  function applyAuthoritativeSections(target, recovery) {
    var sections = recovery.__authoritative_sections;
    if (!sections || !sections.length) return false;

    var changed = false;
    var commentsKey = "xxj_album_photo_comments_v1";
    var likesKey = "xxj_album_likes_v1";
    var locationsKey = "xxj_album_owner_locations_v1";
    var photosKey = "xxj_album_photos_v1";
    var keys = [commentsKey, likesKey, locationsKey];

    sections.forEach(function (section) {
      if (!section || !section.province || !section.category) return;
      var ownerPrefix = "owner|" + section.province + "|" + section.category + "|";
      var communityPrefix = "community|" + section.province + "|" + section.category + "|";

      keys.forEach(function (key) {
        var seed = parseStoredObject(recovery[key]);
        var current = parseStoredObject(target[key]);
        var next = {};
        Object.keys(current).forEach(function (photoId) {
          if (photoId.indexOf(ownerPrefix) === 0) return;
          if (photoId.indexOf(communityPrefix) === 0) return;
          next[photoId] = current[photoId];
        });
        (section.photoIds || []).forEach(function (photoId) {
          if (Object.prototype.hasOwnProperty.call(seed, photoId)) {
            next[photoId] = seed[photoId];
          }
        });
        var nextValue = JSON.stringify(next);
        if (nextValue !== target[key]) {
          target[key] = nextValue;
          changed = true;
        }
      });

      var photos = parseStoredObject(target[photosKey]);
      var provincePhotos = photos[section.province];
      if (provincePhotos && typeof provincePhotos === "object") {
        var list = provincePhotos[section.category];
        if (Array.isArray(list) && list.length) {
          provincePhotos[section.category] = [];
          target[photosKey] = JSON.stringify(photos);
          changed = true;
        }
      }

      // 整栏照片替换后，旧的“隐藏照片”记录索引会对不上号，
      // 留着会把新照片误当成被隐藏的照片，所以清掉这一栏的记录。
      try {
        var hiddenRaw = window.localStorage.getItem("xxj_album_hidden_owner_v1");
        if (hiddenRaw) {
          var hiddenList = JSON.parse(hiddenRaw);
          if (Array.isArray(hiddenList)) {
            var nextHidden = hiddenList.filter(function (photoId) {
              return String(photoId).indexOf(ownerPrefix) !== 0;
            });
            if (nextHidden.length !== hiddenList.length) {
              window.localStorage.setItem(
                "xxj_album_hidden_owner_v1",
                JSON.stringify(nextHidden)
              );
            }
          }
        }
      } catch (e) {}
    });

    return changed;
  }

  function mergeAlbumRecovery(target) {
    var recovery = window.__ALBUM_RECOVERY_DATA;
    if (!recovery || !target) return false;

    var changed = false;
    var commentsKey = "xxj_album_photo_comments_v1";
    var likesKey = "xxj_album_likes_v1";
    var locationsKey = "xxj_album_owner_locations_v1";

    var comments = parseStoredObject(target[commentsKey]);
    var recoveredComments = parseStoredObject(recovery[commentsKey]);
    Object.keys(recoveredComments).forEach(function (photoId) {
      var currentComments = Array.isArray(comments[photoId]) ? comments[photoId].slice() : [];
      var knownIds = {};
      currentComments.forEach(function (comment) {
        if (comment && comment.id) knownIds[String(comment.id)] = true;
      });
      (recoveredComments[photoId] || []).forEach(function (comment) {
        if (comment && comment.id && !knownIds[String(comment.id)]) {
          currentComments.push(comment);
          knownIds[String(comment.id)] = true;
        }
      });
      currentComments.sort(function (a, b) {
        return (a.createdAt || 0) - (b.createdAt || 0);
      });
      comments[photoId] = currentComments;
    });
    var nextComments = JSON.stringify(comments);
    if (nextComments !== target[commentsKey]) {
      target[commentsKey] = nextComments;
      changed = true;
    }

    var likes = parseStoredObject(target[likesKey]);
    var recoveredLikes = parseStoredObject(recovery[likesKey]);
    Object.keys(recoveredLikes).forEach(function (photoId) {
      var current = Number(likes[photoId] || 0);
      var recovered = Number(recoveredLikes[photoId] || 0);
      if (recovered > current) likes[photoId] = recovered;
    });
    var nextLikes = JSON.stringify(likes);
    if (nextLikes !== target[likesKey]) {
      target[likesKey] = nextLikes;
      changed = true;
    }

    var locations = parseStoredObject(target[locationsKey]);
    var recoveredLocations = parseStoredObject(recovery[locationsKey]);
    Object.keys(recoveredLocations).forEach(function (photoId) {
      if (!locations[photoId] && recoveredLocations[photoId]) {
        locations[photoId] = recoveredLocations[photoId];
      }
    });
    var nextLocations = JSON.stringify(locations);
    if (nextLocations !== target[locationsKey]) {
      target[locationsKey] = nextLocations;
      changed = true;
    }

    if (applyAuthoritativeSections(target, recovery)) changed = true;

    return changed;
  }

  function readLocalKeys() {
    try {
      for (var i = 0; i < window.localStorage.length; i++) {
        var k = window.localStorage.key(i);
        if (k && !LOCAL_ONLY[k] && !Object.prototype.hasOwnProperty.call(cache, k)) {
          var v = window.localStorage.getItem(k);
          if (v !== null) cache[k] = v;
        }
      }
    } catch (e) {}
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveCloud, 600);
  }

  function saveCloud() {
    if (saving) { scheduleSave(); return; }
    saving = true;
    try {
      Object.keys(cache).forEach(function (k) {
        try { window.localStorage.setItem(k, cache[k]); } catch (e) {}
      });
    } catch (e) {}
    fetch(SUPABASE_URL + "/rest/v1/site_data?on_conflict=id", {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify([{ id: ROW_ID, data: (function () {
        var out = {};
        Object.keys(cache).forEach(function (k) { if (!LOCAL_ONLY[k]) out[k] = cache[k]; });
        return out;
      })(), updated_at: new Date().toISOString() }])
    }).catch(function () {}).then(function () { saving = false; });
  }

  function makeShim() {
    return {
      getItem: function (k) {
        k = String(k);
        if (LOCAL_ONLY[k]) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
        return Object.prototype.hasOwnProperty.call(cache, k) ? cache[k] : null;
      },
      setItem: function (k, v) {
        k = String(k);
        if (LOCAL_ONLY[k]) { try { window.localStorage.setItem(k, String(v)); } catch (e) {} return; }
        cache[k] = String(v);
        try { window.localStorage.setItem(k, String(v)); } catch (e) {}
        scheduleSave();
      },
      removeItem: function (k) {
        k = String(k);
        if (LOCAL_ONLY[k]) { try { window.localStorage.removeItem(k); } catch (e) {} return; }
        delete cache[k];
        try { window.localStorage.removeItem(k); } catch (e) {}
        scheduleSave();
      },
      clear: function () { cache = {}; try { window.localStorage.clear(); } catch (e) {} scheduleSave(); },
      key: function (i) { var keys = Object.keys(cache); return keys[i] || null; },
      get length() { return Object.keys(cache).length; }
    };
  }

  function loadCloud(callback) {
    fetch(SUPABASE_URL + "/rest/v1/site_data?select=data&id=eq." + ROW_ID, {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY
      }
    }).then(function (r) { return r.json(); }).then(function (rows) {
      if (rows && rows.length && rows[0].data && typeof rows[0].data === "object") {
        cache = rows[0].data;
        Object.keys(LOCAL_ONLY).forEach(function (k) { delete cache[k]; });
      }
      readLocalKeys();
      var recovered = mergeAlbumRecovery(cache);
      window.__cloudLoaded = true;
      callback();
      if (recovered) scheduleSave();
    }).catch(function () {
      readLocalKeys();
      var recovered = mergeAlbumRecovery(cache);
      window.__cloudLoaded = false;
      callback();
      if (recovered) scheduleSave();
    });
  }

  function loadScripts() {
    var list = window.__cloudScripts || [];
    var i = 0;
    function next() {
      if (i >= list.length) return;
      var s = document.createElement("script");
      s.src = list[i++];
      s.onload = next;
      s.onerror = next;
      document.body.appendChild(s);
    }
    next();
  }

  loadCloud(function () {
    window.__siteStorage = makeShim();
    loadScripts();
    setInterval(function () {
      fetch(SUPABASE_URL + "/rest/v1/site_data?select=data&id=eq." + ROW_ID, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
      }).then(function (r) { return r.json(); }).then(function (rows) {
        if (rows && rows.length && rows[0].data && typeof rows[0].data === "object") {
          cache = rows[0].data;
          Object.keys(LOCAL_ONLY).forEach(function (k) { delete cache[k]; });
          var recovered = mergeAlbumRecovery(cache);
          window.dispatchEvent(new Event("cloud-updated"));
          if (recovered) scheduleSave();
        }
      }).catch(function () {});
    }, 10000);
  });
})();
