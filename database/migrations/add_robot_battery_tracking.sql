USE ofs_db;

ALTER TABLE robots
    ADD COLUMN battery_pct INT NOT NULL DEFAULT 100,
    ADD COLUMN charging_started_at TIMESTAMP NULL DEFAULT NULL;

UPDATE robots
SET battery_pct = CASE
    WHEN status = 'charging' THEN 100
    WHEN status = 'on_delivery' THEN 65
    ELSE 40
END
WHERE battery_pct IS NULL OR battery_pct = 100;

UPDATE robots
SET charging_started_at = NULL
WHERE charging_started_at IS NOT NULL OR status IN ('charging', 'on_delivery', 'offline');
