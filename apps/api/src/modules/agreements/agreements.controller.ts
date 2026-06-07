import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AgreementsService } from './agreements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { CreateSimpleAgreementDto } from './dto/create-simple-agreement.dto';
import { CreateGuaranteedAgreementDto } from './dto/create-guaranteed-agreement.dto';
import { ListAgreementsDto } from './dto/list-agreements.dto';
import { CancelAgreementDto } from './dto/cancel-agreement.dto';
import { DeclineAgreementDto } from './dto/decline-agreement.dto';
import { OpenDisputeDto } from './dto/open-dispute.dto';
import { FinancialGuaranteesService } from '../financial-guarantees/financial-guarantees.service';
import { BlockchainRecordsService } from '../blockchain-records/blockchain-records.service';

@Controller('agreements')
@UseGuards(JwtAuthGuard)
export class AgreementsController {
  constructor(
    private readonly service: AgreementsService,
    private readonly guaranteesService: FinancialGuaranteesService,
    private readonly blockchainRecords: BlockchainRecordsService,
  ) {}

  // ── Criação ──────────────────────────────────────────────────

  @Post('simple')
  createSimple(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSimpleAgreementDto,
  ) {
    return this.service.createSimple(user.id, dto);
  }

  @Post('guaranteed')
  createGuaranteed(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateGuaranteedAgreementDto,
  ) {
    return this.service.createGuaranteed(user.id, dto);
  }

  // ── Listagem e detalhe ────────────────────────────────────────

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAgreementsDto,
  ) {
    return this.service.findAllByUser(user.id, query);
  }

  // IMPORTANT: 'summary' must be declared BEFORE ':id' so Express matches
  // the static segment before the parameterized one.
  @Get('summary')
  getWalletSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getWalletSummary(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.findOne(user.id, id);
  }

  // ── Ciclo de vida ─────────────────────────────────────────────

  @Post(':id/accept')
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.accept(user.id, id);
  }

  @Post(':id/decline')
  @HttpCode(HttpStatus.OK)
  decline(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DeclineAgreementDto,
  ) {
    return this.service.decline(user.id, id, dto.reason);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAgreementDto,
  ) {
    return this.service.cancel(user.id, id, dto.reason);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.complete(user.id, id);
  }

  // ── Fluxo financeiro (WITH_GUARANTEE) ─────────────────────────

  @Post(':id/payment-intents')
  initiatePayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') agreementId: string,
  ) {
    return this.service.initiatePayment(user.id, agreementId);
  }

  @Post(':id/confirm-completion')
  @HttpCode(HttpStatus.OK)
  confirmCompletion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.confirmCompletion(user.id, id);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  release(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.release(user.id, id);
  }

  @Post(':id/refund')
  @HttpCode(HttpStatus.OK)
  refund(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAgreementDto,
  ) {
    return this.service.refund(user.id, id, dto.reason);
  }

  // ── Disputas ─────────────────────────────────────────────────

  @Post(':id/dispute')
  openDispute(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: OpenDisputeDto,
  ) {
    return this.service.openDispute(user.id, id, dto);
  }

  @Get(':id/dispute')
  getDispute(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getDispute(user.id, id);
  }

  // ── Sub-recursos ──────────────────────────────────────────────

  @Get(':id/guarantee')
  getGuarantee(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') agreementId: string,
  ) {
    return this.guaranteesService.findByAgreement(user.id, agreementId);
  }

  @Get(':id/proofs')
  getProofs(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.blockchainRecords.getProofsForUser(user.id, id);
  }
}
