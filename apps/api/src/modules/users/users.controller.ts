import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { FinancialProfileService } from './financial-profile.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateFinancialProfileDto } from './dto/update-financial-profile.dto';
import { SimulateKycRejectionDto } from './dto/simulate-kyc.dto';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly financialProfileService: FinancialProfileService,
  ) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch('me/profile')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  // ── Financial Profile / KYC Progressivo ────────────────────────

  @Get('me/financial-profile')
  getFinancialProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.financialProfileService.getFinancialProfile(user.id);
  }

  @Patch('me/financial-profile')
  updateFinancialProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateFinancialProfileDto,
  ) {
    return this.financialProfileService.updateFinancialProfile(user.id, dto);
  }

  @Post('me/financial-profile/submit')
  @HttpCode(HttpStatus.OK)
  submitFinancialProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.financialProfileService.submitForReview(user.id);
  }

  @Post('me/financial-profile/simulate-approval')
  @HttpCode(HttpStatus.OK)
  simulateApproval(@CurrentUser() user: AuthenticatedUser) {
    return this.financialProfileService.simulateApproval(user.id);
  }

  @Post('me/financial-profile/simulate-rejection')
  @HttpCode(HttpStatus.OK)
  simulateRejection(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SimulateKycRejectionDto,
  ) {
    return this.financialProfileService.simulateRejection(user.id, dto.reason);
  }
}
