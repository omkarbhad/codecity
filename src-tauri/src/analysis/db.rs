use rusqlite::{params, Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

use super::layout::CitySnapshot;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectRecord {
    pub id: String,
    pub name: String,
    pub repo_url: String,
    pub visibility: String,
    pub status: String,
    pub file_count: i64,
    pub line_count: i64,
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
        let data_dir = dirs::data_dir()
            .ok_or_else(|| "Could not find data directory".to_string())?;
        let dir = data_dir.join("codecity");
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
        Ok(dir.join("codecity.db"))
    }

    fn migrate(&self) -> SqlResult<()> {
        let conn = self.conn.lock().map_err(|_| "DB lock poisoned".to_string()).map_err(|e| rusqlite::Error::InvalidParameterName(e))?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                repo_url TEXT NOT NULL,
                visibility TEXT NOT NULL DEFAULT 'PRIVATE',
                status TEXT NOT NULL DEFAULT 'PENDING',
                file_count INTEGER NOT NULL DEFAULT 0,
                line_count INTEGER NOT NULL DEFAULT 0,
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

            CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
            CREATE INDEX IF NOT EXISTS idx_snapshots_project_id ON snapshots(project_id);

            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            "
        )?;
        Ok(())
    }

    pub fn create_project(&self, name: &str, repo_url: &str, visibility: &str, status: &str, user_id: &str) -> Result<ProjectRecord, String> {
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
            user_id: user_id.to_string(),
            error: None,
            created_at: now.clone(),
            updated_at: now,
        })
    }

    pub fn get_project(&self, id: &str) -> Result<Option<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, user_id, error, created_at, updated_at
             FROM projects WHERE id = ?1"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(params![id], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                repo_url: row.get(2)?,
                visibility: row.get(3)?,
                status: row.get(4)?,
                file_count: row.get(5)?,
                line_count: row.get(6)?,
                user_id: row.get(7)?,
                error: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        });

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn update_project_status(&self, id: &str, status: &str, file_count: i64, line_count: i64, error: Option<&str>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE projects SET status = ?1, file_count = ?2, line_count = ?3, error = ?4, updated_at = ?5 WHERE id = ?6",
            params![status, file_count, line_count, error, now, id],
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_project(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM snapshots WHERE project_id = ?1", params![id]).map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM projects WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_projects_by_user(&self, user_id: &str) -> Result<Vec<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, user_id, error, created_at, updated_at
             FROM projects WHERE user_id = ?1 ORDER BY updated_at DESC"
        ).map_err(|e| e.to_string())?;

        let records = stmt.query_map(params![user_id], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                repo_url: row.get(2)?,
                visibility: row.get(3)?,
                status: row.get(4)?,
                file_count: row.get(5)?,
                line_count: row.get(6)?,
                user_id: row.get(7)?,
                error: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

        Ok(records)
    }

    pub fn get_all_public_projects(&self) -> Result<Vec<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, user_id, error, created_at, updated_at
             FROM projects WHERE visibility = 'PUBLIC' AND status = 'COMPLETED'
             ORDER BY updated_at DESC LIMIT 50"
        ).map_err(|e| e.to_string())?;

        let records = stmt.query_map([], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                repo_url: row.get(2)?,
                visibility: row.get(3)?,
                status: row.get(4)?,
                file_count: row.get(5)?,
                line_count: row.get(6)?,
                user_id: row.get(7)?,
                error: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        }).map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

        Ok(records)
    }

    pub fn find_duplicate(&self, repo_url: &str, user_id: &str) -> Result<Option<ProjectRecord>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare(
            "SELECT id, name, repo_url, visibility, status, file_count, line_count, user_id, error, created_at, updated_at
             FROM projects WHERE repo_url = ?1 AND user_id = ?2
             ORDER BY updated_at DESC LIMIT 1"
        ).map_err(|e| e.to_string())?;

        let result = stmt.query_row(params![repo_url, user_id], |row| {
            Ok(ProjectRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                repo_url: row.get(2)?,
                visibility: row.get(3)?,
                status: row.get(4)?,
                file_count: row.get(5)?,
                line_count: row.get(6)?,
                user_id: row.get(7)?,
                error: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        });

        match result {
            Ok(record) => Ok(Some(record)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn save_snapshot(&self, project_id: &str, snapshot: &CitySnapshot) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        // Delete old snapshots
        conn.execute("DELETE FROM snapshots WHERE project_id = ?1", params![project_id])
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
                std::io::Read::read_to_string(&mut decoder, &mut json).map_err(|e| e.to_string())?;
                let snapshot: CitySnapshot = serde_json::from_str(&json).map_err(|e| e.to_string())?;
                Ok(Some(snapshot))
            }
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn.prepare("SELECT value FROM settings WHERE key = ?1")
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
        ).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn delete_setting(&self, key: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM settings WHERE key = ?1", params![key])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
