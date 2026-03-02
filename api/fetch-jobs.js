/**
 * TeachHire — Live Job Fetcher
 * Vercel Serverless Function: /api/fetch-jobs
 *
 * Fetches teaching jobs from Indian govt sources:
 *   1. Employment News RSS (education category)
 *   2. KVS Recruitment page
 *   3. NVS Recruitment page
 *   4. UGC / NTA Notifications
 *   5. NCS Portal (National Career Service)
 *
 * All parsing is done server-side to avoid CORS issues.
 * Returns a standardised job array + per-source health status.
 */

const SOURCES = [
  {
    id: "employment_news",
    name: "Employment News",
    icon: "📰",
    url: "https://www.employmentnews.gov.in/RSS/rss_edu.aspx",
    type: "rss",
    category: "Central Govt",
  },
  {
    id: "kvs",
    name: "Kendriya Vidyalaya (KVS)",
    icon: "🏫",
    url: "https://kvsangathan.nic.in/en/recruitment-notification",
    type: "html",
    category: "Central Govt",
  },
  {
    id: "nvs",
    name: "Navodaya Vidyalaya (NVS)",
    icon: "📘",
    url: "https://navodaya.gov.in/nvs/recruitment/en",
    type: "html",
    category: "Central Govt",
  },
  {
    id: "ugc",
    name: "UGC / NTA",
    icon: "🏛️",
    url: "https://ugcnetonline.in/notifications.php",
    type: "html",
    category: "Central Govt",
  },
  {
    id: "ncs",
    name: "NCS Portal (Govt of India)",
    icon: "🇮🇳",
    url: "https://www.ncs.gov.in/jobsearch/SearchResult.aspx?q=teacher&loc=India",
    type: "html",
    category: "National Portal",
  },
  {
    id: "aicte",
    name: "AICTE",
    icon: "⚙️",
    url: "https://www.aicte-india.org/opportunities/recruitment",
    type: "html",
    category: "Central Govt",
  },
  {
    id: "dsssb",
    name: "DSSSB Delhi",
    icon: "🏙️",
    url: "https://dsssb.delhi.gov.in/recruitment",
    type: "html",
    category: "State Govt",
  },
];

