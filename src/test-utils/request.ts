/**
 * Utility to create mock NextRequest objects for API route testing
 */

import { NextRequest } from 'next/server';

export type MockRequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  searchParams?: Record<string, string>;
};

/**
 * Creates a mock NextRequest for testing API route handlers
 */
export function createMockRequest(
  path: string,
  options: MockRequestOptions = {}
): NextRequest {
  const { method = 'GET', body, headers = {}, searchParams = {} } = options;

  const url = new URL(path, 'http://localhost:3000');

  // Add search params
  Object.entries(searchParams).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const headersObj = new Headers(headers);

  if (body && method !== 'GET') {
    headersObj.set('Content-Type', 'application/json');
    return new NextRequest(url, {
      method,
      headers: headersObj,
      body: JSON.stringify(body),
    });
  }

  return new NextRequest(url, {
    method,
    headers: headersObj,
  });
}

/**
 * Creates a mock request with a player-id header (simulates dev auth)
 */
export function createAuthenticatedRequest(
  path: string,
  playerId: string,
  options: MockRequestOptions = {}
): NextRequest {
  return createMockRequest(path, {
    ...options,
    headers: {
      ...options.headers,
      'x-player-id': playerId,
    },
  });
}
