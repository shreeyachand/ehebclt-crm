// ── CREATE ──────────────────────────────────────────────────────
onRecordCreateRequest(function (e) {
  var col = "";
  try { col = e.collection ? String(e.collection.name || e.collection()) : ""; } catch (_) {}
  if (!col || col === "_audits") { e.next(); return; }

  var actorEmail = "";
  var actorId = "";
  if (e.auth) {
    try { actorEmail = String(e.auth.get("email") || ""); } catch (_) {}
    try { actorId = String(e.auth.id || ""); } catch (_) {}
  }

  // Pre-generate record ID and stash actor info for after-success hook
  var rec = e.record;
  var idChars = "abcdefghijklmnopqrstuvwxyz0123456789";
  var rid = "";
  for (var ci = 0; ci < 15; ci++) {
    rid += idChars.charAt(Math.floor(Math.random() * idChars.length));
  }
  rec.set("id", rid);
  $app.store().set("_act_" + rid, { email: actorEmail, id: actorId, col: col });

  e.next();
});

onRecordAfterCreateSuccess(function (e) {
  var rec = e.record;
  if (!rec) { e.next(); return; }
  var rid = String(rec.id || "");
  if (!rid) { e.next(); return; }

  var stashed = null;
  try { stashed = $app.store().get("_act_" + rid); } catch (_) {}
  if (!stashed) { e.next(); return; }
  try { $app.store().set("_act_" + rid, null); } catch (_) {}

  var actorEmail = String(stashed.email || "");
  var actorId = String(stashed.id || "");
  var col = String(stashed.col || "");

  var created = {};
  try {
    var coll = rec.collection();
    if (coll && coll.fields) {
      var names = coll.fields.fieldNames();
      for (var i = 0; i < names.length; i++) {
        var fn = names[i];
        if (fn === "id" || fn === "created" || fn === "updated") continue;
        try {
          var val = rec.get(fn);
          if (val !== null && val !== undefined && val !== "") {
            created[fn] = String(val);
          }
        } catch (_) {}
      }
    }
  } catch (_) {}

  try {
    var auditsColl = $app.findCollectionByNameOrId("_audits");
    var auditRec = new Record(auditsColl);
    auditRec.set("action", "create");
    auditRec.set("collection_name", col);
    auditRec.set("record_id", rid);
    auditRec.set("changes", JSON.stringify(created));
    auditRec.set("actor_email", actorEmail);
    auditRec.set("actor_id", actorId);
    auditRec.set("created_at", new Date().toISOString());
    var form = new RecordUpsertForm($app, auditRec);
    form.submit();
  } catch (err) {
    console.log("AUDIT_ERR", String(err));
  }

  e.next();
});

// ── UPDATE (diff only) ──────────────────────────────────────────
onRecordUpdateRequest(function (e) {
  var col = "";
  try { col = e.collection ? String(e.collection.name || e.collection()) : ""; } catch (_) {}
  if (!col || col === "_audits") { e.next(); return; }

  var rec = e.record;
  var oldRec = null;
  try { oldRec = rec ? rec.original() : null; } catch (_) {}

  var diff = {};
  if (rec && oldRec) {
    try {
      var coll = rec.collection();
      if (coll && coll.fields) {
        var names = coll.fields.fieldNames();
        for (var i = 0; i < names.length; i++) {
          var fn = names[i];
          if (fn === "id" || fn === "created" || fn === "updated") continue;
          try {
            var oldVal = oldRec.get(fn);
            var newVal = rec.get(fn);
            if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
              diff[fn] = { old: String(oldVal !== null && oldVal !== undefined ? oldVal : ""), new: String(newVal !== null && newVal !== undefined ? newVal : "") };
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  if (Object.keys(diff).length === 0) { e.next(); return; }

  var actorEmail = "";
  var actorId = "";
  if (e.auth) {
    try { actorEmail = String(e.auth.get("email") || ""); } catch (_) {}
    try { actorId = String(e.auth.id || ""); } catch (_) {}
  }

  try {
    var auditsColl = $app.findCollectionByNameOrId("_audits");
    var auditRec = new Record(auditsColl);
    auditRec.set("action", "update");
    auditRec.set("collection_name", col);
    auditRec.set("record_id", rec ? String(rec.id || "") : "");
    auditRec.set("changes", JSON.stringify(diff));
    auditRec.set("actor_email", actorEmail);
    auditRec.set("actor_id", actorId);
    auditRec.set("created_at", new Date().toISOString());
    var form = new RecordUpsertForm($app, auditRec);
    form.submit();
  } catch (err) {
    console.log("AUDIT_ERR", String(err));
  }

  e.next();
});

// ── DELETE ──────────────────────────────────────────────────────
onRecordDeleteRequest(function (e) {
  var col = "";
  try { col = e.collection ? String(e.collection.name || e.collection()) : ""; } catch (_) {}
  if (!col || col === "_audits") { e.next(); return; }

  var rec = e.record;
  var deleted = {};
  if (rec) {
    try {
      var coll = rec.collection();
      if (coll && coll.fields) {
        var names = coll.fields.fieldNames();
        for (var i = 0; i < names.length; i++) {
          var fn = names[i];
          if (fn === "id" || fn === "created" || fn === "updated") continue;
          try {
            var val = rec.get(fn);
            if (val !== null && val !== undefined && val !== "") {
              deleted[fn] = String(val);
            }
          } catch (_) {}
        }
      }
    } catch (_) {}
  }

  var actorEmail = "";
  var actorId = "";
  if (e.auth) {
    try { actorEmail = String(e.auth.get("email") || ""); } catch (_) {}
    try { actorId = String(e.auth.id || ""); } catch (_) {}
  }

  try {
    var auditsColl = $app.findCollectionByNameOrId("_audits");
    var auditRec = new Record(auditsColl);
    auditRec.set("action", "delete");
    auditRec.set("collection_name", col);
    auditRec.set("record_id", rec ? String(rec.id || "") : "");
    auditRec.set("changes", JSON.stringify(deleted));
    auditRec.set("actor_email", actorEmail);
    auditRec.set("actor_id", actorId);
    auditRec.set("created_at", new Date().toISOString());
    var form = new RecordUpsertForm($app, auditRec);
    form.submit();
  } catch (err) {
    console.log("AUDIT_ERR", String(err));
  }

  e.next();
});
