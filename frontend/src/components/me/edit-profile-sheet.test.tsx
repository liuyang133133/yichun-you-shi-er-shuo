import { toastMock } from '@/test-utils/toast-mock';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as React from 'react';
import userEvent from '@testing-library/user-event';
import { EditProfileSheet } from './edit-profile-sheet';
import { authApi, userApi, type MeDetail } from '@/lib/api';
import { uploadApi } from '@/lib/api-upload';
import { clearAuth } from '@/lib/auth';

// Mock api 模块
vi.mock('@/lib/api', () => ({
  authApi: {
    me: vi.fn().mockResolvedValue({
      sub: '1',
      phone: '13800000000',
      role: 'user',
      nickname: '小李',
      avatar: null,
    }),
  },
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

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
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
    expect(input).not.toHaveAttribute('maxLength');
    fireEvent.change(input, { target: { value: 'a'.repeat(21) } });
    await user.click(screen.getByTestId('sheet-save'));

    expect(userApi.updateMe).not.toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalledWith('昵称 1-20 字');
  });

  it('bio 81 字 → toast 警告', async () => {
    const user = userEvent.setup();
    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={vi.fn()} />);

    const ta = screen.getByTestId('ep-bio');
    expect(ta).not.toHaveAttribute('maxLength');
    fireEvent.change(ta, { target: { value: 'a'.repeat(81) } });
    await user.click(screen.getByTestId('sheet-save'));

    expect(userApi.updateMe).not.toHaveBeenCalled();
    expect(toastMock.warning).toHaveBeenCalledWith('简介最多 80 字');
  });
});

describe('头像上传', () => {
  let onSaved: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSaved = vi.fn();
  });

  it('选图片 → uploadImage 成功 → 写后读权威头像 + onSaved 通知父', async () => {
    const user = userEvent.setup();
    const uploadedUrl = 'http://example.com/a.webp';
    const authoritativeUrl = 'https://cdn.example.com/a.webp';
    (uploadApi.uploadImage as any).mockResolvedValue({
      url: uploadedUrl,
      size: 100,
      mimeType: 'image/webp',
      filename: 'a.webp',
      uploadedBy: '1',
    });
    (userApi.updateMe as any).mockResolvedValue({ ...meDetail, avatar: uploadedUrl });
    (authApi.me as any).mockResolvedValue({ ...meDetail, avatar: authoritativeUrl });

    render(<EditProfileSheet open meDetail={meDetail} onClose={vi.fn()} onSaved={onSaved} />);
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('avatar-input'), file);

    await waitFor(() => {
      expect(uploadApi.uploadImage).toHaveBeenCalledWith(file);
    });
    await waitFor(() => {
      expect(userApi.updateMe).toHaveBeenCalledWith({ avatar: uploadedUrl });
      expect(authApi.me).toHaveBeenCalledOnce();
    });
    expect(screen.getByRole('img')).toHaveAttribute('src', authoritativeUrl);
    expect(onSaved).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: authoritativeUrl }),
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

  it('avatar 上传后不会重置未保存的 nickname 编辑', async () => {
    const user = userEvent.setup();
    (uploadApi.uploadImage as any).mockResolvedValue({
      url: 'http://example.com/new.webp',
      size: 100,
      mimeType: 'image/webp',
      filename: 'new.webp',
      uploadedBy: '1',
    });
    (userApi.updateMe as any).mockResolvedValue({ ...meDetail, avatar: 'http://example.com/new.webp' });

    // 模拟父组件:onSaved 触发后更新 meDetail prop (真实场景)
    function Wrapper() {
      const [me, setMe] = React.useState(meDetail);
      return (
        <EditProfileSheet
          open
          meDetail={me}
          onClose={vi.fn()}
          onSaved={(next) => setMe(next)}
        />
      );
    }

    render(<Wrapper />);

    // 1. 编辑 nickname
    const input = screen.getByLabelText(/昵称/);
    await user.clear(input);
    await user.type(input, '新昵称');
    expect(input).toHaveValue('新昵称');

    // 2. 上传头像
    const file = new File(['x'], 'a.jpg', { type: 'image/jpeg' });
    await user.upload(screen.getByTestId('avatar-input'), file);

    // 3. 等 onSaved 触发 + 父组件更新 meDetail prop
    await waitFor(() => {
      expect(uploadApi.uploadImage).toHaveBeenCalled();
      expect(userApi.updateMe).toHaveBeenCalledWith({ avatar: 'http://example.com/new.webp' });
    });

    // 4. 关键断言:nickname 不应被重置为 meDetail 的旧值
    expect(input).toHaveValue('新昵称');
  });
});

describe('保存链路', () => {
  let onClose: ReturnType<typeof vi.fn>;
  let onSaved: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    onSaved = vi.fn();
  });

  it('改昵称 → 点保存 → 写后读成功 + 保存期间禁用头像与关闭', async () => {
    const user = userEvent.setup();
    let resolveUpdate!: (value: MeDetail) => void;
    const updatePromise = new Promise<MeDetail>((resolve) => {
      resolveUpdate = resolve;
    });
    (userApi.updateMe as any).mockReturnValue(updatePromise);
    (authApi.me as any).mockResolvedValue({
      ...meDetail,
      nickname: '服务端昵称',
      avatar: 'https://cdn.example.com/avatar.webp',
    });

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
      expect(screen.getByTestId('avatar-change')).toBeDisabled();
    });

    const file = new File(['x'], 'blocked.jpg', { type: 'image/jpeg' });
    fireEvent.change(screen.getByTestId('avatar-input'), { target: { files: [file] } });
    expect(uploadApi.uploadImage).not.toHaveBeenCalled();

    await user.click(screen.getByTestId('sheet-close'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();

    resolveUpdate({ ...meDetail, nickname: '新昵称' });
    await waitFor(() => {
      expect(authApi.me).toHaveBeenCalledOnce();
      expect(toastMock.success).toHaveBeenCalledWith('资料已保存');
      expect(onClose).toHaveBeenCalledOnce();
    });
    expect(onSaved).toHaveBeenCalledWith({
      ...meDetail,
      nickname: '服务端昵称',
      gender: 0,
      bio: '原简介',
      avatar: 'https://cdn.example.com/avatar.webp',
    });
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

  it('PATCH 401 → toast + clearAuth + 跳 /login', async () => {
    vi.useFakeTimers();
    const err = new Error('Token 失效');
    (err as any).status = 401;
    (userApi.updateMe as any).mockRejectedValue(err);

    const origLocation = window.location;
    delete (window as any).location;
    (window as any).location = { href: '' };

    try {
      render(<EditProfileSheet open meDetail={meDetail} onClose={onClose} onSaved={onSaved} />);
      fireEvent.change(screen.getByLabelText(/昵称/), { target: { value: '新昵称' } });
      await act(async () => {
        fireEvent.click(screen.getByTestId('sheet-save'));
      });

      expect(toastMock.error).toHaveBeenCalledWith('登录已过期');
      expect(clearAuth).toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);
      expect(window.location.href).toBe('/login?expired=1');
    } finally {
      (window as any).location = origLocation;
      vi.useRealTimers();
    }
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
