-- DESTRUCTIVE: run only when you intentionally want a completely empty ARMS database.
-- This removes all archive records, all user accounts, all notifications and all audit history.
TRUNCATE TABLE
  arms_projects,
  arms_dossiers,
  arms_boxes,
  arms_upload_history,
  arms_notifications,
  arms_audit_logs,
  arms_users,
  arms_login_attempts
RESTART IDENTITY CASCADE;

UPDATE arms_app_state
   SET revision = 0,
       updated_at = NOW()
 WHERE id = 1;
