import { Controller, Post, Headers, Req } from "@nestjs/common";
import { Request } from "express";
import { PaymentsService } from "./payments.service";

@Controller('webhook')
export class WebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.body as Buffer, signature);
  }
}
