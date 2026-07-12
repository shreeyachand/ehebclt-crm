// ── CREATE ──────────────────────────────────────────────────────
onRecordCreateRequest(function (e) {
  var col = "";
  try { col = e.collection ? String(e.collection.name || e.collection()) : ""; } catch (_) {}
  if (!col || col.startsWith("_")) { e.next(); return; }

  var actorEmail = "";
  var actorId = "";
  if (e.auth) {
    try { actorEmail = String(e.auth.get("email") || ""); } catch (_) {}
    try { actorId = String(e.auth.id || ""); } catch (_) {}
  }

  var rec = e.record;
  var rid = String(rec.id || "");
  if (!rid) {
    rid = $security.randomStringWithAlphabet(15, "abcdefghijklmnopqrstuvwxyz0123456789");
    rec.set("id", rid);
  }
  $app.store().set("_act_" + rid, { email: actorEmail, id: actorId, col: col });

  e.next();
});

onRecordAfterCreateError(function (e) {
  var col = "";
  try { col = e.collection ? String(e.collection.name || e.collection()) : ""; } catch (_) {}
  if (!col || col.startsWith("_")) { e.next(); return; }

  var rid = "";
  try { rid = String(e.record.id || ""); } catch (_) {}
  if (!rid) { e.next(); return; }

  try { $app.store().remove("_act_" + rid); } catch (_) {}

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
  try { $app.store().remove("_act_" + rid); } catch (_) {}

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
  if (!col || col.startsWith("_")) { e.next(); return; }

  var rec = e.record;
  if (!rec) { e.next(); return; }
  var rid = String(rec.id || "");
  if (!rid) { e.next(); return; }

  var oldRec = null;
  try { oldRec = rec.original(); } catch (_) {}

  var diff = {};
  if (oldRec) {
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

  $app.store().set("_upd_" + rid, {
    email: actorEmail,
    id: actorId,
    col: col,
    diff: diff
  });

  e.next();
});

onRecordAfterUpdateError(function (e) {
  var col = "";
  try { col = e.collection ? String(e.collection.name || e.collection()) : ""; } catch (_) {}
  if (!col || col.startsWith("_")) { e.next(); return; }

  var rid = "";
  try { rid = String(e.record.id || ""); } catch (_) {}
  if (!rid) { e.next(); return; }

  try { $app.store().remove("_upd_" + rid); } catch (_) {}

  e.next();
});

onRecordAfterUpdateSuccess(function (e) {
  var rec = e.record;
  if (!rec) { e.next(); return; }
  var rid = String(rec.id || "");
  if (!rid) { e.next(); return; }

  var stashed = null;
  try { stashed = $app.store().get("_upd_" + rid); } catch (_) {}
  if (!stashed) { e.next(); return; }
  try { $app.store().remove("_upd_" + rid); } catch (_) {}

  var diff = stashed.diff;
  if (!diff || Object.keys(diff).length === 0) { e.next(); return; }

  try {
    var auditsColl = $app.findCollectionByNameOrId("_audits");
    var auditRec = new Record(auditsColl);
    auditRec.set("action", "update");
    auditRec.set("collection_name", String(stashed.col || ""));
    auditRec.set("record_id", rid);
    auditRec.set("changes", JSON.stringify(diff));
    auditRec.set("actor_email", String(stashed.email || ""));
    auditRec.set("actor_id", String(stashed.id || ""));
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
  if (!col || col.startsWith("_")) { e.next(); return; }

  var rec = e.record;
  if (!rec) { e.next(); return; }
  var rid = String(rec.id || "");
  if (!rid) { e.next(); return; }

  var deleted = {};
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

  var actorEmail = "";
  var actorId = "";
  if (e.auth) {
    try { actorEmail = String(e.auth.get("email") || ""); } catch (_) {}
    try { actorId = String(e.auth.id || ""); } catch (_) {}
  }

  $app.store().set("_del_" + rid, {
    email: actorEmail,
    id: actorId,
    col: col,
    deleted: deleted
  });

  e.next();
});

onRecordAfterDeleteError(function (e) {
  var col = "";
  try { col = e.collection ? String(e.collection.name || e.collection()) : ""; } catch (_) {}
  if (!col || col.startsWith("_")) { e.next(); return; }

  var rid = "";
  try { rid = String(e.record.id || ""); } catch (_) {}
  if (!rid) { e.next(); return; }

  try { $app.store().remove("_del_" + rid); } catch (_) {}

  e.next();
});

onRecordAfterDeleteSuccess(function (e) {
  var rec = e.record;
  if (!rec) { e.next(); return; }
  var rid = String(rec.id || "");
  if (!rid) { e.next(); return; }

  var stashed = null;
  try { stashed = $app.store().get("_del_" + rid); } catch (_) {}
  if (!stashed) { e.next(); return; }
  try { $app.store().remove("_del_" + rid); } catch (_) {}

  try {
    var auditsColl = $app.findCollectionByNameOrId("_audits");
    var auditRec = new Record(auditsColl);
    auditRec.set("action", "delete");
    auditRec.set("collection_name", String(stashed.col || ""));
    auditRec.set("record_id", rid);
    auditRec.set("changes", JSON.stringify(stashed.deleted || {}));
    auditRec.set("actor_email", String(stashed.email || ""));
    auditRec.set("actor_id", String(stashed.id || ""));
    auditRec.set("created_at", new Date().toISOString());
    var form = new RecordUpsertForm($app, auditRec);
    form.submit();
  } catch (err) {
    console.log("AUDIT_ERR", String(err));
  }

  e.next();
});
