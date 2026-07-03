/**
 * ============================================================================
 * THIRD-PARTY PROXY PATTERN CONFIGURATION
 * ============================================================================
 *
 * This file defines patterns to detect and unwrap third-party proxy URLs.
 * When scraping providers return URLs that are proxied through external services,
 * this configuration allows the framework to extract the original direct URLs.
 *
 *
 * WHY THIS EXISTS
 * ============================================================================
 *
 * Some streaming providers wrap their URLs through proxy services like:
 * - https://hlsproxy3.asiaflix.net/m3u8-proxy?url=https%3A%2F%2Freal-server.com%2Fvideo.m3u8
 *
 * We want to extract the REAL URL:
 * - https://real-server.com/video.m3u8
 *
 * This allows our own proxy system to handle the request directly, giving us
 * more control over headers, caching, and error handling.
 *
 *
 * HOW IT WORKS
 * ============================================================================
 *
 * 1. The framework receives a URL from a provider
 * 2. It extracts the origin (e.g., "https://hlsproxy3.asiaflix.net")
 * 3. It looks up patterns for that specific origin
 * 4. If no origin-specific pattern exists, it tries wildcard patterns ('*')
 * 5. The first matching regex captures the original URL
 * 6. The captured URL is decoded (potentially multiple times for nested encoding)
 * 7. The clean URL is returned
 *
 *
 * CONFIGURATION STRUCTURE
 * ============================================================================
 */

export const knownThirdPartyProxies: Record<string, RegExp[]> = {
    // -----------------------------------------------------------------------
    // ORIGIN-SPECIFIC PATTERNS
    // -----------------------------------------------------------------------
    // Use these when a proxy service has a unique URL structure
    // Key: The full origin (protocol + domain)
    // Value: Array of regex patterns to try (in order)

    'https://hls1.vid1.site': [/\/proxy\/(.+)$/],

    'https://madplay.site': [/\/api\/[^/]+\/proxy\?url=(.+)$/],

    'https://streams.smashystream.top': [/\/proxy\/m3u8\/(.+?)\/[^/]+$/],

    // -----------------------------------------------------------------------
    // WILDCARD PATTERNS (Applied to ALL origins)
    // -----------------------------------------------------------------------
    // Use these for common proxy patterns that appear across multiple services
    // These are checked AFTER origin-specific patterns

    '*': [
        /^https:\/\/[^/]+\.workers\.dev\/((?:https?:\/\/|https?%3A%2F%2F).+)$/, // another workers.dev/https[url encoded] capturer
        /^https:\/\/[^/]+\.workers\.dev\/((?:https?:\/\/)?[^/]+\/file2\/.+)$/, // any workers.dev/[domain]/file2/[content] capturer
        /^https:\/\/.+?\.workers\.dev\/((?:https?:\/\/).+)$/, // any [subdomain].workers.dev/[https://..... link] capturer
        /\/proxy\/(.+)$/, // Generic /proxy/encoded
        /\/(?:m3u8|mp4)-proxy\?url=(.+?)(?:&|$)/, // m3u8-proxy?url=
        /\/api\/[^/]+\/proxy\?url=(.+)$/, // /api/*/proxy?url=
        /\/proxy\?.*url=([^&]+)/, // /proxy?url= (with other params)
        /\/stream\/proxy\/(.+)$/, // /stream/proxy/
        /^https:\/\/[^/]+\/((?:https?:\/\/)?[a-zA-Z0-9.-]+\/file2\/.+)$/, // any [domain]/file2/[content] capturer (non-workers.dev)
        /^https:\/\/[^/]+\.workers\.dev\/(?:m3u8|mp4)-proxy\?url=(.+?)(?:&|$)/
    ]
};

