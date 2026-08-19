routerAdd("POST", "/api/_app_auth", function (e) {
  var email = $os.getenv("PB_SUPERUSER_EMAIL");
  var pass = $os.getenv("PB_SUPERUSER_PASSWORD");
  if (!email || !pass) {
    return e.json(503, { message: "server auth not configured" });
  }

  var su = null;
  try { su = $app.findAuthRecordByEmail("_superusers", email); } catch (_) {}
  if (!su || !su.validatePassword(pass)) {
    return e.json(500, { message: "invalid superuser credentials" });
  }

  return e.json(200, {
    token: su.newStaticAuthToken(60 * 60 * 1000 * 1000 * 1000),
    record: su
  });
});