import { Controller, Post, Headers, Req } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiHeader,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { Request } from "express";
import { PaymentsService } from "./payments.service";

@ApiTags('Webhook')
@Controller('webhook')
export class WebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Stripe webhook receiver',
    description:
      '**Called by Stripe only — do not call this endpoint manually.** ' +
      'Receives signed Stripe events and updates payment status in the database. ' +
      'The raw request body is verified against the `stripe-signature` header using `STRIPE_WEBHOOK_SECRET`. ' +
      '\n\n**Handled events:**' +
      '\n- `checkout.session.completed` → **COMPLETED**' +
      '\n- `checkout.session.async_payment_succeeded` → **COMPLETED**' +
      '\n- `checkout.session.async_payment_failed` → **FAILED**' +
      '\n- `payment_intent.payment_failed` (card declined) → **FAILED**' +
      '\n- `checkout.session.expired` → **FAILED**',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature header (set automatically by Stripe)',
    required: true,
  })
  @ApiOkResponse({
    description: 'Event received and processed.',
    schema: { example: { received: true } },
  })
  @ApiBadRequestResponse({ description: 'Stripe signature verification failed.' })
  handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.body as Buffer, signature);
  }
}
