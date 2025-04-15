/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm', // Changed to default-esm preset
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    // Handle module imports
    "\\.(css|less|sass|scss)$": "<rootDir>/__mocks__/styleMock.js",
    "\\.(gif|ttf|eot|svg|png)$": "<rootDir>/__mocks__/fileMock.js",
    // Handle HTML imports more specifically
    "\\.html$": "<rootDir>/__mocks__/htmlMock.js"
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    // Process TS files properly
    "^.+\\.[tj]sx?$": ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(.+/node_modules/)?(module-that-needs-to-be-transformed)/)"
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    "/src/__tests__/setup/"  // Exclude setup files from test matching
  ],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts"
  ]
};