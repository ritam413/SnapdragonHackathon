import os
import sys
from datetime import datetime
from dotenv import load_dotenv

from gmail_client import GmailClient
from ai_extractor import AIExtractor
from telegram_dispatcher import TelegramDispatcher

def main():
    load_dotenv()

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    grok_key = os.getenv("GROK_API_KEY", "")
    kimi_key = os.getenv("KIMI_API_KEY", "")
    qwen_key = os.getenv("QWEN_API_KEY", "")
    custom_key = os.getenv("CUSTOM_AI_API_KEY", "")
    custom_endpoint = os.getenv("CUSTOM_AI_ENDPOINT", "")

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    creds_path = os.getenv("GMAIL_CREDENTIALS_PATH", "credentials.json")
    token_path = os.getenv("GMAIL_TOKEN_PATH", "token.json")

    if not any([gemini_key, grok_key, kimi_key, qwen_key, custom_key]):
        print("ERROR: At least one AI API key (GEMINI, GROK, KIMI, QWEN, or CUSTOM) must be configured in .env")
        sys.exit(1)

    if not bot_token or not chat_id:
        print("ERROR: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID in environment / .env")
        sys.exit(1)

    print("--- Starting Email Opportunity Radar Pipeline ---")
    gmail = GmailClient(credentials_path=creds_path, token_path=token_path)
    extractor = AIExtractor(
        gemini_api_key=gemini_key,
        grok_api_key=grok_key,
        kimi_api_key=kimi_key,
        qwen_api_key=qwen_key,
        custom_ai_key=custom_key,
        custom_endpoint=custom_endpoint
    )
    dispatcher = TelegramDispatcher(bot_token=bot_token, chat_id=chat_id)

    # Fetch recent unread non-spam emails from the last 13 hours
    print("Fetching incoming emails from Gmail...")
    emails = gmail.fetch_recent_emails(hours_back=13, max_results=25)
    print(f"Retrieved {len(emails)} emails for analysis.")

    if not emails:
        print("No new emails found. Exiting.")
        return

    print("Analyzing emails with Multi-AI Cascade...")
    analyzed_data = extractor.analyze_emails(emails)

    now_str = datetime.now().strftime("%I:%M %p, %d %b %Y")
    formatted_sections = dispatcher.format_digest(analyzed_data, now_str)

    if not formatted_sections:
        print("All emails filtered out as spam/promotions. No message sent.")
        return

    print("Dispatching digest sections to Telegram...")
    dispatcher.send_sections(formatted_sections)
    print("Pipeline completed successfully!")

if __name__ == "__main__":
    main()
