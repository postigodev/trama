// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

mod media_session;

#[derive(Default)]
struct SpotifyAuthState {
    pending: Mutex<Option<PendingSpotifyAuth>>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct PendingSpotifyAuth {
    authorize_url: String,
    code_verifier: String,
    state: String,
    scopes: Vec<String>,
    started_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyAuthStartInput {
    authorize_url: String,
    code_verifier: String,
    state: String,
    scopes: Vec<String>,
    started_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyAuthStartResult {
    authorize_url: String,
    state: String,
    scopes: Vec<String>,
    started_at: String,
    token_cache_path: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyAuthFinishInput {
    code_or_callback_url: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyAuthFinishResult {
    code: String,
    code_verifier: String,
    state: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyAuthStatus {
    pending: bool,
    state: Option<String>,
    scopes: Vec<String>,
    started_at: Option<String>,
    token_cache_path: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyCachedToken {
    access_token: String,
    token_type: String,
    expires_at: String,
    refresh_token: Option<String>,
    scope: Option<String>,
    saved_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyTokenSaveInput {
    access_token: String,
    token_type: String,
    expires_at: String,
    refresh_token: Option<String>,
    scope: Option<String>,
    saved_at: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct SpotifyTokenStatus {
    authenticated: bool,
    expires_at: Option<String>,
    has_refresh_token: bool,
    scope: Option<String>,
    token_cache_path: String,
}

#[tauri::command]
fn spotify_auth_start(
    input: SpotifyAuthStartInput,
    app: tauri::AppHandle,
    auth_state: tauri::State<'_, SpotifyAuthState>,
) -> Result<SpotifyAuthStartResult, String> {
    if input.authorize_url.trim().is_empty() {
        return Err("Spotify authorize URL is required".into());
    }
    if input.code_verifier.trim().is_empty() {
        return Err("Spotify code verifier is required".into());
    }
    if input.state.trim().is_empty() {
        return Err("Spotify auth state is required".into());
    }

    let pending = PendingSpotifyAuth {
        authorize_url: input.authorize_url.clone(),
        code_verifier: input.code_verifier,
        state: input.state.clone(),
        scopes: input.scopes.clone(),
        started_at: input.started_at.clone(),
    };

    *auth_state
        .pending
        .lock()
        .map_err(|error| format!("{error:?}"))? = Some(pending);

    Ok(SpotifyAuthStartResult {
        authorize_url: input.authorize_url,
        state: input.state,
        scopes: input.scopes,
        started_at: input.started_at,
        token_cache_path: token_cache_path(&app),
    })
}

#[tauri::command]
fn spotify_auth_finish(
    input: SpotifyAuthFinishInput,
    auth_state: tauri::State<'_, SpotifyAuthState>,
) -> Result<SpotifyAuthFinishResult, String> {
    let pending = auth_state
        .pending
        .lock()
        .map_err(|error| format!("{error:?}"))?
        .clone()
        .ok_or_else(|| "Spotify auth has not been started".to_string())?;

    let parsed = extract_callback_code_and_state(&input.code_or_callback_url)?;

    if let Some(callback_state) = parsed.state.as_ref() {
        if callback_state != &pending.state {
            return Err("Spotify callback state did not match the pending auth session".into());
        }
    }

    *auth_state
        .pending
        .lock()
        .map_err(|error| format!("{error:?}"))? = None;

    Ok(SpotifyAuthFinishResult {
        code: parsed.code,
        code_verifier: pending.code_verifier,
        state: pending.state,
    })
}

#[tauri::command]
fn spotify_auth_cancel(auth_state: tauri::State<'_, SpotifyAuthState>) -> Result<(), String> {
    *auth_state
        .pending
        .lock()
        .map_err(|error| format!("{error:?}"))? = None;
    Ok(())
}

#[tauri::command]
fn spotify_auth_status(
    app: tauri::AppHandle,
    auth_state: tauri::State<'_, SpotifyAuthState>,
) -> Result<SpotifyAuthStatus, String> {
    let pending = auth_state
        .pending
        .lock()
        .map_err(|error| format!("{error:?}"))?
        .clone();

    Ok(SpotifyAuthStatus {
        pending: pending.is_some(),
        state: pending.as_ref().map(|session| session.state.clone()),
        scopes: pending
            .as_ref()
            .map(|session| session.scopes.clone())
            .unwrap_or_default(),
        started_at: pending.as_ref().map(|session| session.started_at.clone()),
        token_cache_path: token_cache_path(&app),
    })
}

#[tauri::command]
fn spotify_token_save(
    input: SpotifyTokenSaveInput,
    app: tauri::AppHandle,
) -> Result<SpotifyTokenStatus, String> {
    if input.access_token.trim().is_empty() {
        return Err("Spotify access token is required".into());
    }
    if input.token_type.trim().is_empty() {
        return Err("Spotify token type is required".into());
    }
    if input.expires_at.trim().is_empty() {
        return Err("Spotify token expiry is required".into());
    }

    let token = SpotifyCachedToken {
        access_token: input.access_token,
        token_type: input.token_type,
        expires_at: input.expires_at,
        refresh_token: input.refresh_token.filter(|value| !value.trim().is_empty()),
        scope: input.scope.filter(|value| !value.trim().is_empty()),
        saved_at: input.saved_at,
    };

    write_token_cache(&app, &token)?;
    Ok(token_status_from_cached_token(&app, Some(token)))
}

#[tauri::command]
fn spotify_token_load(app: tauri::AppHandle) -> Result<Option<SpotifyCachedToken>, String> {
    read_token_cache(&app)
}

#[tauri::command]
fn spotify_token_status(app: tauri::AppHandle) -> Result<SpotifyTokenStatus, String> {
    Ok(token_status_from_cached_token(
        &app,
        read_token_cache(&app)?,
    ))
}

#[tauri::command]
fn spotify_token_clear(app: tauri::AppHandle) -> Result<SpotifyTokenStatus, String> {
    let path = token_cache_path_buf(&app)?;
    if path.exists() {
        fs::remove_file(&path)
            .map_err(|error| format!("failed to remove Spotify token cache: {error}"))?;
    }

    Ok(token_status_from_cached_token(&app, None))
}

#[tauri::command]
async fn media_session_get_current() -> Result<Option<media_session::ObservedPlayback>, String> {
    media_session::get_current_media_session().await
}

fn main() {
    tauri::Builder::default()
        .manage(SpotifyAuthState::default())
        .invoke_handler(tauri::generate_handler![
            spotify_auth_start,
            spotify_auth_finish,
            spotify_auth_cancel,
            spotify_auth_status,
            spotify_token_save,
            spotify_token_load,
            spotify_token_status,
            spotify_token_clear,
            media_session_get_current
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[derive(Debug, PartialEq, Eq)]
struct ParsedAuthCallback {
    code: String,
    state: Option<String>,
}

fn extract_callback_code_and_state(input: &str) -> Result<ParsedAuthCallback, String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err("Spotify authorization code is required".into());
    }

    if !trimmed.contains("://") {
        return Ok(ParsedAuthCallback {
            code: trimmed.to_string(),
            state: None,
        });
    }

    let query = trimmed
        .split_once('?')
        .map(|(_, rest)| rest)
        .unwrap_or_default()
        .split_once('#')
        .map(|(query, _)| query)
        .unwrap_or_else(|| {
            trimmed
                .split_once('?')
                .map(|(_, rest)| rest)
                .unwrap_or_default()
        });

    let code = query_param(query, "code")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Spotify callback URL did not include a code".to_string())?;
    let state = query_param(query, "state").filter(|value| !value.is_empty());

    Ok(ParsedAuthCallback { code, state })
}

fn query_param(query: &str, key: &str) -> Option<String> {
    query.split('&').find_map(|pair| {
        let (pair_key, pair_value) = pair.split_once('=')?;
        (pair_key == key).then(|| pair_value.to_string())
    })
}

fn token_cache_path(app: &tauri::AppHandle) -> String {
    token_cache_path_buf(app)
        .map(|path| path.display().to_string())
        .unwrap_or_else(|_| "spotify-token.json".into())
}

fn token_cache_path_buf(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    spotify_storage_dir(app).map(|path| path.join("spotify-token.json"))
}

fn ensure_token_cache_dir(app: &tauri::AppHandle) -> Result<(), String> {
    let path = token_cache_path_buf(app)?;
    let parent = path
        .parent()
        .ok_or_else(|| "failed to resolve token cache parent directory".to_string())?;

    fs::create_dir_all(parent)
        .map_err(|error| format!("failed to create Spotify token cache directory: {error}"))
}

fn write_token_cache(app: &tauri::AppHandle, token: &SpotifyCachedToken) -> Result<(), String> {
    ensure_token_cache_dir(app)?;
    let path = token_cache_path_buf(app)?;
    let serialized = serde_json::to_string_pretty(token)
        .map_err(|error| format!("failed to serialize Spotify token cache: {error}"))?;

    fs::write(path, serialized)
        .map_err(|error| format!("failed to write Spotify token cache: {error}"))
}

fn read_token_cache(app: &tauri::AppHandle) -> Result<Option<SpotifyCachedToken>, String> {
    let path = token_cache_path_buf(app)?;
    if !path.exists() {
        return read_legacy_token_cache(app);
    }

    let raw = fs::read_to_string(path)
        .map_err(|error| format!("failed to read Spotify token cache: {error}"))?;
    let token = serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse Spotify token cache: {error}"))?;

    Ok(Some(token))
}

fn read_legacy_token_cache(app: &tauri::AppHandle) -> Result<Option<SpotifyCachedToken>, String> {
    let Some(path) = app
        .path_resolver()
        .app_data_dir()
        .map(|path| path.join("spotify-token.json"))
    else {
        return Ok(None);
    };

    if !path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&path)
        .map_err(|error| format!("failed to read legacy Spotify token cache: {error}"))?;
    let token: SpotifyCachedToken = serde_json::from_str(&raw)
        .map_err(|error| format!("failed to parse legacy Spotify token cache: {error}"))?;

    write_token_cache(app, &token)?;
    Ok(Some(token))
}

fn spotify_storage_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Some(path) = stable_user_data_dir() {
        return Ok(path.join("Trama"));
    }

    app.path_resolver()
        .app_local_data_dir()
        .or_else(|| app.path_resolver().app_data_dir())
        .ok_or_else(|| "failed to resolve Trama storage directory".to_string())
}

fn stable_user_data_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("APPDATA").map(PathBuf::from)
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::env::var_os("HOME").map(|home| PathBuf::from(home).join(".trama"))
    }
}

fn token_status_from_cached_token(
    app: &tauri::AppHandle,
    token: Option<SpotifyCachedToken>,
) -> SpotifyTokenStatus {
    SpotifyTokenStatus {
        authenticated: token.is_some(),
        expires_at: token.as_ref().map(|value| value.expires_at.clone()),
        has_refresh_token: token
            .as_ref()
            .and_then(|value| value.refresh_token.as_ref())
            .is_some_and(|value| !value.trim().is_empty()),
        scope: token.as_ref().and_then(|value| value.scope.clone()),
        token_cache_path: token_cache_path(app),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_raw_code() {
        assert_eq!(
            extract_callback_code_and_state("raw-code").unwrap(),
            ParsedAuthCallback {
                code: "raw-code".into(),
                state: None
            }
        );
    }

    #[test]
    fn parses_callback_code_and_state() {
        assert_eq!(
            extract_callback_code_and_state(
                "http://127.0.0.1:5173/auth/spotify/callback?code=callback-code&state=state-1"
            )
            .unwrap(),
            ParsedAuthCallback {
                code: "callback-code".into(),
                state: Some("state-1".into())
            }
        );
    }

    #[test]
    fn rejects_callback_without_code() {
        assert_eq!(
            extract_callback_code_and_state(
                "http://127.0.0.1:5173/auth/spotify/callback?state=state-1"
            )
            .unwrap_err(),
            "Spotify callback URL did not include a code"
        );
    }
}
