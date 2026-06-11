import { Controller, Get, Post, Body, Param, Query, ParseIntPipe, DefaultValuePipe, HttpCode } from '@nestjs/common';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * 发送消息
   * POST /api/v1/messages
   */
  @Post()
  send(@CurrentUser() user: JwtPayload, @Body() dto: SendMessageDto) {
    return this.messageService.send(BigInt(user.sub), dto);
  }

  /**
   * 收件箱
   * GET /api/v1/messages/inbox
   */
  @Get('inbox')
  inbox(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.messageService.inbox(BigInt(user.sub), page, pageSize);
  }

  /**
   * 发件箱
   * GET /api/v1/messages/outbox
   */
  @Get('outbox')
  outbox(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.messageService.outbox(BigInt(user.sub), page, pageSize);
  }

  /**
   * 与某人的对话
   * GET /api/v1/messages/with/:userId
   */
  @Get('with/:userId')
  conversation(
    @CurrentUser() user: JwtPayload,
    @Param('userId') otherId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe) pageSize: number,
  ) {
    return this.messageService.conversation(BigInt(user.sub), BigInt(otherId), page, pageSize);
  }

  /**
   * 未读数
   * GET /api/v1/messages/unread-count
   */
  @Get('unread-count')
  unread(@CurrentUser() user: JwtPayload) {
    return this.messageService.unreadCount(BigInt(user.sub));
  }

  /**
   * 全部标记已读
   * POST /api/v1/messages/read-all
   */
  @HttpCode(200)
  @Post('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.messageService.markAllRead(BigInt(user.sub));
  }

  /**
   * 标记单条已读
   * POST /api/v1/messages/:id/read
   */
  @HttpCode(200)
  @Post(':id/read')
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messageService.markRead(BigInt(user.sub), BigInt(id));
  }
}
