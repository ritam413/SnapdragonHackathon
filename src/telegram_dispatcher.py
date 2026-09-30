import html
import requests
from typing import Dict, Any, List

class TelegramDispatcher:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.api_url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"

    def format_digest(self, data: Dict[str, Any], trigger_time: str) -> str:
        opportunities: List[Dict[str, Any]] = data.get("opportunities", [])
        notifications: List[Dict[str, Any]] = data.get("important_notifications", [])
        general_updates: List[Dict[str, Any]] = data.get("general_updates", [])

        if not opportunities and not notifications and not general_updates:
            return ""

        return {
            "header": f"📬 <b>EMAIL DIGEST &amp; OPPORTUNITY RADAR</b>\n🕒 <i>Trigger: {trigger_time}</i>\n━━━━━━━━━━━━━━━━━━━━━",
            "opportunities": self._format_opportunities(opportunities),
            "notifications": self._format_notifications(notifications),
            "general_updates": self._format_general_updates(general_updates)
        }

    def _format_opportunities(self, opportunities: List[Dict[str, Any]]) -> str:
        if not opportunities:
            return ""
        msg = f"🚀 <b><u>NEW OPPORTUNITIES ({len(opportunities)})</u></b>\n\n"
        for idx, opp in enumerate(opportunities, 1):
            title = html.escape(opp.get("title") or opp.get("subject", "Opportunity"))
            summary = html.escape(opp.get("one_line_summary", ""))
            deadline = html.escape(opp.get("deadline", "Not Mentioned"))
            mode = html.escape(opp.get("mode", "N/A"))
            comp = html.escape(opp.get("compensation", "N/A"))
            fee = html.escape(opp.get("registration_fee", "N/A"))
            link = opp.get("action_link", "")

            msg += f"<b>{idx}. {title}</b>\n"
            msg += f"📝 <b>Summary:</b> {summary}\n"
            msg += f"⏰ <b>Deadline:</b> <code>{deadline}</code>\n"
            msg += f"📍 <b>Mode:</b> {mode} | 💰 <b>Reward:</b> {comp}\n"
            msg += f"🎟 <b>Fee:</b> {fee}\n"
            if link and link.startswith("http"):
                msg += f"🔗 <a href='{html.escape(link)}'>Apply / View Details</a>\n"
            msg += "\n"
        return msg

    def _format_notifications(self, notifications: List[Dict[str, Any]]) -> str:
        if not notifications:
            return ""
        msg = f"🔔 <b><u>NOTIFICATIONS &amp; CONFIRMATIONS ({len(notifications)})</u></b>\n\n"
        for item in notifications:
            category = html.escape(item.get("category_type", "Notice"))
            subject = html.escape(item.get("subject", ""))
            summary = html.escape(item.get("one_line_summary", ""))
            sender = html.escape(item.get("from", ""))

            msg += f"• <b>[{category}]</b> {subject}\n"
            msg += f"  ↳ <i>{summary}</i>\n"
            msg += f"  👤 <small>From: {sender}</small>\n\n"
        return msg

    def _format_general_updates(self, general_updates: List[Dict[str, Any]]) -> str:
        if not general_updates:
            return ""
        msg = f"📋 <b><u>GENERAL UPDATES ({len(general_updates)})</u></b>\n\n"
        for item in general_updates:
            subject = html.escape(item.get("subject", ""))
            summary = html.escape(item.get("one_line_summary", ""))
            msg += f"• <b>{subject}:</b> {summary}\n"
        return msg

    def send_sections(self, sections: Dict[str, str]):
        for key in ["header", "opportunities", "notifications", "general_updates"]:
            content = sections.get(key, "").strip()
            if content:
                self._send_raw(content)

    def _send_raw(self, chunk: str):
        payload = {
            "chat_id": self.chat_id,
            "text": chunk,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        try:
            res = requests.post(self.api_url, json=payload, timeout=10)
            if res.status_code != 200:
                print(f"Failed to send Telegram message ({res.status_code}): {res.text}")
            else:
                print("Delivered section to Telegram.")
        except Exception as e:
            print(f"Telegram network error: {e}")
