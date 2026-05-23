use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDbStatus {
    pub db_path: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionUpsertInput {
    pub session: SessionRecord,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionIdInput {
    pub session_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackUpsertInput {
    pub track: TrackRecord,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackIdInput {
    pub track_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackIdsInput {
    pub track_ids: Vec<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayEventAppendInput {
    pub event: PlayEventRecord,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackEventAppendInput {
    pub event: FeedbackEventRecord,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionRecord {
    pub id: String,
    pub status: String,
    pub mode: String,
    pub started_at: String,
    pub updated_at: String,
    pub seed_track_id: Option<String>,
    pub current_track_id: Option<String>,
    pub recent_track_ids: Vec<String>,
    pub completed_track_ids: Vec<String>,
    pub skipped_track_ids: Vec<String>,
    pub replayed_track_ids: Vec<String>,
    pub accepted_artist_ids: Vec<String>,
    pub rejected_artist_ids: Vec<String>,
    pub accepted_tags: Vec<String>,
    pub rejected_tags: Vec<String>,
    pub feedback_by_track: BTreeMap<String, Vec<String>>,
    pub controls: SessionControlsRecord,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionControlsRecord {
    pub mood_strictness: f64,
    pub exploration: f64,
    pub repeat_tolerance: f64,
    pub mainstream_tolerance: f64,
    pub autopilot_enabled: bool,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackRecord {
    pub id: String,
    pub provider_ids: BTreeMap<String, String>,
    pub title: String,
    pub artists: Vec<ArtistSummaryRecord>,
    pub album: Option<AlbumSummaryRecord>,
    pub duration_ms: u64,
    pub popularity: Option<u32>,
    pub explicit: Option<bool>,
    pub artwork_url: Option<String>,
    pub tags: Option<Vec<String>>,
    pub source: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ArtistSummaryRecord {
    pub id: String,
    pub name: String,
    pub provider_ids: Option<BTreeMap<String, String>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlbumSummaryRecord {
    pub id: String,
    pub title: String,
    pub artwork_url: Option<String>,
    pub provider_ids: Option<BTreeMap<String, String>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayEventRecord {
    pub id: String,
    pub session_id: String,
    pub track_id: Option<String>,
    pub provider_name: Option<String>,
    pub provider_playback_id: Option<String>,
    pub r#type: String,
    pub occurred_at: String,
    pub progress_ms: Option<u64>,
    pub duration_ms: Option<u64>,
    pub inferred: bool,
    pub confidence: Option<f64>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeedbackEventRecord {
    pub id: String,
    pub session_id: String,
    pub track_id: Option<String>,
    pub candidate_track_id: Option<String>,
    pub r#type: String,
    pub occurred_at: String,
    pub weight: Option<f64>,
    pub note: Option<String>,
    pub metadata: Option<serde_json::Value>,
}

#[tauri::command]
pub fn local_db_status(app: tauri::AppHandle) -> Result<LocalDbStatus, String> {
    Ok(LocalDbStatus {
        db_path: db_path_buf(&app)?.display().to_string(),
    })
}

#[tauri::command]
pub fn db_session_create(
    input: SessionUpsertInput,
    app: tauri::AppHandle,
) -> Result<SessionRecord, String> {
    let connection = open_connection(&app)?;
    upsert_session(&connection, &input.session)?;
    Ok(input.session)
}

#[tauri::command]
pub fn db_session_find_by_id(
    input: SessionIdInput,
    app: tauri::AppHandle,
) -> Result<Option<SessionRecord>, String> {
    let connection = open_connection(&app)?;
    query_json_record(
        &connection,
        "SELECT payload_json FROM sessions WHERE id = ?1",
        params![input.session_id],
    )
}

#[tauri::command]
pub fn db_session_get_active(app: tauri::AppHandle) -> Result<Option<SessionRecord>, String> {
    let connection = open_connection(&app)?;
    query_json_record(
        &connection,
        "SELECT payload_json FROM sessions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 1",
        [],
    )
}

#[tauri::command]
pub fn db_session_update(
    input: SessionUpsertInput,
    app: tauri::AppHandle,
) -> Result<SessionRecord, String> {
    let connection = open_connection(&app)?;
    upsert_session(&connection, &input.session)?;
    Ok(input.session)
}

#[tauri::command]
pub fn db_track_upsert(
    input: TrackUpsertInput,
    app: tauri::AppHandle,
) -> Result<TrackRecord, String> {
    let connection = open_connection(&app)?;
    upsert_track(&connection, &input.track)?;
    Ok(input.track)
}

#[tauri::command]
pub fn db_track_find_by_id(
    input: TrackIdInput,
    app: tauri::AppHandle,
) -> Result<Option<TrackRecord>, String> {
    let connection = open_connection(&app)?;
    query_json_record(
        &connection,
        "SELECT payload_json FROM tracks WHERE id = ?1",
        params![input.track_id],
    )
}

#[tauri::command]
pub fn db_track_find_many_by_ids(
    input: TrackIdsInput,
    app: tauri::AppHandle,
) -> Result<Vec<TrackRecord>, String> {
    if input.track_ids.is_empty() {
        return Ok(vec![]);
    }

    let connection = open_connection(&app)?;
    let mut records = Vec::new();

    for track_id in input.track_ids {
        if let Some(track) = query_json_record(
            &connection,
            "SELECT payload_json FROM tracks WHERE id = ?1",
            params![track_id],
        )? {
            records.push(track);
        }
    }

    Ok(records)
}

#[tauri::command]
pub fn db_event_append_play_event(
    input: PlayEventAppendInput,
    app: tauri::AppHandle,
) -> Result<PlayEventRecord, String> {
    let connection = open_connection(&app)?;
    append_play_event(&connection, &input.event)?;
    Ok(input.event)
}

#[tauri::command]
pub fn db_event_append_feedback_event(
    input: FeedbackEventAppendInput,
    app: tauri::AppHandle,
) -> Result<FeedbackEventRecord, String> {
    let connection = open_connection(&app)?;
    append_feedback_event(&connection, &input.event)?;
    Ok(input.event)
}

#[tauri::command]
pub fn db_event_list_play_events_for_session(
    input: SessionIdInput,
    app: tauri::AppHandle,
) -> Result<Vec<PlayEventRecord>, String> {
    let connection = open_connection(&app)?;
    query_json_records(
        &connection,
        "SELECT payload_json FROM play_events WHERE session_id = ?1 ORDER BY occurred_at ASC",
        params![input.session_id],
    )
}

#[tauri::command]
pub fn db_event_list_feedback_events_for_session(
    input: SessionIdInput,
    app: tauri::AppHandle,
) -> Result<Vec<FeedbackEventRecord>, String> {
    let connection = open_connection(&app)?;
    query_json_records(
        &connection,
        "SELECT payload_json FROM feedback_events WHERE session_id = ?1 ORDER BY occurred_at ASC",
        params![input.session_id],
    )
}

fn open_connection(app: &tauri::AppHandle) -> Result<Connection, String> {
    ensure_db_dir(app)?;
    let path = db_path_buf(app)?;
    let connection = Connection::open(path)
        .map_err(|error| format!("failed to open local database: {error}"))?;
    initialize_schema(&connection)?;
    Ok(connection)
}

fn db_path_buf(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    crate::trama_storage_dir(app).map(|path| path.join("data").join("trama.db"))
}

fn ensure_db_dir(app: &tauri::AppHandle) -> Result<(), String> {
    let path = db_path_buf(app)?;
    let parent = path
        .parent()
        .ok_or_else(|| "failed to resolve local database directory".to_string())?;
    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create local database directory: {error}"))
}

fn initialize_schema(connection: &Connection) -> Result<(), String> {
    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS sessions (
              id TEXT PRIMARY KEY,
              status TEXT NOT NULL,
              updated_at TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_status_updated
              ON sessions(status, updated_at DESC);

            CREATE TABLE IF NOT EXISTS tracks (
              id TEXT PRIMARY KEY,
              updated_at TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS play_events (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              occurred_at TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_play_events_session_occurred
              ON play_events(session_id, occurred_at ASC);

            CREATE TABLE IF NOT EXISTS feedback_events (
              id TEXT PRIMARY KEY,
              session_id TEXT NOT NULL,
              occurred_at TEXT NOT NULL,
              payload_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_feedback_events_session_occurred
              ON feedback_events(session_id, occurred_at ASC);
        ",
        )
        .map_err(|error| format!("failed to initialize local database schema: {error}"))
}

fn upsert_session(connection: &Connection, session: &SessionRecord) -> Result<(), String> {
    let payload = serialize(session, "session")?;
    connection
        .execute(
            "
            INSERT INTO sessions (id, status, updated_at, payload_json)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(id) DO UPDATE SET
              status = excluded.status,
              updated_at = excluded.updated_at,
              payload_json = excluded.payload_json
        ",
            params![session.id, session.status, session.updated_at, payload],
        )
        .map_err(|error| format!("failed to upsert session: {error}"))?;

    Ok(())
}

fn upsert_track(connection: &Connection, track: &TrackRecord) -> Result<(), String> {
    let payload = serialize(track, "track")?;
    let updated_at = track
        .updated_at
        .clone()
        .or_else(|| track.created_at.clone())
        .unwrap_or_else(now_iso_string);

    connection
        .execute(
            "
            INSERT INTO tracks (id, updated_at, payload_json)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(id) DO UPDATE SET
              updated_at = excluded.updated_at,
              payload_json = excluded.payload_json
        ",
            params![track.id, updated_at, payload],
        )
        .map_err(|error| format!("failed to upsert track: {error}"))?;

    Ok(())
}

fn append_play_event(connection: &Connection, event: &PlayEventRecord) -> Result<(), String> {
    let payload = serialize(event, "play event")?;
    connection
        .execute(
            "
            INSERT INTO play_events (id, session_id, occurred_at, payload_json)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(id) DO UPDATE SET
              session_id = excluded.session_id,
              occurred_at = excluded.occurred_at,
              payload_json = excluded.payload_json
        ",
            params![event.id, event.session_id, event.occurred_at, payload],
        )
        .map_err(|error| format!("failed to append play event: {error}"))?;

    Ok(())
}

fn append_feedback_event(
    connection: &Connection,
    event: &FeedbackEventRecord,
) -> Result<(), String> {
    let payload = serialize(event, "feedback event")?;
    connection
        .execute(
            "
            INSERT INTO feedback_events (id, session_id, occurred_at, payload_json)
            VALUES (?1, ?2, ?3, ?4)
            ON CONFLICT(id) DO UPDATE SET
              session_id = excluded.session_id,
              occurred_at = excluded.occurred_at,
              payload_json = excluded.payload_json
        ",
            params![event.id, event.session_id, event.occurred_at, payload],
        )
        .map_err(|error| format!("failed to append feedback event: {error}"))?;

    Ok(())
}

fn query_json_record<T, P>(
    connection: &Connection,
    sql: &str,
    params: P,
) -> Result<Option<T>, String>
where
    T: for<'de> Deserialize<'de>,
    P: rusqlite::Params,
{
    let mut statement = connection
        .prepare(sql)
        .map_err(|error| format!("failed to prepare local database query: {error}"))?;
    let mut rows = statement
        .query(params)
        .map_err(|error| format!("failed to query local database: {error}"))?;

    let Some(row) = rows
        .next()
        .map_err(|error| format!("failed to read local database row: {error}"))?
    else {
        return Ok(None);
    };

    let payload: String = row
        .get(0)
        .map_err(|error| format!("failed to read local database payload: {error}"))?;
    deserialize(&payload).map(Some)
}

fn query_json_records<T, P>(connection: &Connection, sql: &str, params: P) -> Result<Vec<T>, String>
where
    T: for<'de> Deserialize<'de>,
    P: rusqlite::Params,
{
    let mut statement = connection
        .prepare(sql)
        .map_err(|error| format!("failed to prepare local database query: {error}"))?;
    let rows = statement
        .query_map(params, |row| row.get::<_, String>(0))
        .map_err(|error| format!("failed to query local database rows: {error}"))?;

    let mut items = Vec::new();

    for row in rows {
        let payload = row.map_err(|error| format!("failed to read local database row: {error}"))?;
        let item = deserialize(&payload)?;
        items.push(item);
    }

    Ok(items)
}

fn serialize<T: Serialize>(value: &T, label: &str) -> Result<String, String> {
    serde_json::to_string(value)
        .map_err(|error| format!("failed to serialize {label} for local database: {error}"))
}

fn deserialize<T: for<'de> Deserialize<'de>>(payload: &str) -> Result<T, String> {
    serde_json::from_str(payload)
        .map_err(|error| format!("failed to parse local database payload: {error}"))
}

fn now_iso_string() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    format!("{now}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;

    fn sample_session() -> SessionRecord {
        SessionRecord {
            id: "session-1".into(),
            status: "active".into(),
            mode: "lab".into(),
            started_at: "2026-01-01T00:00:00.000Z".into(),
            updated_at: "2026-01-01T00:01:00.000Z".into(),
            seed_track_id: None,
            current_track_id: Some("track-1".into()),
            recent_track_ids: vec!["track-1".into()],
            completed_track_ids: vec![],
            skipped_track_ids: vec![],
            replayed_track_ids: vec![],
            accepted_artist_ids: vec![],
            rejected_artist_ids: vec![],
            accepted_tags: vec![],
            rejected_tags: vec![],
            feedback_by_track: BTreeMap::new(),
            controls: SessionControlsRecord {
                mood_strictness: 0.7,
                exploration: 0.25,
                repeat_tolerance: 0.25,
                mainstream_tolerance: 0.5,
                autopilot_enabled: false,
            },
        }
    }

    #[test]
    fn initializes_schema_and_round_trips_session_payload() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();
        let session = sample_session();

        upsert_session(&connection, &session).unwrap();

        let found: Option<SessionRecord> = query_json_record(
            &connection,
            "SELECT payload_json FROM sessions WHERE id = ?1",
            params![session.id],
        )
        .unwrap();

        assert_eq!(found.unwrap().current_track_id.as_deref(), Some("track-1"));
    }

    #[test]
    fn lists_play_events_in_chronological_order() {
        let connection = Connection::open_in_memory().unwrap();
        initialize_schema(&connection).unwrap();

        append_play_event(
            &connection,
            &PlayEventRecord {
                id: "event-2".into(),
                session_id: "session-1".into(),
                track_id: Some("track-2".into()),
                provider_name: Some("local".into()),
                provider_playback_id: None,
                r#type: "track_started".into(),
                occurred_at: "2026-01-01T00:02:00.000Z".into(),
                progress_ms: Some(0),
                duration_ms: Some(1000),
                inferred: true,
                confidence: Some(0.9),
                metadata: None,
            },
        )
        .unwrap();
        append_play_event(
            &connection,
            &PlayEventRecord {
                id: "event-1".into(),
                session_id: "session-1".into(),
                track_id: Some("track-1".into()),
                provider_name: Some("local".into()),
                provider_playback_id: None,
                r#type: "track_completed".into(),
                occurred_at: "2026-01-01T00:01:00.000Z".into(),
                progress_ms: Some(900),
                duration_ms: Some(1000),
                inferred: true,
                confidence: Some(0.9),
                metadata: None,
            },
        )
        .unwrap();

        let events: Vec<PlayEventRecord> = query_json_records(
            &connection,
            "SELECT payload_json FROM play_events WHERE session_id = ?1 ORDER BY occurred_at ASC",
            params!["session-1"],
        )
        .unwrap();

        assert_eq!(
            events.into_iter().map(|event| event.id).collect::<Vec<_>>(),
            vec!["event-1", "event-2"]
        );
    }
}
