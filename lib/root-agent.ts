import { RootAgent, type RootAgentConfig } from '@motus-dao/root-agent';

let cachedRootAgent: RootAgent | null = null;

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

  if (selfScopeId && selfAppName && selfEndpoint && selfEndpointType) {
    config.selfConfig = {
      scope: selfScopeId,
      appName: selfAppName,
      endpoint: selfEndpoint,
      endpointType: selfEndpointType as any,
      logoBase64: selfLogoBase64,
    };
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

