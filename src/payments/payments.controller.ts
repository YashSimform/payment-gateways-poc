import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser, JwtPayload } from '../auth/decorators/current-user.decorator';

@ApiTags('Payments')
@ApiBearerAuth('access-token')
@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent')
  @ApiOperation({
    summary: 'Create a Stripe Checkout payment',
    description:
      'Creates a Stripe Checkout Session for the authenticated user and stores a PENDING ' +
      'payment record in the database. Returns the Stripe-hosted checkout URL. ' +
      'The user must open the URL in a browser to complete the payment. ' +
      'Payment status is updated to COMPLETED or FAILED via Stripe webhooks.',
  })
  @ApiBody({ type: CreatePaymentDto })
  @ApiCreatedResponse({
    description: 'Stripe Checkout Session created — open the URL to pay.',
    schema: {
      example: {
        success: true,
        message: 'Payment intent created successfully',
        data: {
          paymentId: 1,
          url: 'https://checkout.stripe.com/c/pay/cs_test_...',
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiNotFoundResponse({ description: 'Authenticated user not found in the database.' })
  @ApiBadRequestResponse({ description: 'Validation failed or Stripe API error.' })
  createPaymentIntent(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentsService.createPaymentIntent(dto, user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment by ID',
    description:
      'Retrieves a single payment record by its database ID. ' +
      'Includes the associated user email. Status reflects the latest Stripe webhook update.',
  })
  @ApiParam({ name: 'id', type: Number, description: 'Payment database ID', example: 1 })
  @ApiOkResponse({
    description: 'Payment record retrieved.',
    schema: {
      example: {
        success: true,
        message: 'Payment retrieved successfully',
        data: {
          id: 1,
          amount: 50,
          currency: 'usd',
          status: 'COMPLETED',
          stripePaymentIntentId: 'cs_test_...',
          userId: 1,
          createdAt: '2026-03-10T06:30:00.000Z',
          updatedAt: '2026-03-10T06:31:00.000Z',
          user: { id: 1, email: 'user@example.com' },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token.' })
  @ApiNotFoundResponse({ description: 'Payment with the given ID not found.' })
  findPayment(@Param('id', ParseIntPipe) id: number) {
    return this.paymentsService.findPayment(id);
  }
}
