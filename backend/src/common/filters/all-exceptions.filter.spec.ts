/**
 * V1.1: AllExceptionsFilter 单元测试
 *
 * 覆盖 4 类异常 → 状态码映射:
 * 1. HttpException → 用其 getStatus() (保持原样)
 * 2. PayloadTooLargeError → 413 (不 500)
 * 3. SyntaxError (entity.parse.failed) → 400 (不 500)
 * 4. BadRequestError (body-parser 旧版本) → 400 (不 500)
 * 5. 普通 Error → 500
 * 6. 未知异常 (string/object) → 500
 *
 * 验证响应统一格式: { code, message, data, error, path, timestamp }
 */
import { HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockHost: any;
  let mockResponse: any;
  let mockRequest: any;
  let responseJson: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    responseJson = null;
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn((body) => { responseJson = body; return mockResponse; }),
    };
    mockRequest = { method: 'POST', url: '/api/v1/test' };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  /** 工具: 跑 filter, 拿回 json */
  function run(exception: unknown) {
    responseJson = null;
    filter.catch(exception, mockHost);
    return responseJson;
  }

  describe('HttpException', () => {
    it('NotFoundException → 404 + message', () => {
      const j = run(new NotFoundException('资源不存在'));
      expect(j.code).toBe(404);
      expect(j.message).toContain('资源不存在');
      expect(j.error).toBe('Not Found');
    });

    it('BadRequestException → 400 + message', () => {
      const j = run(new BadRequestException('参数错误'));
      expect(j.code).toBe(400);
      expect(j.message).toContain('参数错误');
    });

    it('HttpException with object response (含 data) → 保留 data 字段', () => {
      const exc = new HttpException(
        { message: '服务降级', error: 'Service Unavailable', data: { reason: 'redis down' } },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      const j = run(exc);
      expect(j.code).toBe(503);
      expect(j.data).toEqual({ reason: 'redis down' });
    });
  });

  describe('body-parser errors (V1.1 P0 fix)', () => {
    it('PayloadTooLargeError → 413 (不 500)', () => {
      const err: any = new Error('request entity too large');
      err.name = 'PayloadTooLargeError';
      const j = run(err);
      expect(j.code).toBe(413);
      expect(j.message).toContain('请求体过大');
      expect(j.error).toBe('Payload Too Large');
    });

    it('entity.too.large type (express body-parser v1) → 413', () => {
      const err: any = new Error('request entity too large');
      err.name = 'PayloadTooLargeError';
      err.type = 'entity.too.large';
      const j = run(err);
      expect(j.code).toBe(413);
    });

    it('SyntaxError entity.parse.failed (JSON 解析失败) → 400 (不 500)', () => {
      const err: any = new SyntaxError('Unexpected token x in JSON at position 0');
      err.type = 'entity.parse.failed';
      const j = run(err);
      expect(j.code).toBe(400);
      expect(j.message).toContain('JSON 解析失败');
      expect(j.error).toBe('Bad Request');
    });

    it('BadRequestError with body-parser message → 400', () => {
      const err = new Error('request size + body-parser invalid');
      err.name = 'BadRequestError';
      const j = run(err);
      expect(j.code).toBe(400);
      expect(j.message).toBe('请求体格式错误');
    });
  });

  describe('其他 Error', () => {
    it('普通 Error → 500', () => {
      const j = run(new Error('数据库连接超时'));
      expect(j.code).toBe(500);
      expect(j.message).toBe('数据库连接超时');
      expect(j.error).toBe('Error');
    });

    it('TypeError → 500', () => {
      const j = run(new TypeError('Cannot read property of undefined'));
      expect(j.code).toBe(500);
      expect(j.error).toBe('TypeError');
    });
  });

  describe('未知异常', () => {
    it('string exception → 500', () => {
      const j = run('未知错误字符串');
      expect(j.code).toBe(500);
      expect(j.message).toBe('服务器内部错误');
    });

    it('null exception → 500', () => {
      const j = run(null);
      expect(j.code).toBe(500);
    });
  });

  describe('响应统一格式', () => {
    it('所有响应含 code/message/data/error/path/timestamp 字段', () => {
      const j = run(new NotFoundException('test'));
      expect(j).toHaveProperty('code');
      expect(j).toHaveProperty('message');
      expect(j).toHaveProperty('data');
      expect(j).toHaveProperty('error');
      expect(j).toHaveProperty('path', '/api/v1/test');
      expect(j).toHaveProperty('timestamp');
      expect(typeof j.timestamp).toBe('string');
      // timestamp 应该是 ISO 8601
      expect(new Date(j.timestamp).toString()).not.toBe('Invalid Date');
    });
  });
});