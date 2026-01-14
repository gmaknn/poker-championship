/**
 * Mock for jose library in tests
 * In tests, auth() is mocked so JWT verification is not actually called
 * This mock prevents ESM import issues with Jest
 */

module.exports = {
  jwtVerify: jest.fn().mockRejectedValue(new Error('JWT verification mocked in tests')),
  SignJWT: jest.fn(),
  jwtDecrypt: jest.fn(),
  compactDecrypt: jest.fn(),
  compactVerify: jest.fn(),
};
