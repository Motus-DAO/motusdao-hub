import { RootAgent } from '@motus-dao/root-agent';

async function main() {
  console.log('Testing @motus-dao/root-agent SDK...');

  const root = new RootAgent({
    celoNetwork: 'alfajores',
  });

  console.log('RootAgent instance created:', !!root);

  const rootKeys = Object.keys(root as any);
  console.log('RootAgent instance keys:', rootKeys);

  console.log('SDK import and instantiation test completed successfully.');
}

main().catch((err) => {
  console.error('Error while testing @motus-dao/root-agent:', err);
  process.exit(1);
});

