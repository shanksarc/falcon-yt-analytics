import os
import json
from typing import Dict, Any, List, Optional
from database import get_connection

# Map setting keys to environment variable names for persistence on Vercel
_ENV_VAR_MAP = {
    "youtube_api_key": "FALCON_YT_API_KEY",
    "channel_id": "FALCON_CHANNEL_ID",
    "oauth_client_id": "FALCON_OAUTH_CLIENT_ID",
    "oauth_client_secret": "FALCON_OAUTH_CLIENT_SECRET",
    "youtube_oauth_credentials": "FALCON_OAUTH_CREDENTIALS",
    "admin_passcode": "FALCON_ADMIN_PASSWORD",
}

class YouTubeClient:
    def __init__(self):
        self.api_key = self.get_setting("youtube_api_key")
        self.oauth_credentials = self.get_setting("youtube_oauth_credentials")

    def get_setting(self, key: str) -> Optional[str]:
        """Read a setting, checking env vars first for critical credentials."""
        # For critical keys, check environment variable first (survives Vercel cold starts)
        env_key = _ENV_VAR_MAP.get(key)
        if env_key:
            env_val = os.environ.get(env_key, "").strip()
            if env_val:
                return env_val

        # Support aliases for admin_passcode / password
        if key == "admin_passcode":
            for env_name in ("FALCON_ADMIN_PASSWORD", "FALCON_ADMIN_PASSCODE", "FALCON_ADMIN_KEY"):
                val = os.environ.get(env_name, "").strip()
                if val:
                    return val

        # Fall back to DB
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            conn.close()
            return row["value"] if row else None
        except Exception:
            return None

    def save_setting(self, key: str, value: str):
        """Persist a setting to the DB."""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO settings (key, value) VALUES (?, ?)
                ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """, (key, value))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Warning: could not save setting '{key}': {e}")

    def get_auth_status(self) -> Dict[str, Any]:
        api_key = self.get_setting("youtube_api_key")
        oauth = self.get_setting("youtube_oauth_credentials")
        channel_id = self.get_setting("channel_id") or "UC_falcon_edufin"

        return {
            "has_api_key": bool(api_key and len(api_key.strip()) > 0),
            "has_oauth": bool(oauth and len(oauth.strip()) > 0),
            "channel_id": channel_id,
            "demo_mode": not bool(api_key and oauth)
        }

    def get_oauth_credentials(self):
        """Loads, auto-refreshes if expired, and returns google.oauth2.credentials.Credentials or None."""
        creds_str = self.get_setting("youtube_oauth_credentials")
        if not creds_str or not creds_str.strip():
            return None
        try:
            from google.oauth2.credentials import Credentials
            creds_data = json.loads(creds_str)
            creds = Credentials(
                token=creds_data.get("token"),
                refresh_token=creds_data.get("refresh_token"),
                token_uri=creds_data.get("token_uri", "https://oauth2.googleapis.com/token"),
                client_id=creds_data.get("client_id"),
                client_secret=creds_data.get("client_secret"),
                scopes=creds_data.get("scopes")
            )
            # Auto-refresh if expired (access tokens expire after ~1 hour)
            if creds.expired or not creds.token:
                if creds.refresh_token:
                    import google.auth.transport.requests
                    creds.refresh(google.auth.transport.requests.Request())
                    self._save_credentials_obj(creds)
                    print("OAuth access token refreshed successfully.")
                else:
                    print("OAuth token expired and no refresh token available. User must reconnect.")
                    return None
            return creds
        except Exception as e:
            print(f"Error loading/refreshing OAuth credentials: {e}")
            return None

    def _save_credentials_obj(self, creds):
        """Serialise and persist a refreshed Credentials object back to the DB."""
        try:
            expiry_val = getattr(creds, "expiry", None)
            creds_data = {
                "token": creds.token,
                "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri,
                "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "scopes": list(creds.scopes) if creds.scopes else None,
                "expiry": expiry_val.isoformat() if expiry_val else None,
            }
            self.save_setting("youtube_oauth_credentials", json.dumps(creds_data))
        except Exception as e:
            print(f"Warning: could not save refreshed OAuth credentials: {e}")

    def get_analytics_service(self):
        """Returns authenticated YouTube Analytics API v2 service resource or None."""
        creds = self.get_oauth_credentials()
        if not creds:
            return None
        try:
            from googleapiclient.discovery import build
            return build("youtubeAnalytics", "v2", credentials=creds)
        except Exception as e:
            print(f"Error building YouTube Analytics service: {e}")
            return None

    def fetch_public_channel_videos(self, channel_id: str) -> List[Dict[str, Any]]:
        """
        Calls YouTube Data API v3 to fetch videos if API key is provided,
        or returns empty list if in offline demo mode.
        """
        api_key = self.get_setting("youtube_api_key")
        if not api_key:
            return []
            
        try:
            from googleapiclient.discovery import build
            youtube = build("youtube", "v3", developerKey=api_key)
            
            # Fetch channel uploads playlist
            ch_resp = youtube.channels().list(part="contentDetails,statistics,snippet", id=channel_id).execute()
            items = ch_resp.get("items", [])
            if not items:
                return []
            uploads_id = items[0]["contentDetails"]["relatedPlaylists"]["uploads"]
            
            # Fetch playlist videos
            pl_resp = youtube.playlistItems().list(
                part="snippet",
                playlistId=uploads_id,
                maxResults=50
            ).execute()

            video_ids = [item["snippet"]["resourceId"]["videoId"] for item in pl_resp.get("items", [])]
            if not video_ids:
                return []

            # Fetch video stats
            v_resp = youtube.videos().list(
                part="snippet,statistics,contentDetails",
                id=",".join(video_ids)
            ).execute()

            results = []
            for item in v_resp.get("items", []):
                stats = item.get("statistics", {})
                snip = item.get("snippet", {})
                results.append({
                    "id": item["id"],
                    "title": snip.get("title"),
                    "description": snip.get("description"),
                    "published_at": snip.get("publishedAt"),
                    "views": int(stats.get("viewCount", 0)),
                    "likes": int(stats.get("likeCount", 0)),
                    "comments": int(stats.get("commentCount", 0)),
                    "thumbnail_url": snip.get("thumbnails", {}).get("high", {}).get("url", "")
                })
            return results
        except Exception as e:
            print(f"Error calling YouTube Data API: {e}")
            return []
