import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

export interface AdminContext {
  id: string;
  email: string;
  role: string;
}

@Injectable()
export class AdminJwtGuard extends AuthGuard('admin-jwt') {}
