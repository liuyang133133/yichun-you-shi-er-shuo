'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { RewritePopover } from '@/components/ai/rewrite-popover';
import { TagSelector } from '@/components/post/tag-selector';
import { postApi, categoryApi, areaApi, uploadApi, buildPostUrl } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { Home, ShoppingBag, Briefcase, Megaphone, ArrowLeft, ArrowRight, Check, Upload, X, ImageIcon, Loader2, Hash } from 'lucide-react';

const TYPE_OPTIONS = [
  { code: 'house', title: '房屋租售', icon: Home, gradient: 'from-blue-500 to-indigo-600' },
  { code: 'secondhand', title: '二手交易', icon: ShoppingBag, gradient: 'from-pink-500 to-fuchsia-600' },
  { code: 'job', title: '招聘求职', icon: Briefcase, gradient: 'from-emerald-500 to-teal-600' },
  { code: 'lifebiz', title: '便民信息', icon: Megaphone, gradient: 'from-amber-500 to-red-600' },
] as const;

const RENTAL_TYPES = ['整租', '合租', '短租', '日租'];
const PROPERTY_TYPES = ['小区', '公寓', '民房', '商铺', '写字楼', '其他'];
const DECORATIONS = ['精装', '简装', '毛坯', '豪装'];
const COMMON_FACILITIES = ['空调', '洗衣机', '冰箱', '热水器', '床', '衣柜', '宽带', '电视', '沙发', '厨房'];

export default function ManualPublishMode() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <ManualPublishForm />
    </Suspense>
  );
}

