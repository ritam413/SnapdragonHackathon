# Gmail to Telegram AI Opportunity & Digest Automation — Context

## Project Purpose
An automated daily pipeline that triggers twice a day (11:00 AM & 8:00 PM) to inspect incoming Gmail messages, filter out spam/promotional noise, categorize essential notifications (invitations, form submissions, confirmations, deadlines), and perform AI parsing on opportunity emails (hackathons, internships, hiring) to extract structured fields (deadline, online/offline, stipend/paid, registration fee) before sending a clean formatted digest to Telegram.

## Architecture & Options
1. **Google Apps Script (GAS) Serverless Engine (Recommended & 100% Free)**:
   - **Trigger**: Native GAS Time-driven triggers (11:00 AM and 8:00 PM IST/local).
   - **Gmail Engine**: Native `GmailApp` API (no OAuth refresh token expiration or server hosting required).
   - **Multi-AI Parser Engine**: Automatic fallback cascade supporting:
     - Google Gemini (`gemini-2.0-flash` / free tier)
     - xAI Grok (`grok-2-latest` / `https://api.x.ai/v1`)
     - Moonshot Kimi (`moonshot-v1-8k` / `https://api.moonshot.cn/v1`)
     - Alibaba Qwen (`qwen-plus` / DashScope / OpenRouter)
     - Any custom OpenAI-compatible endpoint.
   - **Telegram Dispatcher**: Telegram Bot API with atomic section dispatching and HTML escaping.
   - **State Persistence**: `PropertiesService` to keep track of the last processed email timestamp and message ID deduplication set.

2. **Python Modular Engine**:
   - `src/gmail_client.py`: Fetches and filters messages from Gmail API.
   - `src/ai_extractor.py`: Structured prompt extraction using Google Gemini API (`google-genai` / `google-generativeai`).
   - `src/telegram_bot.py`: Formats messages and sends them to a target chat/channel.
   - `src/main.py`: Orchestrator script callable via Windows Task Scheduler or GitHub Actions cron.

## Constraints & Free Tier Boundaries
- Zero-cost architecture: Google Apps Script / GitHub Actions + Gemini Free API + Telegram Bot API.
- Rate limits: Gemini free tier accommodates 15 RPM, well above the 5-20 email threshold per digest cycle.
