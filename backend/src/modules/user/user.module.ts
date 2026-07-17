import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  // [T-024-o 2026-07-16] forwardRef 解决 AuthModule ↔ UserModule 循环
  imports: [forwardRef(() => AuthModule)],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
