USE ofs_db;

UPDATE users
SET password_hash = '$2b$12$cCzOfYzMgNNEMSdUSiekh.ZlVKtnagqlT99n0fQkVpV/MiRlJazeK',
    role = 'manager'
WHERE email = 'admin@ofs.com';