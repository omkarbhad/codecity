use rusqlite::Row;
use rusqlite::{params, Connection, OptionalExtension, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

use codecity_core::layout::CitySnapshot;
use codecity_core::parser::ParsedFile;

#[derive(Debug, Clone, Serialize)]
pub struct SecurityScanRecord {
    pub id: String,
    pub project_id: String,
    pub status: String,
    pub ruleset: String,
    pub total_findings: i64,
    pub error: Option<String>,
    pub started_at: String,
    pub finished_at: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FindingRecord {
    pub id: String,
    pub scan_id: String,
    pub project_id: String,
    pub severity: String,
    pub rule_id: String,
    pub file_path: String,
    pub start_line: i64,
    pub end_line: i64,
    pub message: String,
    pub snippet: Option<String>,
}

#[derive(Debug, Clone)]
pub struct NewFinding {
    pub id: String,
    pub scan_id: String,
    pub project_id: String,
    pub severity: String,
    pub rule_id: String,
    pub file_path: String,
    pub start_line: i64,
    pub end_line: i64,
    pub message: String,
    pub snippet: Option<String>,
}

fn row_to_scan(r: &Row) -> SqlResult<SecurityScanRecord> {
    Ok(SecurityScanRecord {
        id: r.get(0)?,
        project_id: r.get(1)?,
        status: r.get(2)?,
        ruleset: r.get(3)?,
        total_findings: r.get(4)?,
        error: r.get(5)?,
        started_at: r.get(6)?,
        finished_at: r.get(7)?,
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRecord {
    pub id: String,
    pub name: String,
    pub repo_url: String,
    pub visibility: String,
    pub status: String,
    pub file_count: i64,
    pub line_count: i64,
    pub progress: f64,
    pub progress_stage: String,
    pub progress_message: String,
    pub files_discovered: i64,
    pub files_parsed: i64,
    pub user_id: String,
    pub error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let db_path = Self::db_path()?;
        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate().map_err(|e| e.to_string())?;
        Ok(db)
    }

    fn db_path() -> Result<PathBuf, String> {
        let data_dir =
            dirs::data_dir().ok_or_else(|| "Could not find data directory".to_string())?;
        let dir = data_dir.join("codecity");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir.join("codecity.db"))
    }

    fn migrate(&self) -> SqlResult<()> {
        let conn = self
            .conn
            .lock()
            .map_err(|_| "DB lock poisoned".to_string())
            .map_err(|e| rusqlite::Error::InvalidParameterName(e))?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                repo_url TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'PRIVATE',
                status TEXT NOT NULL DEFAULT 'PENDING',
                file_count INTEGER NOT NULL DEFAULT 0,
                line_count INTEGER NOT NULL DEFAULT 0,
                progress REAL NOT NULL DEFAULT 0,
                progress_stage TEXT NOT NULL DEFAULT 'queued',
                progress_message TEXT NOT NULL DEFAULT 'Queued',
                files_discovered INTEGER NOT NULL DEFAULT 0,
                files_parsed INTEGER NOT NULL DEFAULT 0,
                user_id TEXT NOT NULL DEFAULT 'local',
                error TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS snapshots (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                name TEXT NOT NULL DEFAULT 'default',
                data_compressed BLOB,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS parsed_files (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                data_compressed BLOB NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
            CREATE INDEX IF NOT EXISTS idx_snapshots_project_id ON snapshots(project_id);
            CREATE INDEX IF NOT EXISTS idx_parsed_files_project_id ON parsed_files(project_id);


            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS security_scans (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                status TEXT NOT NULL DEFAULT 'PENDING',
                ruleset TEXT NOT NULL DEFAULT 'auto',
                total_findings INTEGER NOT NULL DEFAULT 0,
                error TEXT,
                started_at TEXT NOT NULL DEFAULT (datetime('now')),
                finished_at TEXT
            );

            CREATE TABLE IF NOT EXISTS security_findings (
                id TEXT PRIMARY KEY,
                scan_id TEXT NOT NULL REFERENCES security_scans(id) ON DELETE CASCADE,
                project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
                severity TEXT NOT NULL,
                rule_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                start_line INTEGER NOT NULL,
                end_line INTEGER NOT NULL,
                message TEXT NOT NULL,
                snippet TEXT
            );

            CREATE INDEX IF NOT EXISTS idx_security_scans_project_id
                ON security_scans(project_id);
            CREATE INDEX IF NOT EXISTS idx_security_findings_scan_id
                ON security_findings(scan_id);
            CREATE INDEX IF NOT EXISTS idx_security_findings_project_severity
                ON security_findings(project_id, severity);
            ",
        )?;
        Self::add_column_if_missing(&conn, "projects", "progress", "REAL NOT NULL DEFAULT 0")?;
        Self::add_column_if_missing(
            &conn,
            "projects",
            "progress_stage",
            "TEXT NOT NULL DEFAULT 'queued'",
        )?;
        Self::add_column_if_missing(
            &conn,
            "projects",
            "progress_message",
            "TEXT NOT NULL DEFAULT 'Queued'",
        )?;
        Self::add_column_if_missing(
            &conn,
            "projects",
            "files_discovered",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        Self::add_column_if_missing(
            &conn,
            "projects",
            "files_parsed",
            "INTEGER NOT NULL DEFAULT 0",
        )?;
        Ok(())
    }

    fn add_column_if_missing(
        conn: &Connection,
        table: &str,
        column: &str,
        definition: &str,
    ) -> SqlResult<()> {
        let mut stmt = conn.prepare(&format!("PRAGMA table_info({})", table))?;
        let exists = stmt
            .query_map([], |row| row.get::<_, String>(1))?
            .filter_map(Result::ok)
            .any(|name| name == column);

        if !exists {
            conn.execute(
                &format!("ALTER TABLE {} ADD COLUMN {} {}", table, column, definition),
                [],
            )?;
        }

        Ok(())
    }

    fn project_from_row(row: &Row<'_>) -> rusqlite::Result<ProjectRecord> {
        Ok(ProjectRecord {
            id: row.get(0)?,
            name: row.get(1)?,
            repo_url: row.get(2)?,
            visibility: row.get(3)?,
            status: row.get(4)?,
            file_count: row.get(5)?,
            line_count: row.get(6)?,
            progress: row.get(7)?,
            progress_stage: row.get(8)?,
            progress_message: row.get(9)?,
            files_discovered: row.get(10)?,
            files_parsed: row.get(11)?,
            user_id: row.get(12)?,
            error: row.get(13)?,
            created_at: row.get(14)?,
            updated_at: row.get(15)?,
        })
    }

    pub fn create_project(
        &self,
        name: &str,
        repo_url: &str,
        visibility: &str,
        status: &str,
        user_id: &str,
    ) -> Result<ProjectRecord, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO projects (id, name, repo_url, visibility, status, user_id, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
            params![id, name, repo_url, visibility, status, user_id, now],
        ).map_err(|e| e.to_string())?;

        Ok(ProjectRecord {
            id,
            name: name.to_string(),
            repo_url: repo_url.to_string(),
            visibility: visibility.to_string(),
            status: status.to_string(),
            file_count: 0,
            line_count: 0,
            progress: 0.0,
            progress_stage: "queued".to_string(),
            progress_message: "Queued".to_string(),
            files_discovered: 0,
            files_parsed: 0,
            user_id: user_id.to_string(),
            error: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn get_project(&self, id: &str) -> Result<Option<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, progress, progress_stage, progress_message, files_discovered, files_parsed, user_id, error, created_at, updated_at
             FROM projects WHERE id = ?1"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(params![id], Self::project_from_row);

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn update_project_status(
        &self,
        id: &str,
        status: &str,
        file_count: i64,
        line_count: i64,
        error: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        let changed = conn.execute(
            "UPDATE projects SET status = ?1, file_count = ?2, line_count = ?3, error = ?4, updated_at = ?5 WHERE id = ?6",
            params![status, file_count, line_count, error, now, id],
        ).map_err(|e| e.to_string())?;
        if changed == 0 {
            return Err(format!("Project not found while updating status: {}", id));
        }
        Ok(())
    }

    pub fn update_project_progress(
        &self,
        id: &str,
        progress: f64,
        stage: &str,
        message: &str,
        files_discovered: i64,
        files_parsed: i64,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        let changed = conn.execute(
            "UPDATE projects SET progress = ?1, progress_stage = ?2, progress_message = ?3, files_discovered = ?4, files_parsed = ?5, updated_at = ?6 WHERE id = ?7",
            params![progress, stage, message, files_discovered, files_parsed, now, id],
        ).map_err(|e| e.to_string())?;
        if changed == 0 {
            return Err(format!("Project not found while updating progress: {}", id));
        }
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM snapshots WHERE project_id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM parsed_files WHERE project_id = ?1",
            params![id],
        )
        .map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_projects_by_user(&self, user_id: &str) -> Result<Vec<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, progress, progress_stage, progress_message, files_discovered, files_parsed, user_id, error, created_at, updated_at
             FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let records = stmt
            .query_map(params![user_id], Self::project_from_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(records)
    }

    pub fn get_all_public_projects(&self) -> Result<Vec<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, progress, progress_stage, progress_message, files_discovered, files_parsed, user_id, error, created_at, updated_at
             FROM projects WHERE status = 'COMPLETED'
             ORDER BY updated_at DESC LIMIT 50"
        ).map_err(|e| e.to_string())?;

        let records = stmt
            .query_map([], Self::project_from_row)
            .map_err(|e| e.to_string())?
            .filter_map(|r| r.ok())
            .collect();

        Ok(records)
    }

    pub fn find_duplicate(
        &self,
        repo_url: &str,
        user_id: &str,
    ) -> Result<Option<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, progress, progress_stage, progress_message, files_discovered, files_parsed, user_id, error, created_at, updated_at
             FROM projects WHERE repo_url = ?1 AND user_id = ?2
             ORDER BY updated_at DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(params![repo_url, user_id], Self::project_from_row);

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn save_snapshot(&self, project_id: &str, snapshot: &CitySnapshot) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // Delete old snapshots
        conn.execute(
            "DELETE FROM snapshots WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| e.to_string())?;

        // Compress the JSON
        let json = serde_json::to_string(snapshot).map_err(|e| e.to_string())?;
        let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        std::io::Write::write_all(&mut encoder, json.as_bytes()).map_err(|e| e.to_string())?;
        let compressed = encoder.finish().map_err(|e| e.to_string())?;

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO snapshots (id, project_id, name, data_compressed, created_at) VALUES (?1, ?2, 'default', ?3, ?4)",
            params![id, project_id, compressed, now],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn save_parsed_files(&self, project_id: &str, files: &[ParsedFile]) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute(
            "DELETE FROM parsed_files WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| e.to_string())?;

        let json = serde_json::to_string(files).map_err(|e| e.to_string())?;
        let mut encoder = flate2::write::GzEncoder::new(Vec::new(), flate2::Compression::default());
        std::io::Write::write_all(&mut encoder, json.as_bytes()).map_err(|e| e.to_string())?;
        let compressed = encoder.finish().map_err(|e| e.to_string())?;

        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        conn.execute(
            "INSERT INTO parsed_files (id, project_id, data_compressed, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![id, project_id, compressed, now],
        ).map_err(|e| e.to_string())?;

        Ok(())
    }

    pub fn get_parsed_files(&self, project_id: &str) -> Result<Option<Vec<ParsedFile>>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT data_compressed FROM parsed_files WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(params![project_id], |row| {
            let compressed: Vec<u8> = row.get(0)?;
            Ok(compressed)
        });

        match result {
            Ok(compressed) => {
                let mut decoder = flate2::read::GzDecoder::new(compressed.as_slice());
                let mut json = String::new();
                std::io::Read::read_to_string(&mut decoder, &mut json)
                    .map_err(|e| e.to_string())?;
                let files = serde_json::from_str(&json).map_err(|e| e.to_string())?;
                Ok(Some(files))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn get_snapshot(&self, project_id: &str) -> Result<Option<CitySnapshot>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT data_compressed FROM snapshots WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(params![project_id], |row| {
            let compressed: Vec<u8> = row.get(0)?;
            Ok(compressed)
        });

        match result {
            Ok(compressed) => {
                let mut decoder = flate2::read::GzDecoder::new(compressed.as_slice());
                let mut json = String::new();
                std::io::Read::read_to_string(&mut decoder, &mut json)
                    .map_err(|e| e.to_string())?;
                let snapshot: CitySnapshot =
                    serde_json::from_str(&json).map_err(|e| e.to_string())?;
                Ok(Some(snapshot))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = ?1")
            .map_err(|e| e.to_string())?;
        let result = stmt.query_row(params![key], |row| row.get(0));
        match result {
            Ok(val) => Ok(Some(val)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
             ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = datetime('now')",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_setting(&self, key: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM settings WHERE key = ?1", params![key])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // ---- security scans ----

    pub fn insert_security_scan(
        &self,
        id: &str,
        project_id: &str,
        ruleset: &str,
    ) -> Result<String, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO security_scans (id, project_id, ruleset, status)
             VALUES (?1, ?2, ?3, 'PENDING')",
            params![id, project_id, ruleset],
        )
        .map_err(|e| e.to_string())?;
        Ok(id.to_string())
    }

    pub fn update_security_scan_status(
        &self,
        scan_id: &str,
        status: &str,
        total_findings: Option<i64>,
        error: Option<&str>,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let finished = matches!(status, "COMPLETED" | "FAILED" | "CANCELLED");
        conn.execute(
            "UPDATE security_scans
                SET status = ?1,
                    total_findings = COALESCE(?2, total_findings),
                    error = COALESCE(?3, error),
                    finished_at = CASE WHEN ?4 THEN datetime('now') ELSE finished_at END
              WHERE id = ?5",
            params![status, total_findings, error, finished as i64, scan_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_latest_security_scan(
        &self,
        project_id: &str,
    ) -> Result<Option<SecurityScanRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, status, ruleset, total_findings, error, started_at, finished_at
                   FROM security_scans
                  WHERE project_id = ?1
                  ORDER BY started_at DESC
                  LIMIT 1",
            )
            .map_err(|e| e.to_string())?;
        stmt.query_row(params![project_id], row_to_scan)
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn get_security_scan_by_id(
        &self,
        scan_id: &str,
    ) -> Result<Option<SecurityScanRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, project_id, status, ruleset, total_findings, error, started_at, finished_at
                   FROM security_scans
                  WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;
        stmt.query_row(params![scan_id], row_to_scan)
            .optional()
            .map_err(|e| e.to_string())
    }

    pub fn bulk_insert_security_findings(&self, findings: &[NewFinding]) -> Result<(), String> {
        if findings.is_empty() {
            return Ok(());
        }
        let mut conn = self.conn.lock().map_err(|e| e.to_string())?;
        let tx = conn.transaction().map_err(|e| e.to_string())?;
        {
            let mut stmt = tx
                .prepare(
                    "INSERT INTO security_findings
                       (id, scan_id, project_id, severity, rule_id, file_path,
                        start_line, end_line, message, snippet)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                )
                .map_err(|e| e.to_string())?;
            for f in findings {
                stmt.execute(params![
                    f.id,
                    f.scan_id,
                    f.project_id,
                    f.severity,
                    f.rule_id,
                    f.file_path,
                    f.start_line,
                    f.end_line,
                    f.message,
                    f.snippet,
                ])
                .map_err(|e| e.to_string())?;
            }
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_security_findings_for_scan(
        &self,
        scan_id: &str,
    ) -> Result<Vec<FindingRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT id, scan_id, project_id, severity, rule_id, file_path,
                        start_line, end_line, message, snippet
                   FROM security_findings
                  WHERE scan_id = ?1
                  ORDER BY CASE severity
                             WHEN 'ERROR' THEN 0
                             WHEN 'WARNING' THEN 1
                             WHEN 'INFO' THEN 2
                             ELSE 3
                           END,
                           file_path,
                           start_line",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map(params![scan_id], |r| {
                Ok(FindingRecord {
                    id: r.get(0)?,
                    scan_id: r.get(1)?,
                    project_id: r.get(2)?,
                    severity: r.get(3)?,
                    rule_id: r.get(4)?,
                    file_path: r.get(5)?,
                    start_line: r.get(6)?,
                    end_line: r.get(7)?,
                    message: r.get(8)?,
                    snippet: r.get(9)?,
                })
            })
            .map_err(|e| e.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())?;
        Ok(rows)
    }

    pub fn delete_security_scans_for_project(&self, project_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM security_scans WHERE project_id = ?1",
            params![project_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    #[cfg(test)]
    pub fn new_in_memory() -> Result<Self, String> {
        let conn = Connection::open_in_memory().map_err(|e| e.to_string())?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate().map_err(|e| e.to_string())?;
        Ok(db)
    }

    #[cfg(test)]
    pub fn has_table(&self, name: &str) -> Result<bool, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = ?1",
                params![name],
                |r| r.get(0),
            )
            .map_err(|e| e.to_string())?;
        Ok(count == 1)
    }
}

#[cfg(test)]
mod security_schema_tests {
    use super::*;

    #[test]
    fn migration_creates_security_scans_and_findings_tables() {
        let db = Database::new_in_memory().expect("in-memory db");
        assert!(
            db.has_table("security_scans").unwrap(),
            "security_scans table missing"
        );
        assert!(
            db.has_table("security_findings").unwrap(),
            "security_findings table missing"
        );
    }
}

#[cfg(test)]
mod security_db_tests {
    use super::*;

    fn seed_project(db: &Database) -> ProjectRecord {
        db.create_project("p", "local:/tmp", "PRIVATE", "COMPLETED", "local")
            .unwrap()
    }

    #[test]
    fn insert_then_get_latest_scan_round_trips() {
        let db = Database::new_in_memory().unwrap();
        let proj = seed_project(&db);
        let scan_id = db
            .insert_security_scan("scan1", &proj.id, "auto")
            .expect("insert");
        assert_eq!(scan_id, "scan1");
        let scan = db.get_latest_security_scan(&proj.id).unwrap().unwrap();
        assert_eq!(scan.id, "scan1");
        assert_eq!(scan.status, "PENDING");
        assert_eq!(scan.ruleset, "auto");
    }

    #[test]
    fn update_status_moves_to_completed_and_sets_total() {
        let db = Database::new_in_memory().unwrap();
        let proj = seed_project(&db);
        db.insert_security_scan("scan1", &proj.id, "auto").unwrap();
        db.update_security_scan_status("scan1", "COMPLETED", Some(7), None)
            .unwrap();
        let scan = db.get_latest_security_scan(&proj.id).unwrap().unwrap();
        assert_eq!(scan.status, "COMPLETED");
        assert_eq!(scan.total_findings, 7);
        assert!(scan.finished_at.is_some());
    }

    #[test]
    fn bulk_insert_findings_and_query_by_scan() {
        let db = Database::new_in_memory().unwrap();
        let proj = seed_project(&db);
        db.insert_security_scan("scan1", &proj.id, "auto").unwrap();
        let findings = vec![
            NewFinding {
                id: "f1".into(),
                scan_id: "scan1".into(),
                project_id: proj.id.clone(),
                severity: "ERROR".into(),
                rule_id: "rule.a".into(),
                file_path: "src/a.ts".into(),
                start_line: 12,
                end_line: 12,
                message: "boom".into(),
                snippet: Some("x".into()),
            },
            NewFinding {
                id: "f2".into(),
                scan_id: "scan1".into(),
                project_id: proj.id.clone(),
                severity: "WARNING".into(),
                rule_id: "rule.b".into(),
                file_path: "src/b.ts".into(),
                start_line: 30,
                end_line: 35,
                message: "meh".into(),
                snippet: None,
            },
        ];
        db.bulk_insert_security_findings(&findings).unwrap();
        let rows = db.get_security_findings_for_scan("scan1").unwrap();
        assert_eq!(rows.len(), 2);
        assert!(rows
            .iter()
            .any(|r| r.severity == "ERROR" && r.rule_id == "rule.a"));
    }

    #[test]
    fn delete_for_project_clears_scans_and_findings() {
        let db = Database::new_in_memory().unwrap();
        let proj = seed_project(&db);
        db.insert_security_scan("scan1", &proj.id, "auto").unwrap();
        db.bulk_insert_security_findings(&[NewFinding {
            id: "f1".into(),
            scan_id: "scan1".into(),
            project_id: proj.id.clone(),
            severity: "INFO".into(),
            rule_id: "rule.c".into(),
            file_path: "x".into(),
            start_line: 1,
            end_line: 1,
            message: "x".into(),
            snippet: None,
        }])
        .unwrap();
        db.delete_security_scans_for_project(&proj.id).unwrap();
        assert!(db.get_latest_security_scan(&proj.id).unwrap().is_none());
        assert!(db
            .get_security_findings_for_scan("scan1")
            .unwrap()
            .is_empty());
    }
}
