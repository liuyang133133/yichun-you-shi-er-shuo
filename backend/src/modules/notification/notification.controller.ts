/**
 * T-007: 用户通知 API Controller
 *
 * 端点：
 *   GET    /api/v1/notifications/me              列表
 *   GET    /api/v1/notifications/unread-count    未读数
 *   POST   /api/v1/notifications/:id/read        标记已读
 *   POST   /api/v1/notifications/read-all        全部已读
 *   DELETE /api/v1/notifications/:id             软删
 *   GET    /api/v1/notifications/settings        偏好列表
 *   PUT    /api/v1/notifications/settings/:event 更新偏好
 */
import {
  Controller, Get, Post, Delete, Put, Param, Query, Body, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';
import { UserNotificationSettingService } from './user-notification-setting.service';
import { DeviceTokenService } from './device-token.service';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { UpdateSettingDto, RegisterDeviceDto, ListNotificationsDto } from './dto/notification.dto';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly settingService: UserNotificationSettingService,
    private readonly deviceService: DeviceTokenService,
  ) {}

  @Get('notifications/me')
  @ApiOperation({ summary: '我的通知列表' })
  list(@CurrentUser() user: JwtPayload, @Query() query: ListNotificationsDto) {
    return this.notificationService.list(BigInt(user.sub), {
      unreadOnly: query.unreadOnly,
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: '未读通知数' })
  async unreadCount(@CurrentUser() user: JwtPayload) {
    const count = await this.notificationService.unreadCount(BigInt(user.sub));
    return { count };
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: '标记单条已读' })
  async markRead(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const r = await this.notificationService.markRead(BigInt(user.sub), BigInt(id));
    return { updated: r.count };
  }

  @Post('notifications/read-all')
  @ApiOperation({ summary: '全部标记已读' })
  async markAllRead(@CurrentUser() user: JwtPayload) {
    const r = await this.notificationService.markAllRead(BigInt(user.sub));
    return { updated: r.count };
  }

  @Delete('notifications/:id')
  @ApiOperation({ summary: '删除通知（软删）' })
  async remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    const r = await this.notificationService.remove(BigInt(user.sub), BigInt(id), BigInt(user.sub));
    return { updated: r.count };
  }

  @Get('notifications/settings')
  @ApiOperation({ summary: '通知偏好列表（8 类事件）' })
  listSettings(@CurrentUser() user: JwtPayload) {
    return this.settingService.list(BigInt(user.sub));
  }

  @Put('notifications/settings/:event')
  @ApiOperation({ summary: '更新某类事件的偏好' })
  upsertSetting(
    @CurrentUser() user: JwtPayload,
    @Param('event') event: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.settingService.upsert(BigInt(user.sub), event as any, dto);
  }

  // ===== 设备 Token =====
  @Post('devices/register')
  @ApiOperation({ summary: '注册推送设备 Token' })
  async registerDevice(@CurrentUser() user: JwtPayload, @Body() dto: RegisterDeviceDto) {
    const r = await this.deviceService.register(BigInt(user.sub), dto);
    return { id: r.id.toString(), platform: r.platform, lastSeenAt: r.lastSeenAt };
  }

  @Delete('devices/:token')
  @ApiOperation({ summary: '注销推送设备 Token' })
  async unregisterDevice(@CurrentUser() user: JwtPayload, @Param('token') token: string) {
    const r = await this.deviceService.unregister(BigInt(user.sub), token);
    return { updated: r.count };
  }
}