// ─── FETCH HELPERS ──────────────────────────────────────────────────────────

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function safeFetch(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

// ─── RSS PARSER ─────────────────────────────────────────────────────────────

function parseRSS(xml, source) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m =
        block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>`, "i")) ||
        block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? m[1].trim() : "";
    };
    const title = get("title");
    const link = get("link") || get("guid");
    const description = get("description").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const pubDate = get("pubDate");

    if (!title) continue;

    // Filter for teaching-related posts
    const teachKeywords = [
      "teacher","professor","lecturer","faculty","tutor","principal",
      "headmaster","librarian","pgt","tgt","prt","jrf","srf","fellow",
      "instructor","education","school","college","university","vidyalaya",
      "kendriya","navodaya","teaching","academic","research","assistant",
    ];
    const lowerTitle = title.toLowerCase() + " " + description.toLowerCase();
    if (!teachKeywords.some((kw) => lowerTitle.includes(kw))) continue;

    // Try to extract deadline from description
    const deadlineMatch = description.match(
      /(?:last date|deadline|closing date)[:\s]*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/i
    );

    items.push({
      id: `${source.id}_${Date.now()}_${items.length}`,
      title: decodeHtml(title),
      institution: inferInstitution(title, description, source.name),
      description: description.slice(0, 500),
      source_url: link || source.url,
      source_site: source.id,
      source_name: source.name,
      scraped_at: new Date().toISOString(),
      published_at: pubDate,
      deadline: deadlineMatch ? parseDate(deadlineMatch[1]) : estimateDeadline(),
      status: "pending_review",
      categories: inferCategories(title + " " + description),
      subjects: inferSubjects(title + " " + description),
      states: inferStates(title + " " + description),
      cities: [],
      ownership: "Government",
      employmentType: inferEmploymentType(title),
      academicLevel: inferAcademicLevel(title),
      salaryMin: 0,
      salaryMax: 0,
      vacancies: inferVacancies(title + " " + description),
    });
  }
  return items;
}

// ─── HTML PARSERS ────────────────────────────────────────────────────────────

function parseKVS(html) {
  const jobs = [];
  // KVS lists notifications as table rows or list items
  const rowRegex =
    /<(?:tr|li)[^>]*>([\s\S]*?)<\/(?:tr|li)>/gi;
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i;
  let match;
  while ((match = rowRegex.exec(html)) !== null) {
    const cell = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!cell || cell.length < 10) continue;
    const lm = linkRegex.exec(match[1]);
    const title = cell.slice(0, 200);
    if (!isTeachingJob(title)) continue;
    const deadlineMatch = cell.match(
      /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/
    );
    jobs.push({
      id: `kvs_${Date.now()}_${jobs.length}`,
      title: title.slice(0, 150),
      institution: "Kendriya Vidyalaya Sangathan (KVS)",
      description: cell,
      source_url: lm
        ? resolveUrl("https://kvsangathan.nic.in", lm[1])
        : "https://kvsangathan.nic.in/en/recruitment-notification",
      source_site: "kvs",
      source_name: "KVS",
      scraped_at: new Date().toISOString(),
      deadline: deadlineMatch ? parseDate(deadlineMatch[1]) : estimateDeadline(),
      status: "pending_review",
      categories: ["school"],
      subjects: inferSubjects(title),
      states: ["Delhi"],
      cities: [],
      ownership: "Government",
      employmentType: "Full-time",
      academicLevel: inferAcademicLevel(title),
      salaryMin: 35000,
      salaryMax: 80000,
      vacancies: inferVacancies(title),
    });
    if (jobs.length >= 15) break;
  }
  return jobs;
}

function parseNVS(html) {
  const jobs = [];
  const linkRegex = /<a[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 15 || !isTeachingJob(text)) continue;
    const deadlineMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    jobs.push({
      id: `nvs_${Date.now()}_${jobs.length}`,
      title: text.slice(0, 150),
      institution: "Navodaya Vidyalaya Samiti (NVS)",
      description: text,
      source_url: resolveUrl("https://navodaya.gov.in", match[1]),
      source_site: "nvs",
      source_name: "NVS",
      scraped_at: new Date().toISOString(),
      deadline: deadlineMatch ? parseDate(deadlineMatch[1]) : estimateDeadline(),
      status: "pending_review",
      categories: ["school"],
      subjects: inferSubjects(text),
      states: [],
      cities: [],
      ownership: "Government",
      employmentType: "Full-time",
      academicLevel: inferAcademicLevel(text),
      salaryMin: 35000,
      salaryMax: 75000,
      vacancies: inferVacancies(text),
    });
    if (jobs.length >= 15) break;
  }
  return jobs;
}

function parseUGC(html) {
  const jobs = [];
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 15 || !isTeachingJob(text)) continue;
    jobs.push({
      id: `ugc_${Date.now()}_${jobs.length}`,
      title: text.slice(0, 150),
      institution: "UGC / NTA",
      description: text,
      source_url: resolveUrl("https://ugcnetonline.in", match[1]),
      source_site: "ugc",
      source_name: "UGC/NTA",
      scraped_at: new Date().toISOString(),
      deadline: estimateDeadline(),
      status: "pending_review",
      categories: inferCategories(text),
      subjects: inferSubjects(text),
      states: [],
      cities: [],
      ownership: "Government",
      employmentType: inferEmploymentType(text),
      academicLevel: inferAcademicLevel(text),
      salaryMin: 0,
      salaryMax: 0,
      vacancies: inferVacancies(text),
    });
    if (jobs.length >= 20) break;
  }
  return jobs;
}

function parseGenericHTML(html, source) {
  const jobs = [];
  // Generic: find all links with job-like titles
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 20 || !isTeachingJob(text)) continue;
    const deadlineMatch = text.match(/(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/);
    jobs.push({
      id: `${source.id}_${Date.now()}_${jobs.length}`,
      title: text.slice(0, 150),
      institution: source.name,
      description: text,
      source_url: resolveUrl(new URL(source.url).origin, match[1]),
      source_site: source.id,
      source_name: source.name,
      scraped_at: new Date().toISOString(),
      deadline: deadlineMatch ? parseDate(deadlineMatch[1]) : estimateDeadline(),
      status: "pending_review",
      categories: inferCategories(text),
      subjects: inferSubjects(text),
      states: inferStates(text),
      cities: [],
      ownership: "Government",
      employmentType: inferEmploymentType(text),
      academicLevel: inferAcademicLevel(text),
      salaryMin: 0,
      salaryMax: 0,
      vacancies: inferVacancies(text),
    });
    if (jobs.length >= 15) break;
  }
  return jobs;
}

// ─── INFERENCE HELPERS ───────────────────────────────────────────────────────

function isTeachingJob(text) {
  const keywords = [
    "teacher","professor","lecturer","faculty","tutor","principal",
    "headmaster","head master","librarian","pgt","tgt","prt","jrf","srf",
    "fellow","instructor","education","school","college","university",
    "vidyalaya","teaching","academic","research associate","assistant professor",
    "associate professor","guest faculty","visiting","coach",
  ];
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k));
}

function inferCategories(text) {
  const lower = text.toLowerCase();
  const cats = [];
  if (/\b(engineering|technical|technology|computer science|cse|it|ece|eee|civil|mech|electrical)\b/.test(lower)) cats.push("engineering");
  if (/\b(medical|mbbs|md|nursing|anatomy|physiology|pharmacology|aiims|medical college)\b/.test(lower)) cats.push("medical");
  if (/\b(law|legal|llb|llm|advocate)\b/.test(lower)) cats.push("law");
  if (/\b(research|jrf|srf|postdoc|phd|fellow|iit|isc|iiser)\b/.test(lower)) cats.push("research");
  if (/\b(school|pgt|tgt|prt|primary|secondary|kvs|nvs|cbse|teacher|headmaster)\b/.test(lower)) cats.push("school");
  if (cats.length === 0) cats.push("arts-science");
  return cats;
}

function inferSubjects(text) {
  const lower = text.toLowerCase();
  const subjectMap = {
    "Mathematics": ["mathematics","maths","math"],
    "Physics": ["physics"],
    "Chemistry": ["chemistry"],
    "Biology": ["biology","botany","zoology"],
    "Computer Science": ["computer science","computer","cse","it","information technology"],
    "English": ["english literature","english language","english"],
    "History": ["history"],
    "Geography": ["geography"],
    "Economics": ["economics"],
    "Political Science": ["political science","civics"],
    "Sociology": ["sociology"],
    "Commerce": ["commerce","accounting","business studies"],
    "AI / Data Science": ["artificial intelligence","machine learning","data science","ai","ml"],
    "Civil Engineering": ["civil engineering","civil"],
    "Mechanical Engineering": ["mechanical engineering","mechanical"],
    "Electrical Engineering": ["electrical engineering","electrical"],
    "Primary Teacher": ["primary teacher","prt"],
    "TGT Mathematics": ["tgt math"],
    "PGT Mathematics": ["pgt math"],
    "JRF": ["jrf","junior research fellow"],
    "SRF": ["srf","senior research fellow"],
    "Postdoctoral Fellow": ["postdoc","post doctoral","post-doctoral"],
  };
  const found = [];
  for (const [subject, patterns] of Object.entries(subjectMap)) {
    if (patterns.some((p) => lower.includes(p))) found.push(subject);
  }
  return found.length ? found : [];
}

function inferStates(text) {
  const stateMap = {
    "Delhi": ["delhi","new delhi"],
    "West Bengal": ["west bengal","kolkata","calcutta"],
    "Maharashtra": ["maharashtra","mumbai","pune","nagpur"],
    "Karnataka": ["karnataka","bangalore","bengaluru","mysore"],
    "Tamil Nadu": ["tamil nadu","chennai","madras","coimbatore"],
    "Uttar Pradesh": ["uttar pradesh","lucknow","varanasi","agra","kanpur"],
    "Rajasthan": ["rajasthan","jaipur","jodhpur"],
    "Gujarat": ["gujarat","ahmedabad","surat","vadodara"],
    "Bihar": ["bihar","patna"],
    "Madhya Pradesh": ["madhya pradesh","bhopal","indore"],
    "Andhra Pradesh": ["andhra pradesh","hyderabad","visakhapatnam"],
    "Telangana": ["telangana","hyderabad"],
    "Kerala": ["kerala","thiruvananthapuram","kochi","kozhikode"],
    "Punjab": ["punjab","chandigarh","amritsar","ludhiana"],
    "Haryana": ["haryana","gurugram","faridabad"],
  };
  const lower = text.toLowerCase();
  const found = [];
  for (const [state, keywords] of Object.entries(stateMap)) {
    if (keywords.some((kw) => lower.includes(kw))) found.push(state);
  }
  return found;
}

function inferEmploymentType(text) {
  const lower = text.toLowerCase();
  if (lower.includes("guest") || lower.includes("visiting")) return "Guest Faculty";
  if (lower.includes("contract") || lower.includes("temporary")) return "Contract";
  if (lower.includes("part-time") || lower.includes("part time")) return "Part-time";
  if (lower.includes("jrf") || lower.includes("srf") || lower.includes("fellow")) return "Contract";
  return "Full-time";
}

function inferAcademicLevel(text) {
  const lower = text.toLowerCase();
  if (/\b(phd|research|jrf|srf|postdoc|fellow)\b/.test(lower)) return "PhD / Research";
  if (/\b(professor|associate professor|assistant professor|pg|post.?graduate)\b/.test(lower)) return "PG";
  if (/\b(lecturer|ug|under.?graduate|college|degree)\b/.test(lower)) return "UG";
  if (/\b(pgt|higher secondary|class (xi|xii|11|12))\b/.test(lower)) return "Higher Secondary";
  if (/\b(tgt|secondary|class (vi|vii|viii|ix|x|6|7|8|9|10))\b/.test(lower)) return "Secondary";
  if (/\b(prt|primary|class (i|ii|iii|iv|v|1|2|3|4|5))\b/.test(lower)) return "Primary";
  return "UG";
}

function inferVacancies(text) {
  const match = text.match(/(\d+)\s*(?:post|vacancy|vacancies|position|seat)/i);
  return match ? parseInt(match[1]) : 1;
}

function inferInstitution(title, desc, fallback) {
  const combined = (title + " " + desc).slice(0, 300);
  const patterns = [
    [/\bIIT\s+\w+/i, null],
    [/\bNIT\s+\w+/i, null],
    [/\bAIIMS\s+\w+/i, null],
    [/\bIISc\b/i, "IISc Bangalore"],
    [/\bIISER\s+\w+/i, null],
    [/\bKendriya Vidyalaya\b/i, "Kendriya Vidyalaya Sangathan (KVS)"],
    [/\bNavodaya\b/i, "Navodaya Vidyalaya Samiti (NVS)"],
    [/\bUGC\b/i, "UGC / NTA"],
    [/\bDSSS?B\b/i, "DSSSB"],
    [/\bAICTE\b/i, "AICTE"],
  ];
  for (const [rx, name] of patterns) {
    const m = combined.match(rx);
    if (m) return name || m[0];
  }
  return fallback;
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function resolveUrl(base, path) {
  if (!path) return base;
  if (path.startsWith("http")) return path;
  try {
    return new URL(path, base).href;
  } catch {
    return base;
  }
}

function parseDate(str) {
  // Convert DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
  const parts = str.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const year = y.length === 2 ? "20" + y : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return str;
}

function estimateDeadline() {
  // Default to 30 days from now if we can't parse
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

// ─── MAIN FETCHER ────────────────────────────────────────────────────────────

async function fetchSource(source) {
  const html = await safeFetch(source.url);

  let jobs = [];
  if (source.type === "rss") {
    jobs = parseRSS(html, source);
  } else if (source.id === "kvs") {
    jobs = parseKVS(html);
  } else if (source.id === "nvs") {
    jobs = parseNVS(html);
  } else if (source.id === "ugc") {
    jobs = parseUGC(html);
  } else {
    jobs = parseGenericHTML(html, source);
  }

  return { source, jobs };
}

// ─── HANDLER ─────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") { res.status(200).end(); return; }

  // Parse body for POST (custom sources from admin panel)
  let customSources = [];
  if (req.method === "POST") {
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
      customSources = (body.customSources || []).map((cs, i) => ({
        id: `custom_${i}_${Date.now()}`,
        name: cs.name || cs.url,
        icon: cs.icon || "🔗",
        url: cs.url,
        type: "html",
        category: cs.category || "Custom",
        isCustom: true,
        addedDate: cs.addedDate,
        notes: cs.notes || "",
      }));
    } catch (_) {}
  }

  // Optionally filter built-in by ?source=kvs
  const builtInSources = req.query?.source
    ? SOURCES.filter((s) => s.id === req.query.source)
    : SOURCES;

  const allSources = [...builtInSources, ...customSources];

  // Fetch all in parallel with a per-source timeout
  const settled = await Promise.allSettled(allSources.map((s) => fetchSource(s)));

  const sourceStats = settled.map((result, i) => {
    const source = allSources[i];
    if (result.status === "fulfilled") {
      return {
        id: source.id, name: source.name, icon: source.icon,
        category: source.category, status: "ok",
        count: result.value.jobs.length, url: source.url,
        isCustom: !!source.isCustom,
      };
    }
    return {
      id: source.id, name: source.name, icon: source.icon,
      category: source.category, status: "error", count: 0,
      error: result.reason?.message || "Unknown error",
      url: source.url, isCustom: !!source.isCustom,
    };
  });

  const jobs = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value.jobs);

  // Deduplicate by normalised title
  const seen = new Set();
  const dedupedJobs = jobs.filter((j) => {
    const key = j.title.toLowerCase().replace(/\s+/g, " ").slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.status(200).json({
    success: true,
    total: dedupedJobs.length,
    fetchedAt: new Date().toISOString(),
    sourceStats,
    jobs: dedupedJobs,
  });
}
