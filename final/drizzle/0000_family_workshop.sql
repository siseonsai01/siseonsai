CREATE TABLE families (code TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL);
--> statement-breakpoint
CREATE TABLE stations (id TEXT PRIMARY KEY, data TEXT NOT NULL, updated REAL NOT NULL);
--> statement-breakpoint
CREATE TABLE attempts (key TEXT PRIMARY KEY, count INTEGER NOT NULL, updated REAL NOT NULL);
--> statement-breakpoint
CREATE INDEX families_updated ON families(updated);
--> statement-breakpoint
CREATE INDEX stations_updated ON stations(updated);
--> statement-breakpoint
CREATE INDEX attempts_updated ON attempts(updated);
