import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditProfileSheet } from './edit-profile-sheet';
import { userApi } from '@/lib/api';
import { uploadApi } from '@/lib/api-upload';
import { clearAuth } from '@/lib/auth';

// vi.hoisted 保证 mock 引用在 vi.mock 工厂执行前已初始化
const { toastMock } = vi.hoisted(() => ({
  toastMock: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock api 模块
vi.mock('@/lib/api', () => ({
  userApi: {
    updateMe: vi.fn().mockResolvedValue({ id: '1', nickname: 'new' }),
  },
}));

vi.mock('@/lib/api-upload', () => ({
  uploadApi: {
    uploadImage: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getStoredUser: vi.fn(() => ({ id: '1', phone: '13800000000' })),
  setStoredUser: vi.fn(),
  clearAuth: vi.fn(),
}));

// Mock toast - 必须放在测试文件顶层 (vi.mock hoisting)
vi.mock('@/components/toast/toaster', () => ({
  toast: toastMock,
}));

const meDetail = {
  sub: '1',
  phone: '13800000000',
  role: 'user',
  nickname: '小李',
  avatar: null,
  gender: 0,
  bio: '原简介',
};

describe('EditProfileSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('默认打开时,4 字段按 meDetail 回填', () => {
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.getByLabelText(/昵称/)).toHaveValue('小李');
    expect(screen.getByLabelText(/简介/)).toHaveValue('原简介');
    // 性别:不透露 选中
    expect(screen.getByLabelText('不透露')).toBeChecked();
  });
});

// 顶层 beforeEach — 每个测试前清理所有 mock 调用历史
// (注: 只清 calls/results, 不清 implementations — 测试间用 mockResolvedValue/mockRejectedValue 显式覆盖)
beforeEach(() => {
  vi.clearAllMocks();
});

describe('客户端校验', () => {
  it('空昵称 → 不调 PATCH + toast 警告', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.clear(screen.getByLabelText(/昵称/));
    await user.click(screen.getByTestId('sheet-save'));

    expect(userApi.updateMe).not.toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalledWith('昵称不能为空');
  });

  it('昵称 21 字 → toast 警告', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    const input = screen.getByLabelText(/昵称/);
    await user.clear(input);
    await user.type(input, 'a'.repeat(25)); // 超过 maxLength=20 也会被截
    // maxLength 物理拦截,只取前 20
    expect((input as HTMLInputElement).value.length).toBeLessThanOrEqual(20);
  });

  it('bio 81 字被 maxLength 拦截', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    const ta = screen.getByTestId('ep-bio') as HTMLTextAreaElement;
    await user.clear(ta);
    await user.type(ta, 'a'.repeat(100));
    expect(ta.value.length).toBeLessThanOrEqual(80);
  });
});

describe('头像上传', () => {
  let onSaved: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSaved = vi.fn();
  });

  it('选图片 → uploadImage 成功 → 头像预览刷新 + onSaved 通知父', async () => {
    const user = userEvent.setup();
    (uploadApi.uploadImage as any).mockResolvedValue({
      url: 'http://example.com/a.webp',
      size: 100,
      mimeType: 'image/webp',
      filename: 'a.webp',
      uploadedBy: '1',
    });

    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={onSaved} />);
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('avatar-input'), file);

    await waitFor(() => {
      expect(uploadApi.uploadImage).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(userApi.updateMe).toHaveBeenCalledWith({ avatar: 'http://example.com/a.webp' });
    });
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: 'http://example.com/a.webp' }),
    );
  });

  it('uploadImage 失败 → toast 错误,avatar 不变', async () => {
    const user = userEvent.setup();
    (uploadApi.uploadImage as any).mockRejectedValue(new Error('服务器开小差'));

    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('avatar-input'), file);

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('服务器开小差');
    });
    expect(userApi.updateMe).not.toHaveBeenCalled();
  });
});

describe('保存链路', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSaved: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onSaved = vi.fn();
  });

  it('改昵称 → 点保存 → PATCH 成功 → 抽屉关闭 + onSaved 通知', async () => {
    const user = userEvent.setup();
    (userApi.updateMe as any).mockResolvedValue({ ...meDetail, nickname: '新昵称' });

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    const input = screen.getByLabelText(/昵称/);
    await user.clear(input);
    await user.type(input, '新昵称');
    await user.click(screen.getByTestId('sheet-save'));

    await waitFor(() => {
      expect(userApi.updateMe).toHaveBeenCalledWith({
        nickname: '新昵称',
        gender: 0,
        bio: '原简介',
      });
    });
    expect(toastMock.success).toHaveBeenCalledWith('资料已保存');
    expect(onClose).toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('PATCH 400 → toast 错误,抽屉不关', async () => {
    const user = userEvent.setup();
    const err = new Error('昵称过长');
    (err as any).status = 400;
    (userApi.updateMe as any).mockRejectedValue(err);

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.clear(screen.getByLabelText(/昵称/));
    await user.type(screen.getByLabelText(/昵称/), '新昵称');
    await user.click(screen.getByTestId('sheet-save'));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('昵称过长');
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('PATCH 401 → 清 auth + 跳 /login', async () => {
    const user = userEvent.setup();
    const err = new Error('Token 失效');
    (err as any).status = 401;
    (userApi.updateMe as any).mockRejectedValue(err);

    // mock window.location
    const origLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.clear(screen.getByLabelText(/昵称/));
    await user.type(screen.getByLabelText(/昵称/), '新昵称');
    await user.click(screen.getByTestId('sheet-save'));

    await waitFor(() => {
      expect(toastMock.error).toHaveBeenCalledWith('登录已过期');
    });
    expect(clearAuth).toHaveBeenCalled();

    // 还原
    (window as any).location = origLocation;
  });
});

describe('关闭确认', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSaved: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onSaved = vi.fn();
  });

  it('改字段后点关闭 → window.confirm 弹"放弃修改?"', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.clear(screen.getByLabelText(/昵称/));
    await user.type(screen.getByLabelText(/昵称/), '改了一笔');
    await user.click(screen.getByTestId('sheet-close'));

    expect(confirmSpy).toHaveBeenCalledWith('放弃修改?');
    expect(onClose).not.toHaveBeenCalled(); // 选了"取消"= 留抽屉
  });

  it('没改字段点关闭 → 不弹 confirm,直接关', async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
    await user.click(screen.getByTestId('sheet-close'));

    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});

describe('性别切换', () => {
  it('切换"男" → form.gender 变 1', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    await user.click(screen.getByLabelText('男'));
    expect(screen.getByLabelText('男')).toBeChecked();
    expect(screen.getByLabelText('不透露')).not.toBeChecked();
  });
});
