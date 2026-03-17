import { getRootAgent } from '../lib/root-agent';
import type { SelfScope } from '@motus-dao/root-agent';

async function main() {
  console.log('=== RootAgent SDK Demo Flow ===');

  const root = getRootAgent();
  const configSummary = {
    // These are safe, non-secret summaries of config
    celoNetwork: (root as any).config?.celoNetwork ?? process.env.ROOT_AGENT_CELO_NETWORK ?? 'alfajores',
    hasTransakKey: Boolean(process.env.TRANSAK_API_KEY),
    hasSelfConfig:
      Boolean(process.env.ROOT_AGENT_SELF_SCOPE_ID) &&
      Boolean(process.env.ROOT_AGENT_SELF_APP_NAME) &&
      Boolean(process.env.ROOT_AGENT_SELF_ENDPOINT) &&
      Boolean(process.env.ROOT_AGENT_SELF_ENDPOINT_TYPE),
    gasSponsorship: process.env.ROOT_AGENT_GAS_SPONSORSHIP === 'true',
  };

  console.log('Config summary:', configSummary);

  try {
    // 1. Onboard a user
    const email = `sdk-demo+${Date.now()}@motusdao.org`;
    console.log('\n[1] Calling createUser() with email:', email);

    const user = await root.createUser({
      method: 'email',
      email,
    });

    console.log('User created:', {
      wallet: user.wallet,
      method: user.method,
      identifier: user.identifier,
      verified: user.verified,
      selfId: user.selfId ?? null,
    });

    // 2. Generate Transak fund URL (if available)
    try {
      console.log('\n[2] Calling user.fundWallet() to get Transak URL...');
      const fundUrl = await user.fundWallet();
      console.log('Transak fund URL:', fundUrl);
    } catch (err) {
      console.error('fundWallet() failed:', formatError(err));
    }

    // 3. Verify user with Self (if configured)
    let verification: any = null;
    const selfScopesEnv = process.env.ROOT_AGENT_SELF_SCOPES ?? 'humanity';
    const selfScopes = selfScopesEnv.split(',').map((s) => s.trim()).filter(Boolean) as SelfScope[];

    if (configSummary.hasSelfConfig) {
      try {
        console.log('\n[3] Calling verifyUser() with scopes:', selfScopes);
        verification = await root.verifyUser({
          user,
          method: 'self',
          scope: selfScopes,
        });

        console.log('Verification result:', {
          verified: verification.verified,
          selfId: verification.selfId,
          zkCredentialCount: verification.zkCredentials?.length ?? 0,
        });
      } catch (err) {
        console.error('verifyUser() failed:', formatError(err));
      }
    } else {
      console.log('\n[3] Skipping verifyUser() — Self config not set in env.');
    }

    // 4. Create an agent with inherited credentials (if available)
    try {
      console.log('\n[4] Calling createAgent()...');

      const agent = await root.createAgent({
        owner: user.wallet,
        name: `demo-agent-${Date.now()}`,
        selfCredentials: verification?.zkCredentials,
        permissions: ['transfer', 'escrow'],
      });

      console.log('Agent created:', {
        wallet: agent.wallet,
        owner: agent.owner,
        name: agent.name,
        permissions: agent.permissions,
        selfId: agent.selfId ?? null,
      });
    } catch (err) {
      console.error('createAgent() failed:', formatError(err));
    }
  } catch (err) {
    console.error('Fatal error in demo flow:', formatError(err));
    process.exit(1);
  }

  console.log('\n=== RootAgent SDK Demo Flow Completed ===');
}

function formatError(err: unknown) {
  if (err instanceof Error) {
    const anyErr = err as any;
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: anyErr.code,
      status: anyErr.status,
      responseData: anyErr.response?.data,
    };
  }

  return { message: String(err) };
}

main().catch((err) => {
  console.error('Unhandled error in demo-root-agent-flow:', formatError(err));
  process.exit(1);
});

