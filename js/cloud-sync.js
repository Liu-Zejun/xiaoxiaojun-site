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
      window.__cloudLoaded = true;
      callback();
    }).catch(function () {
      readLocalKeys();
      window.__cloudLoaded = false;
      callback();
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
          window.dispatchEvent(new Event("cloud-updated"));
        }
      }).catch(function () {});
    }, 10000);
  });
})();