/**
 * ============================================================================
 * HOW TO ADD A NEW PROXY PATTERN
 * ============================================================================
 *
 * STEP 1: Identify the Proxy URL Structure
 * ----------------------------------------------------------------------------
 *
 * Look at the URL you're receiving. Examples:
 *
 * Example A: https://proxy.example.com/stream/https%3A%2F%2Freal.com%2Fvideo.m3u8
 *            └─────────┬─────────────┘└──┬──┘    └──────────────┬────────────────┘
 *                   Origin             Path               Encoded Real URL
 *
 * Example B: https://api.proxy.net/v1/proxy?url=https://real.com/video.m3u8&token=xyz
 *            └──────────┬─────────┘└───┬──┘└─────────────────┬──────────────────────┘
 *                     Origin         Path             Query Parameter
 *
 *
 * STEP 2: Choose Between Origin-Specific or Wildcard
 * ----------------------------------------------------------------------------
 *
 * Ask yourself: "Will this pattern ONLY appear on this specific domain?"
 *
 *  Use ORIGIN-SPECIFIC if:
 *    - The proxy service has a unique URL structure
 *    - You want to be very precise about which URLs to match
 *    - Example: Only "hlsproxy3.asiaflix.net" uses "/m3u8-proxy?url="
 *
 *  Use WILDCARD (*) if:
 *    - The pattern is generic and might appear on multiple domains
 *    - It's a common proxy convention (like "/proxy/encoded-url")
 *    - You want it to work for future unknown proxy services
 *
 *
 * STEP 3: Write the Regex Pattern
 * ----------------------------------------------------------------------------
 *
 * Your regex MUST:
 * ✓ Capture the original URL in group 1: (.+) or (.+?)
 * ✓ Match the full proxy URL structure
 *
 * REGEX EXAMPLES WITH EXPLANATIONS:
 *
 * Example 1: Path-based proxy
 * URL:     https://proxy.com/stream/https%3A%2F%2Freal.com%2Fvideo.m3u8
 * Pattern:                /\/stream\/(.+)$/
 *                         ├─────┬─────┘└┬─┘└┘
 *                         │     │      │  │
 *                         │     │      │  └─ End of string
 *                         │     │      └─ Capture group (the real URL)
 *                         │     └─ Match literal "/stream/"
 *                         └─ Start regex
 *
 * Example 2: Query parameter proxy
 * URL:     https://proxy.com/api/v1/proxy?url=https://real.com&token=abc
 * Pattern:                       /\/proxy\?url=(.+?)(?:&|$)/
 *                                ├─────┬─────┘└┬─┘└─┬──┘└───┬───┘
 *                                │     │       │    │       │
 *                                │     │       │    │       └─ Stop at "&" or end
 *                                │     │       │    └─ Capture real URL (non-greedy)
 *                                │     │       └─ Match "url="
 *                                │     └─ Match "/proxy?" (escaped ?)
 *                                └─ Start regex
 *
 * Example 3: Dynamic path segment
 * URL:     https://api.proxy.net/api/v2/proxy?url=https://real.com
 * Pattern:                    /\/api\/[^/]+\/proxy\?url=(.+)$/
 *                             ├────┬────┘└──┬──┘└────────┘
 *                             │    │       │
 *                             │    │       └─ Match any version (v1, v2, etc)
 *                             │    └─ Match "/api/"
 *                             └─ Start regex
 *
 *
 * STEP 4: Add Your Pattern
 * ----------------------------------------------------------------------------
 *
 * For origin-specific:
 *
 * 'https://your-proxy.com': [
 *     /your-regex-pattern-here/,
 *     /optional-fallback-pattern/,  // You can add multiple patterns
 * ],
 *
 * For wildcard:
 *
 * '*': [
 *     /existing-patterns/,
 *     /your-new-pattern/,  // Add to the end of the array
 * ],
 *
 *
 * STEP 5: Test Your Pattern
 * ----------------------------------------------------------------------------
 *
 * Use this test code:
 *
 * const testUrl = "https://your-proxy.com/your/structure?url=https%3A%2F%2Freal.com";
 * const pattern = /your-regex-here/;
 * const match = testUrl.match(pattern);
 *
 * if (match) {
 *     console.log("Match found!");
 *     console.log("Captured URL:", match[1]);
 *     console.log("Decoded:", decodeURIComponent(match[1]));
 * } else {
 *     console.log("No match - adjust your regex");
 * }
 *
 *
 * COMMON MISTAKES TO AVOID
 * ============================================================================
 *
 * - Forgetting to escape special characters
 *    Wrong: /proxy?url=(.+)/        (? is a regex operator)
 *    Right: /\/proxy\?url=(.+)/     (? is escaped)
 *
 * - Not using a capture group
 *    Wrong: /\/proxy\/.+$/          (Nothing captured!)
 *    Right: /\/proxy\/(.+)$/        (URL captured in group 1)
 *
 * - Using greedy capture with query params
 *    Wrong: /\?url=(.+)&/           (Captures too much if multiple &)
 *    Right: /\?url=(.+?)(?:&|$)/    (Non-greedy, stops at first &)
 *
 * - Wrong origin format
 *    Wrong: 'proxy.com'             (Missing protocol)
 *    Right: 'https://proxy.com'     (Full origin)
 *
 * - Overly specific patterns in wildcard
 *    Wrong: '*': [/\/api\/v2\/proxy\?url=(.+)/]  (Too specific!)
 *    Right: '*': [/\/api\/[^/]+\/proxy\?url=(.+)/]  (Matches v1, v2, etc)
 *
 *
 * NEED HELP?
 * ============================================================================
 *
 * Test your regex:       https://regex101.com/ (use JavaScript flavor)
 * URL encoding/decoding: encodeURIComponent() and decodeURIComponent() in any js runtime
 * Ask in discussions:    https://github.com/orgs/cinepro-org/discussions
 *
 */
