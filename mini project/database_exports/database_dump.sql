BEGIN TRANSACTION;
CREATE TABLE expenses (
	id INTEGER NOT NULL, 
	trip_id INTEGER NOT NULL, 
	amount NUMERIC(12, 2) NOT NULL, 
	currency VARCHAR(3) NOT NULL, 
	base_currency VARCHAR(3) NOT NULL, 
	converted_amount NUMERIC(12, 2) NOT NULL, 
	conversion_rate NUMERIC(12, 6) NOT NULL, 
	category VARCHAR(50) NOT NULL, 
	date DATE NOT NULL, 
	description TEXT, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(trip_id) REFERENCES trips (id) ON DELETE CASCADE
);
INSERT INTO "expenses" VALUES(1,3,140,'USD','INR',1.68,1.19760479041916175e-02,'hotel','2026-06-17','Metro','2026-04-19 15:19:32.429335');
INSERT INTO "expenses" VALUES(2,4,140,'USD','INR',1.68,1.19760479041916175e-02,'hotel','2026-06-17','Metro','2026-04-19 15:21:34.379655');
CREATE TABLE sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
CREATE TABLE trips (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	title VARCHAR(120) NOT NULL, 
	destination_country VARCHAR(80) NOT NULL, 
	start_date DATE NOT NULL, 
	end_date DATE NOT NULL, 
	base_currency VARCHAR(3) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);
INSERT INTO "trips" VALUES(1,5,'Japan Tour','Japan','2026-06-16','2026-06-26','INR','2026-04-19 15:18:14.030678');
INSERT INTO "trips" VALUES(2,5,'Japan Tour','Japan','2026-06-16','2026-06-26','INR','2026-04-19 15:18:42.453259');
INSERT INTO "trips" VALUES(3,5,'Japan Tour 2','Japan','2026-06-16','2026-06-26','INR','2026-04-19 15:19:30.425333');
INSERT INTO "trips" VALUES(4,5,'Japan Tour 3','Japan','2026-06-16','2026-06-26','INR','2026-04-19 15:21:34.357766');
CREATE TABLE users (
	id INTEGER NOT NULL, 
	full_name VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	password_hash VARCHAR(255) NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id)
);
INSERT INTO "users" VALUES(1,'Test User','testr2@example.com','$2b$12$g1n09ZxpnOytLN.A6UGV1.kPVYgmfEIs6JrLu2w.7X6Zv4nNiFHRu','2026-04-19 15:10:08.019688');
INSERT INTO "users" VALUES(2,'New User','user_1400767845@example.com','$2b$12$IaUAojo0cWs2DGKtNYn9hOxWqpJsyAiFMjhUoYiXQ0muc12wctpjq','2026-04-19 15:10:15.546783');
INSERT INTO "users" VALUES(3,'Test User','test@example.com','$pbkdf2-sha256$29000$ZMx5L0VoTWntHUMIQQihFA$J0ytJccdHQTSSDiStqjXJL/MdDRCTBKy1HCcKTg7Bbw','2026-04-19 15:11:17.276996');
INSERT INTO "users" VALUES(4,'soham mulik','sohammulik@gmail.com','$pbkdf2-sha256$29000$co6xllKqNQZASEkpxThHiA$7U94nxtNpiMCXPCZORHUJZ8B9Txe1sBznmGOwOZsyNc','2026-04-19 15:14:57.251078');
INSERT INTO "users" VALUES(5,'Demo User','demo.user@example.com','$pbkdf2-sha256$29000$9d6bU8pZq9VaK8VY691bKw$U4wUDtJTbkVfycJBQzSxWLOWP4D50pkd24rQV6gTWKU','2026-04-19 15:18:13.966349');
CREATE INDEX ix_users_id ON users (id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE INDEX ix_trips_id ON trips (id);
CREATE INDEX ix_expenses_id ON expenses (id);
COMMIT;
