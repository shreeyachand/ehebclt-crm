// Cleanup old _audits records based on Settings > Logs > Max days
cronAdd("audit_logs_cleanup", "0 0 * * *", function () {
  try {
    var maxDays = $app.settings().logs.maxDays;
    if (!maxDays || maxDays <= 0) {
      console.log("[Cron] audit_logs_cleanup: maxDays not set or invalid, skipping");
      return;
    }

    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - maxDays);
    var cutoffStr = cutoff.toISOString();

    $app.db().newQuery("DELETE FROM _audits WHERE created_at == '' OR created_at < {:cutoff}").bind({ cutoff: cutoffStr }).execute();

    console.log("[Cron] audit_logs_cleanup: purged records older than " + String(maxDays) + " days (cutoff: " + cutoffStr + ")");
  } catch (err) {
    console.log("[Cron] audit_logs_cleanup error: " + String(err));
  }
});
