/**
 * Gmail to Telegram AI Opportunity & Non-Spam Digest
 * 
 * 100% Free Tier Automation running on Google Apps Script
 * Triggers: 11:00 AM & 8:00 PM
 * AI Engine: Google Gemini Flash (Free Tier)
 * Dispatch: Telegram Bot API
 */

// ==========================================
// CONFIGURATION (Set via Script Properties or here)
// ==========================================
const CONFIG = {
  // Telegram Bot Token from @BotFather
  TELEGRAM_BOT_TOKEN: PropertiesService.getScriptProperties().getProperty("TELEGRAM_BOT_TOKEN") || "YOUR_TELEGRAM_BOT_TOKEN",
  
  // Telegram Chat ID (user ID or channel ID)
  TELEGRAM_CHAT_ID: PropertiesService.getScriptProperties().getProperty("TELEGRAM_CHAT_ID") || "YOUR_TELEGRAM_CHAT_ID",
  
  // Preferred AI Provider: "AUTO" (cascades through available keys), "GEMINI", "GROK", "KIMI", "QWEN", "CUSTOM"
  AI_PROVIDER: PropertiesService.getScriptProperties().getProperty("AI_PROVIDER") || "AUTO",

  // --- AI API KEYS & MODELS (Add whatever keys you have) ---
  // 1. Google Gemini (https://aistudio.google.com/)
  GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY") || "",
  GEMINI_MODEL: PropertiesService.getScriptProperties().getProperty("GEMINI_MODEL") || "gemini-3.8-flash",

  // 2. Groq Cloud (100% Free Tier - https://console.groq.com/) or xAI Grok
  GROQ_API_KEY: PropertiesService.getScriptProperties().getProperty("GROQ_API_KEY") || PropertiesService.getScriptProperties().getProperty("GROK_API_KEY") || "",
  GROQ_MODEL: PropertiesService.getScriptProperties().getProperty("GROQ_MODEL") || "llama-3.3-70b-versatile",


  // 3. Moonshot Kimi (https://platform.moonshot.cn/)
  KIMI_API_KEY: PropertiesService.getScriptProperties().getProperty("KIMI_API_KEY") || "",
  KIMI_MODEL: "moonshot-v1-8k",

  // 4. Alibaba Qwen (https://dashscope.aliyun.com/ or https://openrouter.ai/)
  QWEN_API_KEY: PropertiesService.getScriptProperties().getProperty("QWEN_API_KEY") || "",
  QWEN_MODEL: "qwen-plus",
  QWEN_ENDPOINT: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions",

  // 5. Custom / Colab Ollama Endpoint (ngrok / local / OpenAI-compatible)
  CUSTOM_AI_API_KEY: PropertiesService.getScriptProperties().getProperty("CUSTOM_AI_API_KEY") || "ollama",
  CUSTOM_AI_ENDPOINT: PropertiesService.getScriptProperties().getProperty("CUSTOM_AI_ENDPOINT") || "https://importer-item-state.ngrok-free.dev/v1/chat/completions",
  CUSTOM_AI_MODEL: PropertiesService.getScriptProperties().getProperty("CUSTOM_AI_MODEL") || "huihui_ai/qwen2.5-abliterate:14b",


  // Max emails to process per cycle
  MAX_EMAILS_PER_RUN: 25,

  // Overlap window in minutes to prevent Gmail indexing boundary drops
  OVERLAP_BUFFER_MINUTES: 20
};

/**
 * Main Entry Point: Runs on schedule (11 AM & 8 PM)
 */
