/**
 * T-018: AgreementController
 *
 * 公开接口（无 auth）：
 *   - GET /api/v1/agreements            返回所有当前生效的协议
 *   - GET /api/v1/agreements/:key       返回指定 key 的当前生效版本
 */

import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { AgreementService } from './agreement.service';

@Controller('agreements')
export class AgreementController {
  constructor(private readonly agreementService: AgreementService) {}

  @Public()
  @Get()
  async findAll() {
    return this.agreementService.findAll();
  }

  @Public()
  @Get(':key')
  async findByKey(@Param('key') key: string) {
    return this.agreementService.findByKey(key);
  }
}
