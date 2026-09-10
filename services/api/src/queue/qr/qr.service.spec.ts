import { NotImplementedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { QrService } from './qr.service.js';

describe('QrService', () => {
  it('returns 501 for QR check-in during MVP', () => {
    let error: unknown;

    try {
      new QrService().checkIn('facility-1', 'player-1', 'token');
    } catch (caughtError) {
      error = caughtError;
    }

    expect(error).toBeInstanceOf(NotImplementedException);
    expect((error as NotImplementedException).getStatus()).toBe(501);
  });
});