function ManualPublishForm() {
  const router = useRouter();
  const search = useSearchParams();
  const type = (search.get('type') as 'house' | 'secondhand' | 'job' | 'lifebiz') || 'house';

  // Phase 1: read prefill_* URL params and apply as initial form state.
  // No complex mapping (e.g. prefill_layout -> rooms/livingRooms) is performed.
  const prefillTitle = search.get('prefill_title') || '';
  const prefillPrice = search.get('prefill_price') || '';
  const prefillAreaName = search.get('prefill_areaName') || '';
  const prefillDescription = search.get('prefill_description') || '';
  // T-014: AI 模式传来的预选 tagIds（CSV "1,2,3" → [1,2,3]）
  const prefillTagIdsCsv = search.get('prefill_tagIds') || '';
  const prefillTagIds = prefillTagIdsCsv
    ? prefillTagIdsCsv
        .split(',')
        .map((s) => Number(s))
        .filter((n) => Number.isFinite(n) && n > 0)
    : [];

  const [loggedIn, setLoggedIn] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string; parentId?: string | null }>>([]);
  const [areas, setAreas] = useState<Array<{ id: string; name: string; level: number }>>([]);

  const [title, setTitle] = useState(prefillTitle);
  const [description, setDescription] = useState(prefillDescription);
  const [price, setPrice] = useState(prefillPrice);
  const [priceUnit, setPriceUnit] = useState('元/月');
  const [categoryId, setCategoryId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const [rentalType, setRentalType] = useState('整租');
  const [propertyType, setPropertyType] = useState('小区');
  const [decoration, setDecoration] = useState('精装');
  const [areaSqm, setAreaSqm] = useState('');
  const [rooms, setRooms] = useState('2');
  const [livingRooms, setLivingRooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [floorInfo, setFloorInfo] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [facilities, setFacilities] = useState<string[]>(['空调', '洗衣机', '冰箱']);

  // 二手字段
  const [shCategory, setShCategory] = useState('数码电器');
  const [shCondition, setShCondition] = useState('9成新');
  const [shOriginalPrice, setShOriginalPrice] = useState('');
  const [shTradeMethod, setShTradeMethod] = useState('同城自提');
  const [shUsageDuration, setShUsageDuration] = useState('');

  // 招聘字段
  const [jobCompanyId, setJobCompanyId] = useState('');
  const [jobType, setJobType] = useState('全职');
  const [jobSalaryMin, setJobSalaryMin] = useState('');
  const [jobSalaryMax, setJobSalaryMax] = useState('');
  const [jobSalaryUnit, setJobSalaryUnit] = useState('元/月');
  const [jobEducation, setJobEducation] = useState('不限');
  const [jobExperience, setJobExperience] = useState('不限');
  const [jobIndustry, setJobIndustry] = useState('');
  const [jobWelfare, setJobWelfare] = useState('');
  const [jobRecruitCount, setJobRecruitCount] = useState('1');
  const [jobWorkCity, setJobWorkCity] = useState('伊春');
  const [jobWorkAddress, setJobWorkAddress] = useState('');

  // 便民字段
  const [lbSubCategory, setLbSubCategory] = useState('顺风车');
  const [lbServiceType, setLbServiceType] = useState('提供');
  const [lbPriceText, setLbPriceText] = useState('');
  const [lbValidityPeriod, setLbValidityPeriod] = useState('一周');

  const [step, setStep] = useState(1); // 1=基本信息 2=详细参数 3=联系发布
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 图片上传
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // T-014: 标签选择（最多 5 个，AI prefill 来的优先）
  const [tagIds, setTagIds] = useState<number[]>(prefillTagIds);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    setLoggedIn(true);
    categoryApi.list().then((r: any) => setCategories(r || []));
    areaApi.findTree().then((r: any) => {
      const flat: any[] = [];
      const walk = (nodes: any[]) => {
        for (const n of nodes || []) {
          if (n.level >= 2) flat.push(n);
          if (n.children?.length) walk(n.children);
        }
      };
      walk(r || []);
      setAreas(flat);
    });
  }, [router]);

  useEffect(() => {
    setPriceUnit(type === 'house' ? '元/月' : '元');
    setStep(1); // 切 type 重置
  }, [type]);

  const subCategories = (() => {
    // V1.0 子分类重整后，subCategories 的 code 是独立（如 'house-rental'），与顶级 code（'house'）不同
    // 修复：先按顶级 code 找父分类，再按 parentId 拿子分类（home-content.tsx 同款逻辑）
    const parentCategory = categories.find(
      (c) => c.code === type && (c.parentId == null || c.parentId === '' || c.parentId === '0'),
    );
    if (!parentCategory) return [];
    const seen = new Set<string>();
    return categories
      .filter((c) => String(c.parentId) === String(parentCategory.id))
      .filter((c) => {
        const key = `${c.parentId ?? 'top'}:${c.name}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  })();
  const currentTypeMeta = TYPE_OPTIONS.find((t) => t.code === type);
  const Icon = currentTypeMeta?.icon;

  function toggleFacility(f: string) {
    setFacilities((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remain = 9 - imageUrls.length;
    if (remain <= 0) {
      setError('最多上传 9 张图片');
      return;
    }
    const list = Array.from(files).slice(0, remain);
    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of list) {
        if (!f.type.startsWith('image/')) continue;
        const r = await uploadApi.image(f);
        if (r?.url) uploaded.push(r.url);
      }
      setImageUrls((prev) => [...prev, ...uploaded]);
    } catch (e: any) {
      setError(e?.message || '图片上传失败');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function removeImage(idx: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveCover(idx: number) {
    // 把 idx 移到第一位（设为封面）
    setImageUrls((prev) => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      return [picked, ...next];
    });
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (!title.trim()) return '请输入标题';
      if (!categoryId) return '请选择分类';
    }
    if (s === 2) {
      if (!description.trim() || description.trim().length < 10) return '描述至少 10 字符';
    }
    if (s === 3) {
      if (!contactPhone.trim()) return '请输入联系电话';
    }
    return null;
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(3, s + 1));
  }
  function prevStep() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    const err = validateStep(3);
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      // 根据 validityPeriod 计算 expireAt
      const now = new Date();
      const periodMap: Record<string, number | null> = {
        '一天': 1,
        '一周': 7,
        '一个月': 30,
        '长期': null,
      };
      const days = periodMap[lbValidityPeriod];
      const expireAt = days === null ? undefined : new Date(now.getTime() + days * 86400000).toISOString();

      // 组装 detail（按 type 分支）
      let detail: any = undefined;
      if (type === 'house') {
        detail = {
          rentalType, propertyType, decoration,
          areaSqm: areaSqm ? Number(areaSqm) : undefined,
          rooms: Number(rooms), livingRooms: Number(livingRooms), bathrooms: Number(bathrooms),
          floorInfo: floorInfo || undefined,
          communityName: communityName || undefined,
          facilities: facilities.length > 0 ? facilities : undefined,
        };
      } else if (type === 'secondhand') {
        detail = {
          categoryName: shCategory,
          condition: shCondition,
          originalPrice: shOriginalPrice ? Number(shOriginalPrice) : undefined,
          tradeMethod: shTradeMethod,
          usageDuration: shUsageDuration || undefined,
        };
      } else if (type === 'job') {
        // [P0-fix] 不再硬编码 companyId=1；后端会按需自动创建"个人招聘·{phone 后 4 位}"公司
        // 仅当用户在 admin 端通过 /admin/companies 显式建过公司并选了 jobCompanyId 时才传
        detail = {
          ...(jobCompanyId ? { companyId: Number(jobCompanyId) } : {}),
          jobType,
          salaryMin: jobSalaryMin ? Number(jobSalaryMin) : undefined,
          salaryMax: jobSalaryMax ? Number(jobSalaryMax) : undefined,
          salaryUnit: jobSalaryUnit,
          education: jobEducation,
          experience: jobExperience,
          industry: jobIndustry || undefined,
          welfare: jobWelfare ? jobWelfare.split(/[,，;；\s]+/).filter(Boolean) : undefined,
          recruitCount: jobRecruitCount ? Number(jobRecruitCount) : undefined,
          workCity: jobWorkCity || undefined,
          workAddress: jobWorkAddress || undefined,
        };
      } else if (type === 'lifebiz') {
        detail = {
          subCategory: lbSubCategory,
          serviceType: lbServiceType,
          price: price ? Number(price) : undefined,
          priceText: lbPriceText || undefined,
          validityPeriod: lbValidityPeriod,
          expireAt,
        };
      }

      // 单次提交（后端事务内同时写主表 + detail + images）
      const post = await postApi.create({
        type,
        title,
        description,
        price: price ? Number(price) : undefined,
        priceUnit,
        categoryId: Number(categoryId),
        areaId: areaId ? Number(areaId) : undefined,
        contactName: contactName || undefined,
        contactPhone: contactPhone || undefined,
        detail,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        // T-014: 标签关联（后端 CreatePostDto Max=5，事务内 attachToPost）
        tagIds: tagIds.length > 0 ? tagIds : undefined,
      } as any);
      // F-3 V2: 跳详情页走 slug 格式 /posts/[id]-[slug]
      router.push(buildPostUrl(post));
    } catch (e: any) {
      setError(e?.message || '发布失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!loggedIn) {
    return <main className="container py-20 text-center text-muted-foreground">跳转登录中…</main>;
  }

  const steps = [
    { n: 1, label: '基本信息' },
    { n: 2, label: '详细描述' },
    { n: 3, label: '联系方式' },
  ];

  return (
    <main className="container max-w-3xl py-8 space-y-6">
      <Link href={`/?type=${type}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1" /> 返回
      </Link>

      {/* 步骤条 */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1">
            <div className={`flex items-center gap-2 ${step >= s.n ? 'text-primary' : 'text-muted-foreground'}`}>
              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                step > s.n
                  ? 'bg-primary text-white'
                  : step === s.n
                  ? 'bg-primary text-white shadow-lg scale-110'
                  : 'bg-secondary text-muted-foreground'
              }`}>
                {step > s.n ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 transition-all ${
                step > s.n ? 'bg-primary' : 'bg-border'
              }`} />
            )}
          </div>
        ))}
      </div>

      <Card className="overflow-hidden">
        {/* Banner */}
        <div className={`bg-gradient-to-r ${currentTypeMeta?.gradient} text-white p-5`}>
          <div className="flex items-center gap-3">
            {Icon && <Icon className="h-6 w-6" />}
            <div>
              <div className="font-display text-xl font-bold">发布{currentTypeMeta?.title}</div>
              <div className="text-white/80 text-xs mt-0.5">步骤 {step} / 3 · {steps[step - 1].label}</div>
            </div>
          </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-6">
          {/* 类型切换 — 4 大模块 */}
          <div className="-mx-2 px-2 overflow-x-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-fit">
              {TYPE_OPTIONS.map((t) => {
                const TIcon = t.icon;
                return (
                  <Link key={t.code} href={`/posts/publish?type=${t.code}`}>
                    <div className={`p-2 sm:p-3 rounded-xl text-center transition-all min-w-[68px] ${
                      type === t.code
                        ? `bg-gradient-to-br ${t.gradient} text-white shadow-md scale-105`
                        : 'bg-secondary text-muted-foreground hover:bg-secondary/70'
                    }`}>
                      <TIcon className="h-5 w-5 mx-auto mb-1" />
                      <div className="text-[11px] sm:text-xs font-medium whitespace-nowrap">{t.title}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Step 1: 基本信息 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="title" className="text-sm">标题 <span className="text-destructive">*</span></Label>
                  <RewritePopover
                    type={type}
                    field="title"
                    original={title}
                    context={{ price, priceUnit, rentalType, areaSqm, rooms, livingRooms, communityName }}
                    onApply={(t) => setTitle(t)}
                  />
                </div>
                <Input id="title" placeholder="一句话描述你的信息" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} className="h-11" />
                <div className="text-xs text-muted-foreground text-right">{title.length}/100</div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">分类 <span className="text-destructive">*</span></Label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">请选择</option>
                    {subCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">所在区域</Label>
                  <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">请选择</option>
                    {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {prefillAreaName && !areaId && (
                    <div className="text-xs text-muted-foreground">AI 建议区域：<span className="text-primary">{prefillAreaName}</span>（请从下拉确认）</div>
                  )}
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">价格</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} className="h-11" />
                    <select value={priceUnit} onChange={(e) => setPriceUnit(e.target.value)} className="h-11 rounded-md border border-input bg-background px-2 text-sm">
                      <option value="元/月">元/月</option>
                      <option value="元/天">元/天</option>
                      <option value="元/时">元/时</option>
                      <option value="元">元</option>
                      <option value="面议">面议</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: 详细描述 */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              {/* 图片上传区 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">上传图片 <span className="text-muted-foreground">（最多 9 张，第一张为封面）</span></Label>
                  <span className="text-xs text-muted-foreground">{imageUrls.length} / 9</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageFiles(e.target.files)}
                />
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {imageUrls.map((url, idx) => (
                    <div key={url + idx} className="relative group aspect-square rounded-lg overflow-hidden border bg-secondary">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`图片${idx + 1}`} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => moveCover(idx)}
                            className="px-2 py-1 rounded bg-white/90 text-xs font-medium hover:bg-white"
                            title="设为封面"
                          >
                            封面
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="p-1.5 rounded-full bg-red-500/90 text-white hover:bg-red-600"
                          title="删除"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      {idx === 0 && (
                        <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary text-white">
                          封面
                        </span>
                      )}
                    </div>
                  ))}
                  {imageUrls.length < 9 && (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 flex flex-col items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">添加图片</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" />
                  支持 jpg/png/webp/gif，单张不超过 5MB。建议上传实拍图，分类信息无图难以成交。
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="desc" className="text-sm">详细描述 <span className="text-destructive">*</span></Label>
                  <RewritePopover
                    type={type}
                    field="description"
                    original={description}
                    context={{ title, price, priceUnit, rentalType, areaSqm, communityName }}
                    onApply={(t) => setDescription(t)}
                  />
                </div>
                <textarea
                  id="desc"
                  rows={8}
                  placeholder="尽量详细描述：位置、配置、状况、有效期等…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed"
                />
                <div className="text-xs text-muted-foreground text-right">{description.length}/5000</div>
              </div>

              {/* T-014: 标签选择（最多 5 个，AI prefill 来的优先） */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 text-emerald-600" />
                  <Label className="text-sm">标签（可选）</Label>
                </div>
                <TagSelector value={tagIds} onChange={setTagIds} max={5} />
              </div>

              {/* 房屋专属字段 */}
              {type === 'house' && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Home className="h-4 w-4" /> 房屋详情
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">租赁方式</Label>
                      <select value={rentalType} onChange={(e) => setRentalType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {RENTAL_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">物业类型</Label>
                      <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {PROPERTY_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">装修</Label>
                      <select value={decoration} onChange={(e) => setDecoration(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        <option value="">无</option>
                        {DECORATIONS.map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">面积 (㎡)</Label>
                      <Input type="number" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} placeholder="78" className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">室</Label>
                      <Input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} min={0} className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">厅</Label>
                      <Input type="number" value={livingRooms} onChange={(e) => setLivingRooms(e.target.value)} min={0} className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">卫</Label>
                      <Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} min={0} className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">楼层</Label>
                      <Input value={floorInfo} onChange={(e) => setFloorInfo(e.target.value)} placeholder="如 5/18层" className="h-10" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">小区名</Label>
                    <Input value={communityName} onChange={(e) => setCommunityName(e.target.value)} placeholder="如 万象城" className="h-10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">配套设施</Label>
                    <div className="flex flex-wrap gap-2">
                      {COMMON_FACILITIES.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => toggleFacility(f)}
                          className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all ${
                            facilities.includes(f)
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                          }`}
                        >
                          {facilities.includes(f) ? '✓ ' : ''}{f}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 二手专属字段 */}
              {type === 'secondhand' && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <ShoppingBag className="h-4 w-4" /> 二手详情
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">物品分类</Label>
                      <select value={shCategory} onChange={(e) => setShCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['数码电器','家居日用','服饰鞋包','图书音像','母婴玩具','运动户外','美妆护肤','其他'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">新旧程度</Label>
                      <select value={shCondition} onChange={(e) => setShCondition(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['全新','9成新','8成新','7成新','6成新','5成新及以下'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">原价（元，可选）</Label>
                      <Input type="number" value={shOriginalPrice} onChange={(e) => setShOriginalPrice(e.target.value)} placeholder="购入价" className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">交易方式</Label>
                      <select value={shTradeMethod} onChange={(e) => setShTradeMethod(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['同城自提','包邮','均可'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs">使用时长</Label>
                      <Input value={shUsageDuration} onChange={(e) => setShUsageDuration(e.target.value)} placeholder="如 半年 / 一年" className="h-10" />
                    </div>
                  </div>
                </div>
              )}

              {/* 招聘专属字段 */}
              {type === 'job' && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" /> 招聘详情
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">工作类型</Label>
                      <select value={jobType} onChange={(e) => setJobType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['全职','兼职','实习'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">招聘人数</Label>
                      <Input type="number" value={jobRecruitCount} onChange={(e) => setJobRecruitCount(e.target.value)} min={1} className="h-10" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs">薪资范围</Label>
                      <div className="flex gap-2 items-center">
                        <Input type="number" value={jobSalaryMin} onChange={(e) => setJobSalaryMin(e.target.value)} placeholder="最低" className="h-10" />
                        <span className="text-muted-foreground">-</span>
                        <Input type="number" value={jobSalaryMax} onChange={(e) => setJobSalaryMax(e.target.value)} placeholder="最高" className="h-10" />
                        <select value={jobSalaryUnit} onChange={(e) => setJobSalaryUnit(e.target.value)} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                          {['元/月','元/天','元/时'].map((x) => <option key={x} value={x}>{x}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">学历要求</Label>
                      <select value={jobEducation} onChange={(e) => setJobEducation(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['不限','高中','大专','本科','硕士','博士'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">经验要求</Label>
                      <select value={jobExperience} onChange={(e) => setJobExperience(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['不限','1年以下','1-3年','3-5年','5-10年','10年以上'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">工作城市</Label>
                      <Input value={jobWorkCity} onChange={(e) => setJobWorkCity(e.target.value)} placeholder="如 伊春" className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">工作地点</Label>
                      <Input value={jobWorkAddress} onChange={(e) => setJobWorkAddress(e.target.value)} placeholder="详细地址" className="h-10" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs">行业</Label>
                      <Input value={jobIndustry} onChange={(e) => setJobIndustry(e.target.value)} placeholder="如 餐饮、互联网、销售" className="h-10" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label className="text-xs">福利（逗号分隔）</Label>
                      <Input value={jobWelfare} onChange={(e) => setJobWelfare(e.target.value)} placeholder="如 五险一金,包吃,周末双休" className="h-10" />
                    </div>
                  </div>
                </div>
              )}

              {/* 便民专属字段 */}
              {type === 'lifebiz' && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Megaphone className="h-4 w-4" /> 便民详情
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">子分类</Label>
                      <select value={lbSubCategory} onChange={(e) => setLbSubCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['顺风车','打听事','寻人寻物','家政服务','装修维修','宠物','婚恋交友','教育','二手回收','其他'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">服务类型</Label>
                      <select value={lbServiceType} onChange={(e) => setLbServiceType(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['提供','需求'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">价格说明</Label>
                      <Input value={lbPriceText} onChange={(e) => setLbPriceText(e.target.value)} placeholder="如 50元/小时起 / 面议" className="h-10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">有效期</Label>
                      <select value={lbValidityPeriod} onChange={(e) => setLbValidityPeriod(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                        {['一天','一周','一个月','长期'].map((x) => <option key={x} value={x}>{x}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: 联系方式 */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cname" className="text-sm">联系人</Label>
                  <Input id="cname" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="如 王先生" className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cphone" className="text-sm">联系电话 <span className="text-destructive">*</span></Label>
                  <Input id="cphone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="11 位手机号" className="h-11" />
                </div>
              </div>
              <div className="rounded-xl bg-amber-50/50 border border-amber-200 p-4 text-xs text-amber-900/80 leading-relaxed">
                ⚠️ 请确保联系方式真实有效。虚假信息将被系统下架并可能影响账号信用。
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-2.5">
              ⚠ {error}
            </div>
          )}

          {/* 底部按钮 */}
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <Button variant="outline" onClick={prevStep} className="rounded-full h-11 px-6">
                <ArrowLeft className="mr-1.5 h-4 w-4" /> 上一步
              </Button>
            )}
            <div className="flex-1" />
            {step < 3 ? (
              <Button onClick={nextStep} className="rounded-full h-11 px-7 bg-gradient-to-r from-primary to-emerald-600 shadow-md">
                下一步 <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="rounded-full h-11 px-7 bg-gradient-to-r from-primary to-emerald-600 shadow-md">
                {submitting ? '发布中…' : '立即发布'} <Check className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
