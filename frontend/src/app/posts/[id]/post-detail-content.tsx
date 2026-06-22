'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { postApi, favoriteApi, commentApi, reportApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { formatDateTime, formatDate } from '@/lib/date';
import { BoostCta } from '@/components/post/boost-cta';
import { useSearchParams } from 'next/navigation';
import {
  MapPin, Eye, Heart, MessageCircle, User as UserIcon,
  Phone, MessageSquare, ArrowLeft, Calendar, Share2, Flag, ChevronRight,
  Sparkles, BadgeCheck, X, ChevronLeft,
} from 'lucide-react';

const TYPE_META: Record<string, { label: string; gradient: string; emoji: string }> = {
  house:      { label: '房屋',  gradient: 'from-blue-500 via-blue-600 to-indigo-700',    emoji: '🏠' },
  secondhand: { label: '二手',  gradient: 'from-pink-500 via-rose-600 to-fuchsia-700', emoji: '🛍️' },
  job:        { label: '招聘',  gradient: 'from-emerald-500 via-teal-600 to-cyan-700', emoji: '💼' },
  lifebiz:    { label: '便民',  gradient: 'from-amber-500 via-orange-600 to-red-600',    emoji: '📌' },
};

function Field({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="font-medium text-sm">{value}</div>
    </div>
  );
}

