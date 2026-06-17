import { redactPii } from './pii-redact.util';

describe('redactPii', () => {
  it('脱敏 11 位手机号', () => {
    expect(redactPii('联系我 13812345678')).toBe('联系我 138****5678');
  });

  it('脱敏微信号 (加 v/微信号前缀)', () => {
    expect(redactPii('加我微信 abc123def')).toBe('加我微信 wx_****');
    expect(redactPii('加v:  zhang_san_2025')).toBe('加v:  wx_****');
    expect(redactPii('微信号：my_wx_id_99')).toBe('微信号：wx_****');
  });

  it('脱敏身份证 18 位', () => {
    expect(redactPii('身份证 110101199003078888')).toBe('身份证 110***********8888');
  });

  it('脱敏银行卡 16-19 位数字串', () => {
    expect(redactPii('卡号 6222021234567890')).toBe('卡号 ****');
  });

  it('脱敏邮箱', () => {
    expect(redactPii('邮箱 zhang.san_2024@example.com')).toBe('邮箱 e_****@****.com');
  });

  it('无 PII 文本原样返回', () => {
    expect(redactPii('南郡精装两室 1200/月 拎包入住')).toBe('南郡精装两室 1200/月 拎包入住');
  });

  it('混合 PII 全部脱敏', () => {
    const input = '联系我 13812345678 或 zhang.san@example.com 身份证 110101199003078888';
    const output = redactPii(input);
    expect(output).not.toContain('13812345678');
    expect(output).not.toContain('zhang.san@example.com');
    expect(output).not.toContain('110101199003078888');
  });

  it('边界: 短串不被误判 (10 位数字)', () => {
    expect(redactPii('订单 1234567890')).toBe('订单 1234567890');
  });
});
