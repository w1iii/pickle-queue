import { Injectable, NotImplementedException } from '@nestjs/common';

@Injectable()
export class QrService {
  // TODO: Generate signed, short-lived QR codes for facility check-in.
  generate(facilityId: string): never {
    void facilityId;
    throw new NotImplementedException('QR generation is not implemented');
  }

  // TODO: Validate QR signatures, expiry, and facility ownership.
  validate(token: string, facilityId: string): never {
    void token;
    void facilityId;
    throw new NotImplementedException('QR validation is not implemented');
  }

  // TODO: Validate the QR code and create the player queue entry.
  checkIn(facilityId: string, playerId: string, token: string): never {
    void facilityId;
    void playerId;
    void token;
    throw new NotImplementedException('QR check-in is not implemented');
  }
}
