import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>("STRIPE_SECRET_KEY")!,
    );
  }

  async createPaymentIntent(dto: CreatePaymentDto, userId: number) {
    try {
      const { amount, currency } = dto;
      const redirectUrl = this.configService.get<string>('APP_URL')!;
      const stripeAmount = Math.round(amount * 100);

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundException(`User #${userId} not found`);
      }

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `${redirectUrl}/api/success`,
        cancel_url: `${redirectUrl}/api/fail`,
        line_items: [
          {
            price_data: {
              currency,
              product_data: { name: 'Payment' },
              unit_amount: stripeAmount,
            },
            quantity: 1,
          },
        ],
        customer_email: user.email,
      });

      const payment = await this.prisma.payment.create({
        data: {
          amount,
          currency,
          status: 'PENDING',
          stripePaymentIntentId: session.id,
          userId,
        },
      });

      this.logger.log(
        `Created Payment #${payment.id} for User #${userId} with Stripe Session ${session.id}`,
      );

      return {
        success: true,
        message: 'Payment intent created successfully',
        data: { paymentId: payment.id, url: session.url },
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      if (err instanceof Stripe.errors.StripeError) {
        this.logger.error(`Stripe error during create intent: ${err.message}`);
        throw new BadRequestException(`Payment creation failed: ${err.message}`);
      }
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`createPaymentIntent failed for User #${userId}: ${message}`);
      throw new InternalServerErrorException('Failed to create payment. Please try again.');
    }
  }

  async findPayment(paymentId: number) {
    try {
      const payment = await this.findOrFail(paymentId);
      return {
        success: true,
        message: 'Payment retrieved successfully',
        data: payment,
      };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`findPayment failed for Payment #${paymentId}: ${message}`);
      throw new InternalServerErrorException('Failed to retrieve payment.');
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.configService.get<string>("STRIPE_WEBHOOK_SECRET")!,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Webhook signature verification failed: ${message}`);
      throw new BadRequestException(
        `Webhook signature verification failed: ${message}`,
      );
    }

    this.logger.log(`Stripe event received: ${event.type}`);

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.payment_status === 'paid') {
            await this.prisma.payment.updateMany({
             where: { stripePaymentIntentId: session.id },
              data: {
                status: 'COMPLETED',
                stripePaymentIntentId: session.id,
              },
            });
            this.logger.log(
              `Checkout Session ${session.id} completed → status set to COMPLETED`,
            );
          }
          break;
        }
        case 'checkout.session.async_payment_succeeded': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: session.id },
            data: {
              status: 'COMPLETED',
              stripePaymentIntentId: session.id,
            },
          });
          this.logger.log(
            `Async payment succeeded for Session ${session.id} → COMPLETED`,
          );
          break;
        }
        case 'checkout.session.async_payment_failed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: session.id },
            data: { status: 'FAILED' },
          });
          this.logger.log(
            `Async payment failed for Session ${session.id} → FAILED`,
          );
          break;
        }
        // Fired when a card is declined at Stripe Checkout
        case 'payment_intent.payment_failed': {
          const pi = event.data.object as Stripe.PaymentIntent;
          const failureMessage =
            pi.last_payment_error?.message ?? 'Unknown reason';
          await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: pi.id },
            data: { status: 'FAILED' },
          });
          this.logger.log(
            `PaymentIntent ${pi.id} failed → FAILED (reason: ${failureMessage})`,
          );
          break;
        }
        // Fired when the Stripe Checkout session expires without payment
        case 'checkout.session.expired': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.prisma.payment.updateMany({
            where: { stripePaymentIntentId: session.id },
            data: { status: 'FAILED' },
          });
          this.logger.log(
            `Checkout Session ${session.id} expired → FAILED`,
          );
          break;
        }
        default:
          this.logger.log(`Unhandled Stripe event type: ${event.type}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Failed to process webhook event "${event.type}": ${message}`,
      );
      throw new InternalServerErrorException('Failed to process webhook event.');
    }

    return { received: true };
  }

  private async findOrFail(paymentId: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { user: { select: { id: true, email: true } } },
    });
    if (!payment) {
      throw new NotFoundException(`Payment #${paymentId} not found`);
    }
    return payment;
  }
}