function runDailyEmailDigest() {
  Logger.log("Starting Hardened Email Opportunity & Digest Pipeline...");
  
  const userProps = PropertiesService.getUserProperties();
  const lastProcessedTimeStr = userProps.getProperty("LAST_PROCESSED_TIMESTAMP");
  const processedIdsJson = userProps.getProperty("PROCESSED_MESSAGE_IDS") || "[]";
  let processedIds = new Set(JSON.parse(processedIdsJson));

  const nowMs = Date.now();
  let searchAfterMs = nowMs - (13 * 60 * 60 * 1000);
  if (lastProcessedTimeStr) {
    searchAfterMs = parseInt(lastProcessedTimeStr, 10) - (CONFIG.OVERLAP_BUFFER_MINUTES * 60 * 1000);
  }

  const searchAfterSeconds = Math.floor(searchAfterMs / 1000);
  const query = `after:${searchAfterSeconds} -in:spam -in:trash -category:promotions -category:social`;
  Logger.log(`Searching Gmail: ${query}`);
  
  const threads = GmailApp.search(query, 0, CONFIG.MAX_EMAILS_PER_RUN);
  if (!threads || threads.length === 0) {
    Logger.log("No new emails found.");
    userProps.setProperty("LAST_PROCESSED_TIMESTAMP", nowMs.toString());
    return;
  }

  let emailsToAnalyze = [];

  for (let i = 0; i < threads.length; i++) {
    const messages = threads[i].getMessages();
    for (let j = 0; j < messages.length; j++) {
      const msg = messages[j];
      const msgId = msg.getId();

      if (processedIds.has(msgId)) {
        continue;
      }

      const from = msg.getFrom();
      const subject = msg.getSubject() || "(No Subject)";
      const cleanBody = sanitizeEmailBody(msg.getPlainBody());

      emailsToAnalyze.push({
        id: msgId,
        from: from,
        subject: subject,
        date: msg.getDate().toISOString(),
        body: cleanBody.substring(0, 2000)
      });
    }
  }

  Logger.log(`Found ${emailsToAnalyze.length} new unique messages.`);

  if (emailsToAnalyze.length === 0) {
    userProps.setProperty("LAST_PROCESSED_TIMESTAMP", nowMs.toString());
    return;
  }

  // Multi-AI Analysis with Automatic Provider Fallback Cascade
  let categorizedResults = analyzeEmailsWithMultiAI(emailsToAnalyze);
  if (!categorizedResults) {
    Logger.log("All AI providers failed. Falling back to heuristic triage.");
    categorizedResults = fallbackHeuristicTriage(emailsToAnalyze);
  }

  // Dispatch Atomic Telegram Sections
  const dispatchSuccess = sendTelegramDigestAtomic(categorizedResults);

  // Update state ONLY if dispatch succeeded
  if (dispatchSuccess) {
    emailsToAnalyze.forEach(e => processedIds.add(e.id));
    const trimmedIds = Array.from(processedIds).slice(-100);
    userProps.setProperty("PROCESSED_MESSAGE_IDS", JSON.stringify(trimmedIds));
    userProps.setProperty("LAST_PROCESSED_TIMESTAMP", nowMs.toString());
    Logger.log("Execution finished and state successfully saved.");
  } else {
    Logger.log("Telegram dispatch failed. Retaining state for next scheduled retry.");
  }
}

/**
 * Cleans base64 image data, stylesheets, and excessive spacing from email body
 */
function sanitizeEmailBody(rawText) {
  if (!rawText) return "";
  return rawText
    .replace(/data:image\/[^;]+;base64,[^\s]+/g, "[Image]")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/https?:\/\/\S+/g, (url) => url.length > 80 ? url.substring(0, 80) + "..." : url)
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Multi-AI Orchestrator: Analyzes emails ONE BY ONE to ensure tiny prompts,
 * avoiding Groq TPM/OTPM rate limits and Colab timeouts.
 */
