import { RootAgent, type RootAgentConfig } from '@motus-dao/root-agent';

let cachedRootAgent: RootAgent | null = null;

const ALLOWED_SELF_ENDPOINT_TYPES = new Set(['https', 'celo', 'staging_celo', 'staging_https'] as const);

function buildRootAgentConfig(): RootAgentConfig {
  const celoNetwork =
    (process.env.ROOT_AGENT_CELO_NETWORK as RootAgentConfig['celoNetwork']) ?? 'alfajores';

  const config: RootAgentConfig = {
    celoNetwork,
    gasSponsorship: process.env.ROOT_AGENT_GAS_SPONSORSHIP === 'true',
  };

  if (process.env.TRANSAK_API_KEY) {
    config.transakApiKey = process.env.TRANSAK_API_KEY;
  }

  const selfScopeId = process.env.ROOT_AGENT_SELF_SCOPE_ID;
  const selfAppName = process.env.ROOT_AGENT_SELF_APP_NAME;
  const selfEndpoint = process.env.ROOT_AGENT_SELF_ENDPOINT;
  const selfEndpointType = process.env.ROOT_AGENT_SELF_ENDPOINT_TYPE;
  const selfLogoBase64 = process.env.ROOT_AGENT_SELF_LOGO_BASE64;
  const enableSelf = process.env.ROOT_AGENT_ENABLE_SELF === 'true';

  // Self/live-connect can fail at runtime if params are malformed.
  // Keep it behind an explicit opt-in flag plus minimal validation.
  if (
    enableSelf &&
    selfScopeId &&
    selfAppName &&
    selfEndpoint &&
    selfEndpointType &&
    ALLOWED_SELF_ENDPOINT_TYPES.has(selfEndpointType as (typeof ALLOWED_SELF_ENDPOINT_TYPES extends Set<infer T> ? T : never))
  ) {
    config.selfConfig = {
      scope: selfScopeId,
      appName: selfAppName,
      endpoint: selfEndpoint,
      endpointType: selfEndpointType as RootAgentConfig['selfConfig'] extends infer S
        ? S extends { endpointType: infer T }
          ? T
          : never
        : never,
      logoBase64: selfLogoBase64,
    };
  } else if (enableSelf) {
    console.warn('[root-agent] ROOT_AGENT_ENABLE_SELF=true but self config is incomplete/invalid. Skipping selfConfig.');
  }

  return config;
}

export function getRootAgent() {
  if (!cachedRootAgent) {
    const config = buildRootAgentConfig();
    cachedRootAgent = new RootAgent(config);
  }

  return cachedRootAgent;
}

