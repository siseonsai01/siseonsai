CREATE TABLE mobile_records (id TEXT PRIMARY KEY, data TEXT NOT NULL, created REAL NOT NULL);
--> statement-breakpoint
CREATE INDEX mobile_records_created ON mobile_records(created);
