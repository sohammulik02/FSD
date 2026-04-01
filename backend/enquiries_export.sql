-- KTBS Ghatanji Enquiries — SQL Dump
-- Generated: 2026-04-01T20:39:24.148Z

DROP TABLE IF EXISTS enquiries;

CREATE TABLE enquiries (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name     TEXT    NOT NULL,
  mobile_number TEXT    NOT NULL,
  email_id      TEXT    NOT NULL,
  pin_code      TEXT    NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO enquiries (id, full_name, mobile_number, email_id, pin_code, created_at) VALUES (4, 'test4', '556', 'test4@gmail.com', '411044', '2026-04-01 20:39:24');
INSERT INTO enquiries (id, full_name, mobile_number, email_id, pin_code, created_at) VALUES (3, 'Test User', '1234567890', 'test@example.com', '411044', '2026-04-01 20:37:32');
INSERT INTO enquiries (id, full_name, mobile_number, email_id, pin_code, created_at) VALUES (2, 'test', '6789', 'test2@gmail.com', '411044', '2026-04-01 20:19:55');
INSERT INTO enquiries (id, full_name, mobile_number, email_id, pin_code, created_at) VALUES (1, 'Test Student', '9876543210', 'test@example.com', '445301', '2026-04-01 20:13:00');
