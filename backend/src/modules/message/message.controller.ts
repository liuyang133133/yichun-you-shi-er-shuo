import { Controller, Get, Post, Body, Param, Query, Delete, ParseIntPipe, DefaultValuePipe, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MessageService } from './message.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';

@ApiTags('messages')
@ApiBearerAuth('JWT')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * 发送消息
   * POST /api/v1/messages
   */
  @Post()
  @ApiOperation({ summary: '发送站内信' })
  send(@CurrentUser() user: JwtPayload, @Body() dto: SendMessageDto) {
    return this.messageService.send(BigInt(user.sub), dto);
  }

  /**
   * 收件箱
   * GET /api/v1/messages/inbox
   */
  @Get('inbox')
  @ApiOperation({ summary: '收件箱' })
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
  @ApiOperation({ summary: '发件箱' })
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
  @ApiOperation({ summary: '与某人的对话' })
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
  @ApiOperation({ summary: '未读消息数' })
  unread(@CurrentUser() user: JwtPayload) {
    return this.messageService.unreadCount(BigInt(user.sub));
  }

  /**
   * 全部标记已读
   * POST /api/v1/messages/read-all
   */
  @HttpCode(200)
  @Post('read-all')
  @ApiOperation({ summary: '全部标记已读' })
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.messageService.markAllRead(BigInt(user.sub));
  }

  /**
   * 标记单条已读
   * POST /api/v1/messages/:id/read
   */
  @HttpCode(200)
  @Post(':id/read')
  @ApiOperation({ summary: '标记单条已读' })
  markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.messageService.markRead(BigInt(user.sub), BigInt(id));
  }

  // ============== [D-P0-03] P0 修复: 撤回 + 隐藏 ==============

  /**
   * 撤回消息 (发送方, 5 分钟内)
   * POST /api/v1/messages/:id/recall
   * - 未读: 硬删
   * - 已读: 软删
   */
  @HttpCode(200)
  @Post(':id/recall')
  @ApiOperation({ summary: '撤回消息 (发送方, 5分钟内)' })
  recall(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messageService.recall(BigInt(user.sub), BigInt(id));
  }

  /**
   * 隐藏消息 (收发双方)
   * DELETE /api/v1/messages/:id
   */
  @HttpCode(200)
  @Delete(':id')
  @ApiOperation({ summary: '隐藏消息 (收发双方)' })
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.messageService.remove(BigInt(user.sub), BigInt(id));
  }
}
