CREATE TABLE tablet_links (key_hash TEXT PRIMARY KEY, station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE, role TEXT NOT NULL CHECK (role IN ('adult','child')));
--> statement-breakpoint
CREATE UNIQUE INDEX tablet_links_role ON tablet_links(station_id,role);