function PostDetailContent() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params?.id;
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 互动状态
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [comments, setComments] = useState<any[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDesc, setReportDesc] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  // T-P1-02: contact 个保法 — 单独状态,按需调 contact API
  const [contactInfo, setContactInfo] = useState<{ contactName: string; contactPhone: string; contactWechat: string } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);

  // 图片轮播
  const [imgIdx, setImgIdx] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    postApi.get(id)
      .then(setPost)
      .catch((e) => setError(e?.message || '加载失败'))
      .finally(() => setLoading(false));
  }, [id]);

  // 加载评论
  useEffect(() => {
    if (!id) return;
    commentApi.list(String(id))
      .then((r: any) => setComments(r?.list || r || []))
      .catch(() => {});
  }, [id]);

  // 加载收藏状态
  useEffect(() => {
    if (!id || !getAccessToken()) return;
    favoriteApi.list()
      .then((r: any) => {
        const list = r?.data || r || [];
        setFavorited(list.some((f: any) => String(f.postId ?? f.post?.id) === String(id)));
      })
      .catch(() => {});
  }, [id]);

  // 操作 handlers
  const handleFavorite = async () => {
    if (!getAccessToken()) {
      alert('请先登录');
      return;
    }
    setFavLoading(true);
    try {
      if (favorited) {
        await favoriteApi.remove(String(id));
        setFavorited(false);
      } else {
        await favoriteApi.add({ postId: id });
        setFavorited(true);
      }
    } catch {
      alert('操作失败，请稍后再试');
    } finally {
      setFavLoading(false);
    }
  };

  const handleShare = async () => {
    const shareData = { title: post.title, text: post.title, url: window.location.href };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('链接已复制到剪贴板');
      }
    } catch {
      // 用户取消
    }
  };

  const handleCommentSubmit = async () => {
    if (!getAccessToken()) {
      alert('请先登录');
      return;
    }
    const text = commentText.trim();
    if (!text) return;
    setCommentSubmitting(true);
    try {
      await commentApi.create(String(id), { content: text });
      setCommentText('');
      // 重新加载评论
      const r = await commentApi.list(String(id));
      setComments((r as any)?.list || (r as any) || []);
    } catch {
      alert('发表失败');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!getAccessToken()) {
      alert('请先登录');
      return;
    }
    setReportSubmitting(true);
    try {
      await reportApi.create({ postId: id, reason: reportReason, description: reportDesc });
      alert('举报已提交，感谢反馈');
      setShowReport(false);
      setReportDesc('');
    } catch {
      alert('提交失败');
    } finally {
      setReportSubmitting(false);
    }
  };

  // T-P1-02: handlePhone 改为按需调 contact API
  const handlePhone = async () => {
    if (!getAccessToken()) {
      // 未登录：跳登录页
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }
    if (contactInfo) {
      // 已加载：直接拨号
      if (contactInfo.contactPhone) {
        window.location.href = `tel:${contactInfo.contactPhone}`;
      }
      return;
    }
    // 已登录 + 未加载：调 contact API
    setContactLoading(true);
    try {
      const data = await postApi.getContact(String(id));
      // 后端响应格式: { code, message, data: { contactName, contactPhone, contactWechat } }
      const info = data?.data || data;
      setContactInfo(info);
      if (info?.contactPhone) {
        window.location.href = `tel:${info.contactPhone}`;
      } else {
        alert('该信息发布者未留电话,请通过留言联系');
      }
    } catch (e: any) {
      alert(e?.message || '获取联系方式失败,请稍后再试');
    } finally {
      setContactLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="container max-w-3xl py-12 text-center text-muted-foreground">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-sm">加载中…</p>
      </main>
    );
  }
  if (error || !post) {
    return (
      <main className="container py-20 text-center">
        <div className="text-6xl mb-4">😢</div>
        <p className="text-destructive">{error || '信息不存在'}</p>
        <Link href="/" className="text-primary underline mt-4 inline-block">返回首页</Link>
      </main>
    );
  }

  const meta = TYPE_META[post.type] || TYPE_META.secondhand;
  const isHouse = post.type === 'house' && post.house;
  const isJob = post.type === 'job' && post.job;
  const isSecondhand = post.type === 'secondhand' && post.secondhand;
  const isLifebiz = post.type === 'lifebiz' && post.lifebiz;

  return (
    <main className="container max-w-6xl py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href="/" className="hover:text-foreground">首页</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href={`/?type=${post.type}`} className="hover:text-foreground">
          {meta.label}
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground truncate max-w-[200px]">{post.title}</span>
      </nav>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: 主内容 */}
        <div className="md:col-span-2 space-y-5">
          {/* Hero 图（多图轮播 or 占位渐变）*/}
          <div className={`relative aspect-[16/9] rounded-3xl ${post.images?.length ? 'bg-foreground/5' : `bg-gradient-to-br ${meta.gradient}`} flex items-center justify-center overflow-hidden shadow-lg`}>
            {post.images?.length ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.images[imgIdx]?.url}
                  alt={post.title}
                  className="absolute inset-0 h-full w-full object-contain bg-black/5"
                />
                {post.images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx((i) => (i - 1 + post.images.length) % post.images.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
                      aria-label="上一张"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setImgIdx((i) => (i + 1) % post.images.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow flex items-center justify-center"
                      aria-label="下一张"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {post.images.map((_: any, i: number) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={`h-1.5 rounded-full transition-all ${i === imgIdx ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`}
                          aria-label={`第${i + 1}张`}
                        />
                      ))}
                    </div>
                    <span className="absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-semibold bg-black/60 text-white">
                      {imgIdx + 1} / {post.images.length}
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/15 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
                <div className="relative text-9xl drop-shadow-2xl">{meta.emoji}</div>
              </>
            )}
            <span className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-white/90 text-foreground ring-1 ring-white/40">
              {meta.label}
            </span>
            {post.auditStatus === 'passed' && (
              <span className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md bg-emerald-500/90 text-white flex items-center gap-1">
                <BadgeCheck className="h-3 w-3" /> 已认证
              </span>
            )}
          </div>

          {/* 缩略图条 */}
          {post.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {post.images.map((img: any, i: number) => (
                <button
                  key={img.id || i}
                  onClick={() => setImgIdx(i)}
                  className={`flex-shrink-0 h-16 w-16 rounded-lg overflow-hidden border-2 transition-all ${
                    i === imgIdx ? 'border-primary ring-2 ring-primary/30' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* 标题 + 价格 */}
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <h1 className="font-display text-2xl md:text-3xl font-bold leading-tight">
              {post.title}
            </h1>
            {post.price && (
              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-orange-600">¥{post.price}</span>
                {post.priceUnit && <span className="text-base text-muted-foreground">/ {post.priceUnit}</span>}
                <span className="ml-auto text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                  {post.category?.name}
                </span>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {post.area?.name && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {post.area.name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateTime(post.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {post.viewCount} 浏览
              </span>
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" /> {post.favoriteCount} 收藏
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" /> {post.commentCount} 留言
              </span>
            </div>
          </div>

          {/* 描述 */}
          <div className="rounded-2xl border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              详细描述
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
              {post.description}
            </p>
          </div>

          {/* 房屋详情 */}
          {isHouse && (
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold mb-4">房屋信息</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {post.house.rentalType && <Field label="租赁方式" value={post.house.rentalType} />}
                {post.house.propertyType && <Field label="物业类型" value={post.house.propertyType} />}
                {post.house.decoration && <Field label="装修" value={post.house.decoration} />}
                {post.house.areaSqm && <Field label="面积" value={`${post.house.areaSqm} ㎡`} />}
                {post.house.rooms !== null && post.house.rooms !== undefined && (
                  <Field label="户型" value={`${post.house.rooms}室${post.house.livingRooms || 0}厅${post.house.bathrooms || 0}卫`} />
                )}
                {post.house.floorInfo && <Field label="楼层" value={post.house.floorInfo} />}
                {post.house.orientation && <Field label="朝向" value={post.house.orientation} />}
                {post.house.buildingYear && <Field label="建造年份" value={String(post.house.buildingYear)} />}
                {post.house.communityName && <Field label="小区" value={post.house.communityName} />}
                {post.house.address && <Field label="详细地址" value={post.house.address} />}
              </div>
              {post.house.facilities && post.house.facilities.length > 0 && (
                <div className="mt-5">
                  <div className="text-sm text-muted-foreground mb-2">配套设施</div>
                  <div className="flex flex-wrap gap-2">
                    {post.house.facilities.map((f: string) => (
                      <span key={f} className="px-2.5 py-1 text-xs rounded-full bg-secondary text-secondary-foreground ring-1 ring-border">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 二手详情 */}
          {isSecondhand && (
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold mb-4">商品信息</h2>
              <div className="grid grid-cols-2 gap-4">
                {post.secondhand.categoryName && <Field label="分类" value={post.secondhand.categoryName} />}
                {post.secondhand.condition && <Field label="新旧" value={post.secondhand.condition} />}
                {post.secondhand.originalPrice && <Field label="原价" value={`¥${post.secondhand.originalPrice}`} />}
                {post.secondhand.tradeMethod && <Field label="交易方式" value={post.secondhand.tradeMethod} />}
                {post.secondhand.usageDuration && <Field label="使用时长" value={post.secondhand.usageDuration} />}
              </div>
            </div>
          )}

          {/* 招聘详情 */}
          {isJob && (
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold mb-4">职位信息</h2>
              {post.job.company && (
                <div className="mb-4 p-4 rounded-xl bg-secondary/50 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    {post.job.company.name?.[0] || '?'}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold flex items-center gap-1.5">
                      {post.job.company.name}
                      {post.job.company.verified === 1 && (
                        <BadgeCheck className="h-4 w-4 text-emerald-600" />
                      )}
                    </div>
                    {post.job.company.industry && (
                      <div className="text-xs text-muted-foreground">{post.job.company.industry}</div>
                    )}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                {post.job.jobType && <Field label="工作类型" value={post.job.jobType} />}
                {post.job.salaryMin && <Field label="薪资" value={`¥${post.job.salaryMin} - ${post.job.salaryMax || '面议'} ${post.job.salaryUnit || ''}`} />}
                {post.job.education && <Field label="学历" value={post.job.education} />}
                {post.job.experience && <Field label="经验" value={post.job.experience} />}
                {post.job.recruitCount && <Field label="招聘人数" value={`${post.job.recruitCount} 人`} />}
                {post.job.workCity && <Field label="工作城市" value={post.job.workCity} />}
                {post.job.workAddress && <Field label="工作地址" value={post.job.workAddress} />}
              </div>
              {post.job.welfare && post.job.welfare.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-2">福利待遇</div>
                  <div className="flex flex-wrap gap-2">
                    {post.job.welfare.map((w: string) => (
                      <span key={w} className="px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                        🎁 {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 便民详情 */}
          {isLifebiz && (
            <div className="rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="font-display text-lg font-bold mb-4">便民详情</h2>
              <div className="grid grid-cols-2 gap-4">
                {post.lifebiz.subCategory && <Field label="子分类" value={post.lifebiz.subCategory} />}
                {post.lifebiz.serviceType && <Field label="类型" value={post.lifebiz.serviceType} />}
                {post.lifebiz.validityPeriod && <Field label="有效期" value={post.lifebiz.validityPeriod} />}
              </div>
            </div>
          )}
        </div>

        {/* Right: 卖家卡 + 操作（sticky）*/}
        <div className="space-y-4">
          <div className="sticky top-20 space-y-4">
            {/* 卖家卡 */}
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                  {post.user?.nickname?.[0] || post.contactName?.[0] || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate flex items-center gap-1">
                    {post.user?.nickname || post.contactName || '匿名用户'}
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(post.createdAt)} 发布
                  </div>
                </div>
              </div>

              {/* 联系方式 — T-P1-02: 个保法合规,按需调 contact API */}
              <div className="mt-4 space-y-2 border-t pt-4">
                {/* 已登录 + 已加载 contactInfo: 显示完整 */}
                {contactInfo && (contactInfo.contactPhone || contactInfo.contactWechat) && (
                  <>
                    {contactInfo.contactPhone && (
                      <a
                        href={`tel:${contactInfo.contactPhone}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-primary/5 to-emerald-50 hover:from-primary/10 hover:to-emerald-100 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Phone className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">联系电话</div>
                          <div className="font-bold font-mono text-primary truncate">
                            {contactInfo.contactPhone}
                          </div>
                        </div>
                      </a>
                    )}
                    {contactInfo.contactWechat && (
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary">
                        <div className="h-10 w-10 rounded-lg bg-background flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground">微信号</div>
                          <div className="font-mono truncate">{contactInfo.contactWechat}</div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {/* 已登录 + 未加载: 显示"查看联系方式"按钮(实际是拨打电话按钮触发) */}
                {!contactInfo && getAccessToken() && (
                  <div className="text-sm text-muted-foreground text-center py-3 px-2 rounded-xl bg-secondary/30">
                    点击上方"拨打电话"按钮,登录后即可查看联系方式
                  </div>
                )}
                {/* 未登录: 引导登录 */}
                {!getAccessToken() && (
                  <Link
                    href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname : '/')}`}
                    className="flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors text-sm text-primary"
                  >
                    🔒 登录后查看联系方式
                  </Link>
                )}
              </div>

              {/* 主操作按钮 */}
              <div className="mt-4 space-y-2">
                <Button
                  onClick={handlePhone}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-primary to-emerald-600 shadow-md hover:shadow-lg"
                >
                  <Phone className="mr-2 h-4 w-4" />
                  拨打电话
                </Button>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    className={`rounded-xl ${favorited ? 'text-red-500 border-red-200 bg-red-50' : ''}`}
                    onClick={handleFavorite}
                    disabled={favLoading}
                    title={favorited ? '已收藏' : '收藏'}
                  >
                    <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => document.getElementById('comment-section')?.scrollIntoView({ behavior: 'smooth' })}
                    title="留言"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleShare}
                    title="分享"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
                <button
                  onClick={() => setShowReport(true)}
                  className="w-full text-xs text-muted-foreground hover:text-foreground py-2 flex items-center justify-center gap-1"
                >
                  <Flag className="h-3 w-3" /> 举报此信息
                </button>
              </div>
            </div>

            {/* 安全提示 */}
            <div className="rounded-2xl border bg-amber-50/50 p-4 text-xs text-amber-900/80 leading-relaxed">
              <div className="font-semibold mb-1.5 flex items-center gap-1">⚠️ 防骗提示</div>
              见面交易时请核实对方身份；不轻信"先付款后发货"；高价值物品建议当面验货。
            </div>
          </div>
        </div>
      </div>

      {/* 留言区 */}
      <section id="comment-section" className="mt-8 max-w-3xl mx-auto rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="font-display text-xl font-bold mb-4">
          留言（{comments.length}）
        </h2>
        <div className="flex gap-2 mb-6">
          <Input
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={getAccessToken() ? '发表你的留言…' : '登录后即可留言'}
            maxLength={500}
            disabled={!getAccessToken() || commentSubmitting}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleCommentSubmit();
              }
            }}
          />
          <Button onClick={handleCommentSubmit} disabled={commentSubmitting || !commentText.trim()}>
            {commentSubmitting ? '发表中…' : '发表'}
          </Button>
        </div>
        {comments.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            暂无留言，来抢沙发吧
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="p-3 rounded-xl bg-secondary/50">
                <div className="text-xs text-muted-foreground mb-1">
                  {c.user?.nickname || c.userNickname || '匿名用户'}
                  <span className="ml-2">
                    {c.createdAt ? formatDateTime(c.createdAt) : ''}
                  </span>
                </div>
                <div className="text-sm leading-relaxed">{c.content}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 举报弹窗 */}
      {showReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">举报信息</h3>
              <button onClick={() => setShowReport(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">举报原因</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="spam">垃圾广告</option>
                  <option value="fake">虚假信息</option>
                  <option value="illegal">违法违规</option>
                  <option value="duplicate">重复发布</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">补充说明（可选）</label>
                <textarea
                  value={reportDesc}
                  onChange={(e) => setReportDesc(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="请描述具体情况…"
                  maxLength={500}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowReport(false)}>取消</Button>
                <Button
                  onClick={handleReportSubmit}
                  disabled={reportSubmitting}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {reportSubmitting ? '提交中…' : '提交举报'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Boost CTA — 显示条件: ?justPublished=1 */}
      {searchParams?.get('justPublished') === '1' && (
        <BoostCta postId={post.id} qualityScore={post.qualityScore} />
      )}
    </main>
  );
}


export { PostDetailContent };

