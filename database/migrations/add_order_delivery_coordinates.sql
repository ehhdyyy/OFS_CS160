USE ofs_db;

SET @add_delivery_latitude = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'ofs_db'
              AND table_name = 'orders'
              AND column_name = 'delivery_latitude'
        ),
        'SELECT 1',
        'ALTER TABLE orders ADD COLUMN delivery_latitude DECIMAL(10, 7) NULL AFTER delivery_address'
    )
);

PREPARE stmt FROM @add_delivery_latitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @add_delivery_longitude = (
    SELECT IF(
        EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'ofs_db'
              AND table_name = 'orders'
              AND column_name = 'delivery_longitude'
        ),
        'SELECT 1',
        'ALTER TABLE orders ADD COLUMN delivery_longitude DECIMAL(10, 7) NULL AFTER delivery_latitude'
    )
);

PREPARE stmt FROM @add_delivery_longitude;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
