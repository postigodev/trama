use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ObservedPlayback {
    pub source: String,
    pub source_app_id: Option<String>,
    pub title: Option<String>,
    pub artist: Option<String>,
    pub album_title: Option<String>,
    pub playback_status: Option<String>,
    pub position_ms: Option<u64>,
    pub duration_ms: Option<u64>,
    pub observed_at_ms: u64,
}

#[cfg(target_os = "windows")]
pub async fn get_current_media_session() -> Result<Option<ObservedPlayback>, String> {
    use windows::core::Interface;
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|error| format!("failed to request Windows media session manager: {error}"))?
        .await
        .map_err(|error| format!("failed to open Windows media session manager: {error}"))?;

    let session = manager
        .GetCurrentSession()
        .map_err(|error| format!("failed to get current Windows media session: {error}"))?;

    if Interface::as_raw(&session).is_null() {
        return Ok(None);
    }

    let media_properties = session
        .TryGetMediaPropertiesAsync()
        .map_err(|error| format!("failed to request Windows media properties: {error}"))?
        .await
        .map_err(|error| format!("failed to read Windows media properties: {error}"))?;
    let timeline = session
        .GetTimelineProperties()
        .map_err(|error| format!("failed to read Windows media timeline: {error}"))?;
    let playback_info = session
        .GetPlaybackInfo()
        .map_err(|error| format!("failed to read Windows media playback info: {error}"))?;
    let playback_status = playback_info
        .PlaybackStatus()
        .map_err(|error| format!("failed to read Windows media playback status: {error}"))?;

    Ok(Some(ObservedPlayback {
        source: "windows_media_session".into(),
        source_app_id: hstring_to_option(
            session
                .SourceAppUserModelId()
                .map_err(|error| format!("failed to read Windows media source app: {error}"))?,
        ),
        title: hstring_to_option(
            media_properties
                .Title()
                .map_err(|error| format!("failed to read Windows media title: {error}"))?,
        ),
        artist: hstring_to_option(
            media_properties
                .Artist()
                .map_err(|error| format!("failed to read Windows media artist: {error}"))?,
        ),
        album_title: hstring_to_option(
            media_properties
                .AlbumTitle()
                .map_err(|error| format!("failed to read Windows media album title: {error}"))?,
        ),
        playback_status: Some(map_windows_playback_status(playback_status).into()),
        position_ms: duration_to_millis(
            timeline
                .Position()
                .map_err(|error| format!("failed to read Windows media position: {error}"))?,
        ),
        duration_ms: duration_to_millis(
            timeline
                .EndTime()
                .map_err(|error| format!("failed to read Windows media duration: {error}"))?,
        ),
        observed_at_ms: now_ms(),
    }))
}

#[cfg(not(target_os = "windows"))]
pub async fn get_current_media_session() -> Result<Option<ObservedPlayback>, String> {
    Ok(None)
}

#[cfg(target_os = "windows")]
fn hstring_to_option(value: windows::core::HSTRING) -> Option<String> {
    let value = value.to_string_lossy();
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed.to_string())
    }
}

#[cfg(target_os = "windows")]
fn duration_to_millis(duration: windows::Foundation::TimeSpan) -> Option<u64> {
    let raw = duration.Duration;
    if raw <= 0 {
        return None;
    }

    Some((raw / 10_000) as u64)
}

#[cfg(target_os = "windows")]
fn map_windows_playback_status(
    status: windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus,
) -> &'static str {
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionPlaybackStatus;

    match status {
        GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing => "playing",
        GlobalSystemMediaTransportControlsSessionPlaybackStatus::Paused => "paused",
        GlobalSystemMediaTransportControlsSessionPlaybackStatus::Stopped => "stopped",
        GlobalSystemMediaTransportControlsSessionPlaybackStatus::Closed => "closed",
        _ => "unknown",
    }
}

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}
