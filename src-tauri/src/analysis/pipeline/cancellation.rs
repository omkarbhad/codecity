//! Cancellation registry for in-flight analysis jobs.
//!
//! The desktop pipeline runs analyses on a background thread; the UI may
//! cancel a project mid-walk. Each long-running step polls
//! [`CancellationRegistry::is_cancelled`] and bails cleanly when the project
//! id has been marked. Registration is idempotent.
//!
//! Backed by a process-global `Mutex<HashSet>` because cancellation requests
//! arrive from a different thread than the analysis worker. The interface
//! hides the locking — callers never see `Mutex` or `HashSet`.

use once_cell::sync::Lazy;
use std::collections::HashSet;
use std::sync::Mutex;

/// Per-process cancellation set. Use the free functions below — there is
/// only one registry and exposing the lock would let callers deadlock the
/// pipeline.
static CANCELLED: Lazy<Mutex<HashSet<String>>> = Lazy::new(|| Mutex::new(HashSet::new()));

/// Request cancellation for `project_id`. Subsequent `is_cancelled` calls
/// will return true until [`clear`] is invoked. Idempotent.
pub fn mark(project_id: &str) {
    if let Ok(mut cancelled) = CANCELLED.lock() {
        cancelled.insert(project_id.to_string());
    }
}

/// Forget a previous cancellation request — call when an analysis finishes
/// (success or failure) so the same project id can be retried.
pub fn clear(project_id: &str) {
    if let Ok(mut cancelled) = CANCELLED.lock() {
        cancelled.remove(project_id);
    }
}

/// True if cancellation has been requested for `project_id`. Safe to poll
/// from the analysis worker thread between phases.
pub fn is_cancelled(project_id: &str) -> bool {
    CANCELLED
        .lock()
        .map(|cancelled| cancelled.contains(project_id))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn mark_then_observe_then_clear() {
        let id = "test-mark-then-observe-then-clear";
        assert!(!is_cancelled(id));
        mark(id);
        assert!(is_cancelled(id));
        clear(id);
        assert!(!is_cancelled(id));
    }

    #[test]
    fn mark_is_idempotent() {
        let id = "test-mark-is-idempotent";
        mark(id);
        mark(id);
        assert!(is_cancelled(id));
        clear(id);
    }

    #[test]
    fn clear_unknown_id_is_noop() {
        clear("never-marked");
    }
}
