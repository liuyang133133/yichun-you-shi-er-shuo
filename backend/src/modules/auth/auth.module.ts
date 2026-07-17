import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserModule } from '../user/user.module';
import { SmsModule } from '../sms/sms.module';
import { CaptchaModule } from '../captcha/captcha.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d'),
          },
        };
      },
    }),
    forwardRef(() => UserModule),
    SmsModule,
    // SHOULD-9: 人机验证 + 注册限频
    CaptchaModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, JwtModule, JwtAuthGuard, CaptchaModule],
})
export class AuthModule {}
