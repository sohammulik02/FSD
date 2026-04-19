INSERT INTO users (full_name, email, password_hash)
VALUES ('Demo User', 'demo.user@example.com', 'demo_password_hash');

INSERT INTO trips (user_id, title, destination_country, start_date, end_date, base_currency)
VALUES (1, 'Japan Tour', 'Japan', '2026-06-16', '2026-06-26', 'INR');

INSERT INTO expenses (trip_id, amount, currency, base_currency, converted_amount, conversion_rate, category, date, description)
VALUES (1, '140.00', 'USD', 'INR', '11690.00', '83.50', 'hotel', '2026-06-17', 'Metro');
