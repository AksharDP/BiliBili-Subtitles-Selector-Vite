// Import Jest DOM extensions for ESM
import '@testing-library/jest-dom';
import { mockIndexedDB } from './src/__tests__/setup/mockIndexedDB';

// Set up global mocks
Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true
});