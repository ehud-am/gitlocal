import '@testing-library/jest-dom'

if (!navigator.clipboard) {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: async () => undefined,
    },
    configurable: true,
  })
}
