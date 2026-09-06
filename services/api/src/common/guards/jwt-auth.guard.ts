import { Injectable } from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard {}
