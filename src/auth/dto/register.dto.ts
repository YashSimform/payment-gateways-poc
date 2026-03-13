import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Valid email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'secret123', description: 'Password — minimum 6 characters', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;
}
