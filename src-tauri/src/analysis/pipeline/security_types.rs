//! DTOs for parsing the opengrep `--json-output` payload.
//!
//! Mirrors the shape opengrep 1.21 emits. Only the fields we consume are
//! pulled out; missing optional fields fall back via `serde(default)` so a
//! benign schema bump in opengrep doesn't break parsing.

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub struct OpengrepRun {
    #[serde(default)]
    pub results: Vec<RawFinding>,
    #[serde(default)]
    pub errors: Vec<RawError>,
}

#[derive(Debug, Deserialize)]
pub struct RawFinding {
    pub check_id: String,
    pub path: String,
    pub start: RawPos,
    pub end: RawPos,
    pub extra: RawExtra,
}

#[derive(Debug, Deserialize)]
pub struct RawPos {
    pub line: i64,
}

#[derive(Debug, Deserialize)]
pub struct RawExtra {
    pub message: String,
    #[serde(default)]
    pub severity: Option<String>,
    #[serde(default)]
    pub lines: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RawError {
    #[serde(default)]
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_minimal_run() {
        let json = r#"{
          "results": [{
            "check_id": "javascript.lang.security.audit.x",
            "path": "src/a.ts",
            "start": { "line": 10, "col": 1 },
            "end":   { "line": 12, "col": 9 },
            "extra": { "message": "boom", "severity": "ERROR", "lines": "x" }
          }],
          "errors": []
        }"#;
        let run: OpengrepRun = serde_json::from_str(json).unwrap();
        assert_eq!(run.results.len(), 1);
        let f = &run.results[0];
        assert_eq!(f.path, "src/a.ts");
        assert_eq!(f.start.line, 10);
        assert_eq!(f.extra.severity.as_deref(), Some("ERROR"));
    }

    #[test]
    fn parse_empty_run() {
        let run: OpengrepRun =
            serde_json::from_str(r#"{"results":[],"errors":[]}"#).unwrap();
        assert!(run.results.is_empty());
        assert!(run.errors.is_empty());
    }
}
