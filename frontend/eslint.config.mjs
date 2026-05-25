import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
];
