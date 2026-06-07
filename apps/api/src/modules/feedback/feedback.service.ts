import { Injectable, Logger } from '@nestjs/common';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  async submit(userId: string, dto: CreateFeedbackDto): Promise<{ received: boolean }> {
    // Beta simulado — feedback registrado em log; sem envio de e-mail real
    this.logger.log(
      `[BETA FEEDBACK] userId=${userId} category=${dto.category} context="${dto.context ?? ''}" message="${dto.message.slice(0, 120)}..."`,
    );
    return { received: true };
  }
}
