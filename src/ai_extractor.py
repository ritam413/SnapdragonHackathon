import os
import json
import requests
from typing import List, Dict, Any

class AIExtractor:
    def __init__(
        self,
        gemini_api_key: str = "",
        grok_api_key: str = "",
        kimi_api_key: str = "",
        qwen_api_key: str = "",
        custom_ai_key: str = "",
        custom_endpoint: str = ""
    ):
        self.gemini_api_key = gemini_api_key
        self.grok_api_key = grok_api_key
        self.kimi_api_key = kimi_api_key
        self.qwen_api_key = qwen_api_key
        self.custom_ai_key = custom_ai_key
        self.custom_endpoint = custom_endpoint

    def analyze_emails(self, emails: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not emails:
            return {"opportunities": [], "important_notifications": [], "general_updates": []}

        prompt = self._build_prompt(emails)
        providers = []

        # 1. Google Gemini
        if self.gemini_api_key:
            providers.append(("Google Gemini", lambda: self._call_gemini(prompt)))

        # 2. Groq Cloud (Free Tier) or xAI Grok
        if self.grok_api_key:
            is_groq = self.grok_api_key.startswith("gsk_") or not self.grok_api_key.startswith("xai-")
            endpoint = "https://api.groq.com/openai/v1/chat/completions" if is_groq else "https://api.x.ai/v1/chat/completions"
            model = "llama-3.3-70b-versatile" if is_groq else "grok-2-latest"
            name = "Groq Cloud (Llama 3.3 70B)" if is_groq else "xAI Grok"
            providers.append((name, lambda: self._call_openai_compat(
                endpoint, self.grok_api_key, model, prompt
            )))

        # 3. Moonshot Kimi
        if self.kimi_api_key:
            providers.append(("Moonshot Kimi", lambda: self._call_openai_compat(
                "https://api.moonshot.cn/v1/chat/completions", self.kimi_api_key, "moonshot-v1-8k", prompt
            )))

        # 4. Alibaba Qwen
        if self.qwen_api_key:
            providers.append(("Alibaba Qwen", lambda: self._call_openai_compat(
                "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",
                self.qwen_api_key, "qwen-plus", prompt
            )))

        # 5. Custom OpenAI-compatible endpoint
        if self.custom_ai_key and self.custom_endpoint:
            providers.append(("Custom AI", lambda: self._call_openai_compat(
                self.custom_endpoint, self.custom_ai_key, "gpt-4o-mini", prompt
            )))

        # Execute Cascade
        for name, fn in providers:
            print(f"Attempting email triage with provider: {name}...")
            try:
                result = fn()
                if result and (result.get("opportunities") or result.get("important_notifications") or result.get("general_updates")):
                    print(f"Successfully processed with {name}!")
                    return result
            except Exception as e:
                print(f"Provider {name} failed: {e}")

        print("All AI providers failed. Using fallback heuristic.")
        return self._fallback_heuristic(emails)

    def _call_gemini(self, prompt: str) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key={self.gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.1, "responseMimeType": "application/json"}
        }
        res = requests.post(url, json=payload, timeout=20)
        if res.status_code != 200:
            raise RuntimeError(f"Gemini error ({res.status_code}): {res.text}")
        data = res.json()
        raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
        return self._clean_json(raw_text)

    def _call_openai_compat(self, endpoint: str, api_key: str, model: str, prompt: str) -> Dict[str, Any]:
        headers = {"Authorization": f"Bearer {api_key}"}
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a structured email parser. Always output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "response_format": {"type": "json_object"}
        }
        res = requests.post(endpoint, json=payload, headers=headers, timeout=25)
        if res.status_code != 200:
            raise RuntimeError(f"OpenAI endpoint error ({res.status_code}): {res.text}")
        data = res.json()
        raw_text = data["choices"][0]["message"]["content"]
        return self._clean_json(raw_text)

    def _clean_json(self, text: str) -> Dict[str, Any]:
        cleaned = text.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        elif cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        return json.loads(cleaned.strip())

    def _fallback_heuristic(self, emails: List[Dict[str, Any]]) -> Dict[str, Any]:
        opportunities, notifications, updates = [], [], []
        for e in emails:
            text = (e.get("subject", "") + " " + e.get("body", "")).lower()
            if any(k in text for k in ["hackathon", "internship", "hiring", "fellowship", "scholarship"]):
                opportunities.append({
                    "subject": e.get("subject"),
                    "from": e.get("from"),
                    "title": e.get("subject"),
                    "one_line_summary": e.get("subject"),
                    "deadline": "Check email",
                    "mode": "Not Specified",
                    "compensation": "Not Specified",
                    "registration_fee": "Not Specified",
                    "action_link": "N/A"
                })
            elif any(k in text for k in ["google form", "invitation", "confirmation", "congratulation"]):
                notifications.append({
                    "subject": e.get("subject"),
                    "from": e.get("from"),
                    "category_type": "Notification",
                    "one_line_summary": "Automated alert received"
                })
            else:
                updates.append({
                    "subject": e.get("subject"),
                    "from": e.get("from"),
                    "one_line_summary": f"Received from {e.get('from')}"
                })
        return {"opportunities": opportunities, "important_notifications": notifications, "general_updates": updates}

    def _build_prompt(self, emails: List[Dict[str, Any]]) -> str:
        return f"""
You are an intelligent email triage and opportunity analyst.
Analyze the following list of incoming emails.

For EACH email:
1. Determine if it is RELEVANT NON-SPAM (Invitations, Google Form submissions/responses, confirmations, congratulations, deadlines, status updates, newsletters, hackathons, internships, jobs).
2. Categorize into:
   - "OPPORTUNITY" (Hackathons, Competitions, Internships, Hiring, Fellowships)
   - "IMPORTANT_NOTIFICATION" (Google Form Submissions, Event Invitations, Registration Confirmations, Congratulations, Acceptance, Deadlines)
   - "GENERAL_UPDATE" (Important personal/work updates, non-promotional news)

3. For "OPPORTUNITY" emails, EXTRACT:
   - title: Short name of the hackathon/internship/program
   - one_line_summary: 1 crisp punchy line describing what it is
   - deadline: Registration or application deadline (or "Not Mentioned" / "Rolling")
   - mode: "Online", "Offline", "Hybrid", or "Not Specified"
   - compensation: "Paid (stipend amount)", "Unpaid", "Cash Prizes (amount)", or "N/A"
   - registration_fee: "Free", "Paid", or "Not Specified"
   - action_link: Application URL if found (or "N/A")

4. For "IMPORTANT_NOTIFICATION" and "GENERAL_UPDATE":
   - category_type: Specific type (e.g. "Google Form Confirmation", "Invitation", "Congratulations", "Deadline")
   - one_line_summary: 1 clear line summarizing the update.

OUTPUT FORMAT:
Return STRICT JSON ONLY matching:
{{
  "opportunities": [
    {{
      "subject": "...",
      "from": "...",
      "title": "...",
      "one_line_summary": "...",
      "deadline": "...",
      "mode": "...",
      "compensation": "...",
      "registration_fee": "...",
      "action_link": "..."
    }}
  ],
  "important_notifications": [
    {{
      "subject": "...",
      "from": "...",
      "category_type": "...",
      "one_line_summary": "..."
    }}
  ],
  "general_updates": [
    {{
      "subject": "...",
      "from": "...",
      "one_line_summary": "..."
    }}
  ]
}}

Emails:
{json.dumps(emails, indent=2)}
"""
