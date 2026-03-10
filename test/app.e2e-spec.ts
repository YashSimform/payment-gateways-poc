import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

describe('Payment Gateway (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/payments (POST)', () => {
    return request(app.getHttpServer())
      .post('/payments')
      .send({ amount: 100, currency: 'USD' })
      .expect(201);
  });

  it('/payments (GET)', () => {
    return request(app.getHttpServer())
      .get('/payments')
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });
});