import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Measure coverage only for component files that have unit tests.
      // Excluded from the 90% gate (same rationale as Go's main/openBrowser):
      //   - main.tsx       : entry point, not unit-testable
      //   - App.tsx        : integration-level component, tested via e2e
      //   - api.ts         : HTTP client, mocked in all component tests
      //   - MarkdownRenderer / CodeViewer: mocked in ContentPanel tests
      include: [
        'src/components/FileTree/**/*.tsx',
        'src/components/Breadcrumb/**/*.tsx',
        'src/components/ContentPanel/ContentPanel.tsx',
        'src/components/Picker/**/*.tsx',
      ],
      exclude: ['**/*.test.tsx', '**/*.test.ts'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 85,
        statements: 90,
      },
    },
  },
})
