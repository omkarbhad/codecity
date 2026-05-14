//! Security-scan implementation. Wraps the bundled opengrep binary
//! (`tokio::process::Command`), parses its JSON output via
//! `security_types`, and persists findings through `Database`. Cancellation
//! is cooperative: a single check happens *before* the binary is spawned.
//! Once opengrep is running it always runs to completion; a cancelled scan
//! discards its output and marks the row `CANCELLED`.

use uuid::Uuid;

use super::super::db::NewFinding;
use super::security_types::{OpengrepRun, RawFinding};

/// Normalize an opengrep severity string into one of `ERROR | WARNING | INFO`.
/// Unknown / missing severities default to `INFO` so we never drop a finding.
fn normalize_severity(raw: Option<&str>) -> &'static str {
    match raw.map(|s| s.to_uppercase()).as_deref() {
        Some("ERROR") | Some("HIGH") | Some("CRITICAL") => "ERROR",
        Some("WARNING") | Some("MEDIUM") => "WARNING",
        _ => "INFO",
    }
}

pub fn map_findings(scan_id: &str, project_id: &str, run: &OpengrepRun) -> Vec<NewFinding> {
    run.results
        .iter()
        .map(|f: &RawFinding| NewFinding {
            id: Uuid::new_v4().to_string(),
            scan_id: scan_id.to_string(),
            project_id: project_id.to_string(),
            severity: normalize_severity(f.extra.severity.as_deref()).to_string(),
            rule_id: f.check_id.clone(),
            file_path: f.path.clone(),
            start_line: f.start.line,
            end_line: f.end.line,
            message: f.extra.message.clone(),
            snippet: f.extra.lines.clone(),
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run_with_one(severity: Option<&str>) -> OpengrepRun {
        let json = format!(
            r#"{{
              "results": [{{
                "check_id": "r.x",
                "path": "p.ts",
                "start": {{ "line": 1, "col": 1 }},
                "end":   {{ "line": 2, "col": 1 }},
                "extra": {{ "message": "m", "severity": {}, "lines": "L" }}
              }}],
              "errors": []
            }}"#,
            severity
                .map(|s| format!(r#""{s}""#))
                .unwrap_or_else(|| "null".into())
        );
        serde_json::from_str(&json).unwrap()
    }

    #[test]
    fn maps_one_finding() {
        let run = run_with_one(Some("ERROR"));
        let rows = map_findings("scan1", "p1", &run);
        assert_eq!(rows.len(), 1);
        let r = &rows[0];
        assert_eq!(r.scan_id, "scan1");
        assert_eq!(r.project_id, "p1");
        assert_eq!(r.severity, "ERROR");
        assert_eq!(r.rule_id, "r.x");
        assert_eq!(r.start_line, 1);
        assert_eq!(r.end_line, 2);
        assert_eq!(r.snippet.as_deref(), Some("L"));
    }

    #[test]
    fn unknown_severity_defaults_to_info() {
        let run = run_with_one(Some("nonsense"));
        let rows = map_findings("s", "p", &run);
        assert_eq!(rows[0].severity, "INFO");
    }

    #[test]
    fn missing_severity_defaults_to_info() {
        let run = run_with_one(None);
        let rows = map_findings("s", "p", &run);
        assert_eq!(rows[0].severity, "INFO");
    }
}
