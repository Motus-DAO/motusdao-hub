export function mottyConfig() {
  return {
    mcpUrl: process.env.MOTTY_MCP_URL || 'https://mcp.motusdao.org/mcp',
    sessionSecret: process.env.MOTTY_SESSION_SECRET || process.env.AUTH_SECRET || '',
    maxToolRounds: 3,
    maxHistory: 8,
    maxMessageChars: 2000,
    maxStoredChars: 360,
    cookieName: 'motty_hub_apd_session',
    cookieMaxAgeSec: 60 * 60 * 24 * 7,
  }
}