function analyzeEmailsWithMultiAI(emails) {
  if (!emails || emails.length === 0) return null;

  const result = {
    opportunities: [],
    important_notifications: [],
    general_updates: []
  };

  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    const cleanSubj = (email.subject || "").substring(0, 40);
    Logger.log(`[${i + 1}/${emails.length}] Analyzing email: "${cleanSubj}"...`);
    
    const parsed = analyzeSingleEmail(email);
    
    if (parsed && parsed.category) {
      const cat = (parsed.category || "").toUpperCase();
      if (cat === "OPPORTUNITY") {
        result.opportunities.push({
          subject: email.subject,
          from: email.from,
          title: parsed.title || email.subject,
          one_line_summary: parsed.one_line_summary || email.subject,
          deadline: parsed.deadline || "Not Mentioned",
          mode: parsed.mode || "Not Specified",
          compensation: parsed.compensation || "N/A",
          registration_fee: parsed.registration_fee || "Free",
          action_link: parsed.action_link || "N/A"
        });
      } else if (cat === "IMPORTANT_NOTIFICATION") {
        result.important_notifications.push({
          subject: email.subject,
          from: email.from,
          category_type: parsed.category_type || "Notification",
          one_line_summary: parsed.one_line_summary || email.subject
        });
      } else if (cat === "GENERAL_UPDATE") {
        result.general_updates.push({
          subject: email.subject,
          from: email.from,
          one_line_summary: parsed.one_line_summary || email.subject
        });
      }
      // If "SPAM", silently skipped
    } else {
      // Fallback heuristic for this single email
      const fallback = fallbackHeuristicTriage([email]);
      if (fallback.opportunities.length > 0) result.opportunities.push(...fallback.opportunities);
      if (fallback.important_notifications.length > 0) result.important_notifications.push(...fallback.important_notifications);
      if (fallback.general_updates.length > 0) result.general_updates.push(...fallback.general_updates);
    }
  }

  return result;
}

/**
 * Classifies a single email with AI fallback cascade (Gemini -> Groq -> Colab -> Heuristic)
 */
function analyzeSingleEmail(email) {
  const prompt = `You are a strict, ultra-concise email triage classifier.
Analyze this single email:
FROM: ${email.from}
SUBJECT: ${email.subject}
BODY: ${(email.body || "").substring(0, 350)}

CATEGORIES:
- "OPPORTUNITY": Hackathons, Competitions, Internships, Jobs, Fellowships, Grants
- "IMPORTANT_NOTIFICATION": Google Form Submissions/Responses, Event Invites, Registration Confirmations, Status updates, Deadlines
- "GENERAL_UPDATE": Work/Personal updates, non-promotional news
- "SPAM": Promotional ads, marketing newsletters, junk, automated system receipts

Return STRICT JSON ONLY:
{
  "category": "OPPORTUNITY" | "IMPORTANT_NOTIFICATION" | "GENERAL_UPDATE" | "SPAM",
  "title": "Short name/title",
  "one_line_summary": "1 punchy line explaining the update",
  "deadline": "Date or N/A",
  "mode": "Online" | "Offline" | "Hybrid" | "N/A",
  "compensation": "Paid" | "Unpaid" | "Prizes" | "N/A",
  "registration_fee": "Free" | "Paid" | "N/A",
  "action_link": "URL or N/A",
  "category_type": "Specific type (e.g. Google Form Confirmation)"
}`;

  const providers = [];

  // 1. Colab / Custom Ollama Qwen (if configured as primary or in auto)
  if (CONFIG.AI_PROVIDER === "COLAB" || CONFIG.AI_PROVIDER === "CUSTOM" || CONFIG.AI_PROVIDER === "QWEN" || (CONFIG.AI_PROVIDER === "AUTO" && CONFIG.CUSTOM_AI_ENDPOINT)) {
    providers.push({
      name: "Colab Ollama Qwen",
      fn: () => callOpenAICompatible(CONFIG.CUSTOM_AI_ENDPOINT, CONFIG.CUSTOM_AI_API_KEY, CONFIG.CUSTOM_AI_MODEL, prompt)
    });
  }

  // 2. Groq Cloud (Free Tier)
  if (CONFIG.AI_PROVIDER === "GROQ" || CONFIG.AI_PROVIDER === "GROK" || CONFIG.AI_PROVIDER === "AUTO") {
    if (CONFIG.GROQ_API_KEY) {
      providers.push({
        name: "Groq Cloud",
        fn: () => callGroqDynamic(CONFIG.GROQ_API_KEY, prompt)
      });
    }
  }

  // 3. Google Gemini
  if (CONFIG.AI_PROVIDER === "GEMINI" || (CONFIG.AI_PROVIDER === "AUTO" && CONFIG.GEMINI_API_KEY)) {
    providers.push({
      name: "Google Gemini",
      fn: () => callGemini(prompt)
    });
  }

  for (let i = 0; i < providers.length; i++) {
    const provider = providers[i];
    try {
      const result = provider.fn();
      if (result && result.category) {
        return result;
      }
    } catch (e) {
      Logger.log(`${provider.name} failed on single email: ` + e.toString());
    }
  }

  return null;
}


