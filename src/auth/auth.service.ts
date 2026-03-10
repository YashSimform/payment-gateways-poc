import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existing) {
        throw new ConflictException('Email is already registered');
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.user.create({
        data: { email: dto.email, password: hashedPassword },
      });

      this.logger.log(`Registered new user #${user.id} (${user.email})`);

      return {
        success: true,
        message: 'User registered successfully',
        data: { id: user.id, email: user.email },
      };
    } catch (err) {
      if (err instanceof ConflictException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Register failed for ${dto.email}: ${message}`);
      throw new InternalServerErrorException('Registration failed. Please try again.');
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user || !(await bcrypt.compare(dto.password, user.password))) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const token = this.jwtService.sign({ sub: user.id, email: user.email });

      this.logger.log(`User #${user.id} logged in`);

      return {
        success: true,
        message: 'Login successful',
        data: { accessToken: token },
      };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Login failed for ${dto.email}: ${message}`);
      throw new InternalServerErrorException('Login failed. Please try again.');
    }
  }
}
