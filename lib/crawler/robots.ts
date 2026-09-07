// =====================================================
// ROBOTS.TXT PARSER & CACHE
// =====================================================

export interface RobotsRules {
  disallowedPatterns: string[];
  allowedPatterns: string[];
  sitemaps: string[];
}

const robotsCache = new Map<string, RobotsRules>();

/**
 * Fetches and parses robots.txt for a given domain, caching the result in memory.
 */
export async function getRobotsRules(startUrl: string): Promise<RobotsRules> {
  let hostname = "";
  let origin = "";

  try {
    const parsed = new URL(startUrl);
    hostname = parsed.hostname.toLowerCase().replace(/^www\./, "");
    origin = parsed.origin;
  } catch {
    return { disallowedPatterns: [], allowedPatterns: [], sitemaps: [] };
  }

  if (robotsCache.has(hostname)) {
    return robotsCache.get(hostname)!;
  }

  const rules: RobotsRules = {
    disallowedPatterns: [],
    allowedPatterns: [],
    sitemaps: [],
  };

  const robotsUrl = `${origin}/robots.txt`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "SalesPilotBot/1.0 (+https://salespilot.ai)",
        Accept: "text/plain,*/*",
      },
    });

    clearTimeout(timeout);

    if (response.ok) {
      const text = await response.text();
      const lines = text.split("\n");

      let isApplicableAgent = false;

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;

        const colonIdx = line.indexOf(":");
        if (colonIdx === -1) continue;

        const directive = line.slice(0, colonIdx).trim().toLowerCase();
        const value = line.slice(colonIdx + 1).trim();

        if (directive === "user-agent") {
          const agent = value.toLowerCase();
          isApplicableAgent = agent === "*" || agent.includes("salespilot");
        } else if (directive === "sitemap" && value) {
          rules.sitemaps.push(value);
        } else if (isApplicableAgent) {
          if (directive === "disallow" && value) {
            rules.disallowedPatterns.push(value);
          } else if (directive === "allow" && value) {
            rules.allowedPatterns.push(value);
          }
        }
      }
    }
  } catch {
    // If robots.txt cannot be reached, continue with default open rules
  }

  robotsCache.set(hostname, rules);
  return rules;
}

/**
 * Checks if a specific URL is allowed by the domain's robots.txt rules.
 */
export function isAllowedByRobots(url: string, rules?: RobotsRules): boolean {
  if (!rules) return true;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Check explicit allows first
    for (const allowPattern of rules.allowedPatterns) {
      if (matchesRobotsPattern(pathname, allowPattern)) {
        return true;
      }
    }

    // Check disallows
    for (const disallowPattern of rules.disallowedPatterns) {
      if (matchesRobotsPattern(pathname, disallowPattern)) {
        return false;
      }
    }

    return true;
  } catch {
    return true;
  }
}

function matchesRobotsPattern(path: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern === "/") return true;

  // Basic wildcard handling
  const regexPattern = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");

  try {
    const regex = new RegExp(`^${regexPattern}`);
    return regex.test(path);
  } catch {
    return path.startsWith(pattern);
  }
}

/**
 * Clears the robots.txt cache (useful for testing).
 */
export function clearRobotsCache(): void {
  robotsCache.clear();
}