/**
 * 1. Google Gemini Caller
 */
function callGemini(prompt) {
  if (!CONFIG.GEMINI_API_KEY) return null;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${CONFIG.GEMINI_MODEL}:generateContent?key=${CONFIG.GEMINI_API_KEY}`;
  
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: "application/json"
    }
  };

  const response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    Logger.log("Gemini Error: " + response.getContentText());
    return null;
  }
  const data = JSON.parse(response.getContentText());
  const textOutput = data.candidates[0].content.parts[0].text;
  return cleanAndParseJson(textOutput);
}

/**
 * 2. Generic OpenAI-Compatible Caller (Works for Grok, Kimi, Qwen, DeepSeek, OpenAI)
 */
function callOpenAICompatible(endpoint, apiKey, model, prompt) {
  const payload = {
    model: model,
    messages: [
      { role: "system", content: "You are a structured email parser. Always output valid JSON only." },
      { role: "user", content: prompt }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  };

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    "User-Agent": "GmailDigestBot"
  };
  if (apiKey) {
    headers["Authorization"] = "Bearer " + apiKey;
  }

  const response = UrlFetchApp.fetch(endpoint, {
    method: "post",
    contentType: "application/json",
    headers: headers,
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    Logger.log(`OpenAI API (${endpoint}) Error: ` + response.getContentText());
    return null;
  }

  const data = JSON.parse(response.getContentText());
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return cleanAndParseJson(data.choices[0].message.content);
  }
  return null;
}

/**
 * Dynamic Groq Caller: Automatically discovers and uses live active Groq models
 */
function callGroqDynamic(apiKey, prompt) {
  if (!apiKey) return null;
  
  let candidateModels = [];
  try {
    const listRes = UrlFetchApp.fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": "Bearer " + apiKey },
      muteHttpExceptions: true
    });
    if (listRes.getResponseCode() === 200) {
      const data = JSON.parse(listRes.getContentText());
      if (data.data && Array.isArray(data.data)) {
        candidateModels = data.data
          .map(m => m.id)
          .filter(id => !id.includes("whisper") && !id.includes("guard") && !id.includes("tts") && !id.includes("vision") && !id.includes("canopylabs") && !id.includes("orpheus"))
          .sort((a, b) => {
            // Prioritize fast 20b / 27b / 8b models over heavy 120b models
            const score = id => (id.includes("20b") || id.includes("27b") || id.includes("8b") || id.includes("7b")) ? 0 : 1;
            return score(a) - score(b);
          });
        Logger.log(`Found ${candidateModels.length} active Groq chat models: ` + candidateModels.join(", "));
      }
    }
  } catch (e) {
    Logger.log("Failed querying Groq models endpoint: " + e);
  }

  // Fallback candidate list if dynamic listing fails
  if (candidateModels.length === 0) {
    candidateModels = [
      CONFIG.GROQ_MODEL,
      "llama-3.1-8b-instant",
      "llama3-70b-8192",
      "llama3-8b-8192",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
      "qwen-2.5-32b",
      "deepseek-r1-distill-llama-70b"
    ];
  }

  for (let i = 0; i < candidateModels.length; i++) {
    const model = candidateModels[i];
    try {
      const result = callOpenAICompatible("https://api.groq.com/openai/v1/chat/completions", apiKey, model, prompt);
      if (result) {
        Logger.log(`Groq succeeded using model: ${model}`);
        return result;
      }
    } catch (err) {
      Logger.log(`Groq model '${model}' failed: ` + err.toString());
    }
  }
  return null;
}

/**
 * Utility: Lists all active Groq models for your API key in the Apps Script Logger
 */
function listMyGroqModels() {
  const apiKey = CONFIG.GROQ_API_KEY;
  if (!apiKey) {
    Logger.log("No GROQ_API_KEY set in Script Properties.");
    return;
  }
  const res = UrlFetchApp.fetch("https://api.groq.com/openai/v1/models", {
    headers: { "Authorization": "Bearer " + apiKey },
    muteHttpExceptions: true
  });
  Logger.log("Status: " + res.getResponseCode());
  Logger.log("Response: " + res.getContentText());
}


function cleanAndParseJson(text) {
  if (!text) return null;
  // Remove markdown code fences if model enclosed them
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

/**
 * Fallback heuristic classifier if Gemini API is unreachable
 */
function fallbackHeuristicTriage(emails) {
  const opportunities = [];
  const notifications = [];
  const generalUpdates = [];

  emails.forEach(e => {
    const text = (e.subject + " " + e.body).toLowerCase();
    if (text.includes("hackathon") || text.includes("internship") || text.includes("hiring") || text.includes("fellowship")) {
      opportunities.push({
        title: e.subject,
        one_line_summary: e.subject,
        deadline: "Check email body",
        mode: "Not Specified",
        compensation: "Not Specified",
        registration_fee: "Not Specified",
        action_link: "N/A"
      });
    } else if (text.includes("google form") || text.includes("invitation") || text.includes("congratulation") || text.includes("confirmation")) {
      notifications.push({
        subject: e.subject,
        from: e.from,
        category_type: "Notification",
        one_line_summary: "Automated alert received."
      });
    } else {
      generalUpdates.push({
        subject: e.subject,
        from: e.from,
        one_line_summary: "Received from " + e.from
      });
    }
  });

  return { opportunities, important_notifications: notifications, general_updates: generalUpdates };
}

function dispatchDigestToTelegram(data) {
  return sendTelegramDigestAtomic(data);
}

/**
 * Dispatches atomic self-contained sections to Telegram (Guarantees no broken HTML tags)
 */
function sendTelegramDigestAtomic(data) {
  if (!data) return false;

  const opportunities = data.opportunities || [];
  const notifications = data.important_notifications || [];
  const generalUpdates = data.general_updates || [];

  if (opportunities.length === 0 && notifications.length === 0 && generalUpdates.length === 0) {
    Logger.log("No relevant emails to dispatch.");
    return true;
  }

  const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "hh:mm a, dd MMM yyyy");
  
  // Header
  let headerMsg = `📬 <b>EMAIL DIGEST &amp; OPPORTUNITY RADAR</b>\n`;
  headerMsg += `🕒 <i>Trigger: ${timeStr}</i>\n`;
  headerMsg += `━━━━━━━━━━━━━━━━━━━━━`;
  postTelegram(headerMsg);

  // 1. Opportunities Section (Dispatched atomically)
  if (opportunities.length > 0) {
    let oppMsg = `🚀 <b><u>NEW OPPORTUNITIES (${opportunities.length})</u></b>\n\n`;
    opportunities.forEach((opp, idx) => {
      oppMsg += `<b>${idx + 1}. ${escapeHtml(opp.title || opp.subject)}</b>\n`;
      oppMsg += `📝 <b>Summary:</b> ${escapeHtml(opp.one_line_summary)}\n`;
      oppMsg += `⏰ <b>Deadline:</b> <code>${escapeHtml(opp.deadline)}</code>\n`;
      oppMsg += `📍 <b>Mode:</b> ${escapeHtml(opp.mode)} | 💰 <b>Reward:</b> ${escapeHtml(opp.compensation)}\n`;
      oppMsg += `🎟 <b>Fee:</b> ${escapeHtml(opp.registration_fee)}\n`;
      if (opp.action_link && opp.action_link !== "N/A" && opp.action_link.startsWith("http")) {
        oppMsg += `🔗 <a href="${escapeHtml(opp.action_link)}">Apply / View Details</a>\n`;
      }
      oppMsg += `\n`;
    });
    postTelegram(oppMsg);
  }

  // 2. Notifications & Confirmations Section
  if (notifications.length > 0) {
    let notifMsg = `🔔 <b><u>NOTIFICATIONS &amp; CONFIRMATIONS (${notifications.length})</u></b>\n\n`;
    notifications.forEach((item) => {
      notifMsg += `• <b>[${escapeHtml(item.category_type || "Notice")}]</b> ${escapeHtml(item.subject)}\n`;
      notifMsg += `  ↳ <i>${escapeHtml(item.one_line_summary)}</i>\n`;
      notifMsg += `  👤 <small>From: ${escapeHtml(item.from)}</small>\n\n`;
    });
    postTelegram(notifMsg);
  }

  // 3. General Updates Section
  if (generalUpdates.length > 0) {
    let genMsg = `📋 <b><u>GENERAL UPDATES (${generalUpdates.length})</u></b>\n\n`;
    generalUpdates.forEach((item) => {
      genMsg += `• <b>${escapeHtml(item.subject)}:</b> ${escapeHtml(item.one_line_summary)}\n`;
    });
    postTelegram(genMsg);
  }

  return true;
}

function postTelegram(text) {
  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = {
    chat_id: CONFIG.TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    const res = UrlFetchApp.fetch(url, options);
    return res.getResponseCode() === 200;
  } catch (e) {
    Logger.log("Telegram delivery error: " + e.toString());
    return false;
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function setupDailyTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "runDailyEmailDigest") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger("runDailyEmailDigest")
    .timeBased()
    .atHour(11)
    .everyDays(1)
    .create();

  ScriptApp.newTrigger("runDailyEmailDigest")
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .create();

  Logger.log("Installed triggers for 11:00 AM & 8:00 PM IST.");
}

function resetMemoryAndProcessPast24Hours() {
  PropertiesService.getUserProperties().deleteAllProperties();
  Logger.log("Memory wiped. Running pipeline for past 24 hours...");
  runDailyEmailDigest();
}

/**
 * Direct Test: Fetches recent emails from past 7 days (ignoring saved timestamps)
 */
function testProcessRecentEmails() {
  PropertiesService.getUserProperties().deleteAllProperties();
  
  // Search past 7 days, excluding spam and trash
  const query = "newer_than:7d -in:spam -in:trash";
  Logger.log(`Searching Gmail with query: ${query}`);
  
  const threads = GmailApp.search(query, 0, 15);
  Logger.log(`Found ${threads.length} threads in inbox.`);
  
  if (threads.length === 0) {
    Logger.log("No emails found in past 7 days matching query.");
    return;
  }
  
  let emailsToAnalyze = [];
  for (let i = 0; i < threads.length; i++) {
    const msg = threads[i].getMessages()[0];
    emailsToAnalyze.push({
      id: msg.getId(),
      from: msg.getFrom(),
      subject: msg.getSubject() || "(No Subject)",
      date: msg.getDate().toISOString(),
      body: sanitizeEmailBody(msg.getPlainBody()).substring(0, 350)
    });
  }
  
  Logger.log(`Extracted ${emailsToAnalyze.length} emails. Starting AI analysis...`);
  const categorized = analyzeEmailsWithMultiAI(emailsToAnalyze) || fallbackHeuristicTriage(emailsToAnalyze);
  
  Logger.log("Dispatching digest to Telegram...");
  dispatchDigestToTelegram(categorized);
  Logger.log("Test finished!");
}

/**
 * Direct Test: Sends a sample test email directly to your Google Colab Qwen server
 */
function testColabQwen() {
  const sampleEmail = {
    id: "colab_test_1",
    from: "hackathons@ai-nexus.org",
    subject: "AI Innovators Hackathon 2026 - $25,000 Prize Pool",
    body: "We invite you to participate in the Global AI Innovators Hackathon. Online event. Free entry. Deadline: November 15, 2026. Apply at https://ai-nexus.org/apply"
  };
  
  Logger.log("Testing Colab Qwen with 1 sample email...");
  const result = analyzeSingleEmail(sampleEmail);
  
  if (result) {
    Logger.log("SUCCESS! Result: " + JSON.stringify(result, null, 2));
    const digest = {
      opportunities: [result],
      important_notifications: [],
      general_updates: []
    };
    dispatchDigestToTelegram(digest);
  } else {
    Logger.log("FAILED to get valid response.");
  }
}





