// Mock for jose module (ESM) to allow Jest to run tests
export const SignJWT = jest.fn().mockImplementation(() => ({
  setProtectedHeader: jest.fn().mockReturnThis(),
  setIssuedAt: jest.fn().mockReturnThis(),
  setExpirationTime: jest.fn().mockReturnThis(),
  sign: jest.fn().mockResolvedValue('mock-jwt-token'),
}));

export const jwtVerify = jest.fn().mockResolvedValue({
  payload: {
    sub: 'mock-user-id',
    role: 'PLAYER',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  },
  protectedHeader: { alg: 'HS256' },
});

export const errors = {
  JWTExpired: class JWTExpired extends Error {
    code = 'ERR_JWT_EXPIRED';
  },
  JWTClaimValidationFailed: class JWTClaimValidationFailed extends Error {
    code = 'ERR_JWT_CLAIM_VALIDATION_FAILED';
  },
  JWTInvalid: class JWTInvalid extends Error {
    code = 'ERR_JWT_INVALID';
  },
};
