import os
import time
import base64
from typing import List, Dict, Any
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

class GmailClient:
    def __init__(self, credentials_path: str = "credentials.json", token_path: str = "token.json"):
        self.credentials_path = credentials_path
        self.token_path = token_path
        self.service = self._authenticate()

    def _authenticate(self):
        creds = None
        if os.path.exists(self.token_path):
            creds = Credentials.from_authorized_user_file(self.token_path, SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                if not os.path.exists(self.credentials_path):
                    raise FileNotFoundError(
                        f"Missing '{self.credentials_path}'. Download OAuth credentials from Google Cloud Console."
                    )
                flow = InstalledAppFlow.from_client_secrets_file(self.credentials_path, SCOPES)
                creds = flow.run_local_server(port=0)
            with open(self.token_path, 'w') as token:
                token.write(creds.to_json())

        return build('gmail', 'v1', credentials=creds)

    def fetch_recent_emails(self, hours_back: int = 13, max_results: int = 25) -> List[Dict[str, Any]]:
        search_after_seconds = int(time.time()) - (hours_back * 3600)
        query = f"after:{search_after_seconds} -in:spam -in:trash -category:promotions -category:social"
        
        results = self.service.users().messages().list(
            userId='me', q=query, maxResults=max_results
        ).execute()
        
        messages = results.get('messages', [])
        if not messages:
            return []

        email_data = []
        for msg_summary in messages:
            msg = self.service.users().messages().get(
                userId='me', id=msg_summary['id'], format='full'
            ).execute()

            headers = msg.get('payload', {}).get('headers', [])
            subject = next((h['value'] for h in headers if h['name'].lower() == 'subject'), '(No Subject)')
            sender = next((h['value'] for h in headers if h['name'].lower() == 'from'), 'Unknown')
            date_str = next((h['value'] for h in headers if h['name'].lower() == 'date'), '')

            body_text = self._extract_body(msg.get('payload', {}))

            email_data.append({
                "id": msg_summary['id'],
                "from": sender,
                "subject": subject,
                "date": date_str,
                "body": body_text[:3000]
            })

        return email_data

    def _extract_body(self, payload: Dict[str, Any]) -> str:
        if 'parts' in payload:
            for part in payload['parts']:
                if part.get('mimeType') == 'text/plain' and 'data' in part.get('body', {}):
                    return base64.urlsafe_b64decode(part['body']['data']).decode('utf-8', errors='ignore')
                elif 'parts' in part:
                    res = self._extract_body(part)
                    if res:
                        return res
        elif 'body' in payload and 'data' in payload['body']:
            return base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8', errors='ignore')
        return ""
