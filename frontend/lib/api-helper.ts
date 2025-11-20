/**
 * API helper utilities for handling slow responses
 */
'use client';

import { useState } from 'react';

export interface ApiCallOptions {
  onSlowResponse?: (message: string) => void;
  slowThreshold?: number; // milliseconds
  timeoutMessage?: string;
}

/**
 * Wrapper for API calls that shows a warming up message for slow responses
 */
export async function withSlowResponseWarning<T>(
  apiCall: () => Promise<T>,
  options: ApiCallOptions = {}
): Promise<T> {
  const {
    onSlowResponse,
    slowThreshold = 2000, // Show message after 2 seconds
    timeoutMessage = '⏳ Server is warming up (free tier takes ~30s)...',
  } = options;

  let timeoutId: NodeJS.Timeout | null = null;

  // Set up a timeout to trigger the slow response callback
  if (onSlowResponse) {
    timeoutId = setTimeout(() => {
      onSlowResponse(timeoutMessage);
    }, slowThreshold);
  }

  try {
    const result = await apiCall();
    
    // Clear timeout if request completes
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    return result;
  } catch (error) {
    // Clear timeout on error
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

/**
 * React hook for managing slow API call state
 */
export function useSlowApiState() {
  const [isSlowResponse, setIsSlowResponse] = useState(false);
  const [slowMessage, setSlowMessage] = useState('');

  const handleSlowResponse = (message: string) => {
    setIsSlowResponse(true);
    setSlowMessage(message);
  };

  const resetSlowState = () => {
    setIsSlowResponse(false);
    setSlowMessage('');
  };

  return {
    isSlowResponse,
    slowMessage,
    handleSlowResponse,
    resetSlowState,
  };
}
