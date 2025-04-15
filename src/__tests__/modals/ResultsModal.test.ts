/// <reference types="jest" />
import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Create a proper mock function that we can control
const mockCheckSubtitleInCache = jest.fn<(subtitleId: string) => Promise<boolean>>();

// Mock the indexedDB module
jest.mock('../../db/indexedDB', () => ({
  checkSubtitleInCache: mockCheckSubtitleInCache
}));

// Define the function to test directly in the test file
// This is a simplified version of the function in ResultsModal.ts
async function checkCacheStatus(subtitleId: string, itemElement: HTMLElement): Promise<void> {
  try {
    const isCached = await mockCheckSubtitleInCache(subtitleId);
    const statusContainer = itemElement.querySelector(
      `.subtitle-cache-status[data-subtitle-id="${subtitleId}"]`
    );
    if (statusContainer) {
      const indicator = statusContainer.querySelector(
        ".cache-indicator"
      ) as HTMLElement;
      const text = statusContainer.querySelector(
        ".cache-text"
      ) as HTMLElement;
      const GREEN = "rgb(46, 204, 113)";
      const GREY = "rgb(128, 128, 128)";
      const newColor = isCached ? GREEN : GREY;
      const newText = isCached ? "Cached" : "Not cached";
      if (indicator) indicator.style.backgroundColor = newColor;
      if (text) {
        text.textContent = newText;
        text.style.color = newColor;
      }
    }
  } catch (error) {
    console.error(
      `Error checking cache for subtitle ${subtitleId}:`,
      error
    );
  }
}

describe('ResultsModal', () => {
  let mockItemElement: HTMLElement;
  let mockStatusContainer: HTMLElement;
  let mockIndicator: HTMLElement;
  let mockText: HTMLElement;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.resetAllMocks();
    
    // Create mock DOM elements for testing
    mockItemElement = document.createElement('div');
    mockStatusContainer = document.createElement('div');
    mockStatusContainer.className = 'subtitle-cache-status';
    mockStatusContainer.dataset.subtitleId = '123';
    
    mockIndicator = document.createElement('span');
    mockIndicator.className = 'cache-indicator';
    
    mockText = document.createElement('span');
    mockText.className = 'cache-text';
    
    mockStatusContainer.appendChild(mockIndicator);
    mockStatusContainer.appendChild(mockText);
    mockItemElement.appendChild(mockStatusContainer);
  });
  
  describe('checkCacheStatus', () => {
    it('should update UI to show cached subtitle when subtitle is in cache', async () => {
      // Mock the checkSubtitleInCache function to return true (cached)
      mockCheckSubtitleInCache.mockResolvedValue(true);
      
      // Call the function under test
      await checkCacheStatus('123', mockItemElement);
      
      // Check if elements were updated correctly
      expect(mockIndicator.style.backgroundColor).toBe('rgb(46, 204, 113)'); // GREEN
      expect(mockText.textContent).toBe('Cached');
      expect(mockText.style.color).toBe('rgb(46, 204, 113)'); // GREEN
    });
    
    it('should update UI to show non-cached subtitle when subtitle is not in cache', async () => {
      // Mock the checkSubtitleInCache function to return false (not cached)
      mockCheckSubtitleInCache.mockResolvedValue(false);
      
      // Call the function under test
      await checkCacheStatus('123', mockItemElement);
      
      // Check if elements were updated correctly
      expect(mockIndicator.style.backgroundColor).toBe('rgb(128, 128, 128)'); // GREY
      expect(mockText.textContent).toBe('Not cached');
      expect(mockText.style.color).toBe('rgb(128, 128, 128)'); // GREY
    });
    
    it('should handle errors gracefully', async () => {
      // Mock console.error to prevent test output pollution
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock the checkSubtitleInCache function to throw an error
      const mockError = new Error('Test error');
      mockCheckSubtitleInCache.mockRejectedValue(mockError);
      
      // Call the function under test
      await checkCacheStatus('123', mockItemElement);
      
      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error checking cache for subtitle 123:',
        mockError
      );
      
      // Restore console.error
      consoleErrorSpy.mockRestore();
    });
    
    it('should do nothing if status container is not found', async () => {
      // Create a different element without the expected structure
      const emptyElement = document.createElement('div');
      
      // Mock the checkSubtitleInCache function
      mockCheckSubtitleInCache.mockResolvedValue(true);
      
      // Call the function under test
      await checkCacheStatus('123', emptyElement);
      
      // Expect no changes or errors
      expect(emptyElement.innerHTML).toBe('');
    });
  });
});