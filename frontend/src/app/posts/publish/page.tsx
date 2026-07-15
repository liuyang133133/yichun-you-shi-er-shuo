'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { postApi, categoryApi, areaApi, uploadApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { toast } from '@/components/toast/toaster';
import {
  Home,
  ShoppingBag,
  Briefcase,
  Megaphone,
  ArrowLeft,
  Check,
  Upload,
  X,
  ImageIcon,
  Loader2,
  Type as TypeIcon,
  Phone,
  MapPin,
  Wallet,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Shield,
} from 'lucide-react';

type PostType = 'house' | 'secondhand' | 'job' | 'lifebiz';

const TYPE_OPTIONS: Array<{
  code: PostType;
  title: string;
  desc: string;
  icon: any;
  gradient: string;
  ring: string;
}> = [
  {
    code: 'house',
    title: '房屋租售',
    desc: '出售 / 整租 / 合租 / 二手房',
    icon: Home,
    gradient: 'from-blue-500 to-indigo-600',
    ring: 'ring-blue-500/40',
  },
  {
    code: 'secondhand',
    title: '二手交易',
    desc: '数码 / 家居 / 服饰',
    icon: ShoppingBag,
    gradient: 'from-pink-500 to-fuchsia-600',
    ring: 'ring-pink-500/40',
  },
  {
    code: 'job',
    title: '招聘求职',
    desc: '全职 / 兼职 / 实习',
    icon: Briefcase,
    gradient: 'from-emerald-500 to-teal-600',
    ring: 'ring-emerald-500/40',
  },
  {
    code: 'lifebiz',
    title: '便民信息',
    desc: '顺风车 / 家政 / 寻物',
    icon: Megaphone,
    gradient: 'from-amber-500 to-red-600',
    ring: 'ring-amber-500/40',
  },
];

const RENTAL_TYPES = ['出售', '整租', '合租', '短租', '日租'];
const PROPERTY_TYPES = ['小区', '公寓', '民房', '商铺', '写字楼', '其他'];
const DECORATIONS = ['精装', '简装', '毛坯', '豪装'];
const COMMON_FACILITIES = ['空调', '洗衣机', '冰箱', '热水器', '床', '衣柜', '宽带', '电视', '沙发', '厨房'];
const SH_CATEGORIES = ['数码电器', '家居日用', '服饰鞋包', '图书音像', '母婴玩具', '运动户外', '美妆护肤', '其他'];
const SH_CONDITIONS = ['全新', '9成新', '8成新', '7成新', '6成新', '5成新及以下'];
const SH_TRADE_METHODS = ['同城自提', '包邮', '均可'];
const JOB_TYPES = ['全职', '兼职', '实习'];
const JOB_EDUCATIONS = ['不限', '高中', '大专', '本科', '硕士', '博士'];
const JOB_EXPERIENCES = ['不限', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上'];
const JOB_SALARY_UNITS = ['元/月', '元/天', '元/时'];
const LB_SUBCATEGORIES = ['顺风车', '打听事', '寻人寻物', '家政服务', '装修维修', '宠物', '婚恋交友', '教育', '二手回收', '其他'];
const LB_SERVICE_TYPES = ['提供', '需求'];
const LB_VALIDITY = ['一天', '一周', '一个月', '长期'];

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中…</div>}>
      <PublishForm />
    </Suspense>
  );
}

function PublishForm() {
  const router = useRouter();
  const search = useSearchParams();
  const type = ((search.get('type') as PostType) || 'house') as PostType;

  const [loggedIn, setLoggedIn] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string; parentId?: string | null }>>([]);
  const [areas, setAreas] = useState<Array<{ id: string; name: string; level: number }>>([]);

  // ====== 通用字段 ======
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [priceUnit, setPriceUnit] = useState('元/月');
  const [categoryId, setCategoryId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  // ====== house ======
  const [rentalType, setRentalType] = useState('出售');
  const [propertyType, setPropertyType] = useState('小区');
  const [decoration, setDecoration] = useState('精装');
  const [areaSqm, setAreaSqm] = useState('');
  const [rooms, setRooms] = useState('2');
  const [livingRooms, setLivingRooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [floorInfo, setFloorInfo] = useState('');
  const [communityName, setCommunityName] = useState('');
  const [facilities, setFacilities] = useState<string[]>(['空调', '洗衣机', '冰箱']);

  // ====== secondhand ======
  const [shCategory, setShCategory] = useState('数码电器');
  const [shCondition, setShCondition] = useState('9成新');
  const [shOriginalPrice, setShOriginalPrice] = useState('');
  const [shTradeMethod, setShTradeMethod] = useState('同城自提');
  const [shUsageDuration, setShUsageDuration] = useState('');

  // ====== job ======
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

  // ====== lifebiz ======
  const [lbSubCategory, setLbSubCategory] = useState('顺风车');
  const [lbServiceType, setLbServiceType] = useState('提供');
  const [lbPriceText, setLbPriceText] = useState('');
  const [lbValidityPeriod, setLbValidityPeriod] = useState('一周');

  // ====== 图片 ======
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ====== 提交态 ======
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace('/login');
      return;
    }
    setLoggedIn(true);
    categoryApi.list().then((r: any) => setCategories(r || []));
    areaApi.findTree().then((r: any) => {
      // 仅取 L2 区县(且必须是当前 10 个行政区,过滤掉已合并的 红星区/西林区 等遗留数据)
      // 用户在 2026-07-14 明确指定这 10 个区(伊春市 2019 年区划调整后的现行行政区)
      const ACTIVE_AREA_NAMES = new Set([
        '伊美区', '乌翠区', '友好区', '铁力市', '嘉荫县',
        '南岔县', '金林区', '大箐山县', '丰林县', '汤旺县',
      ]);
      const flat: any[] = [];
      const walk = (nodes: any[]) => {
        for (const n of nodes || []) {
          if (n.level === 2 && ACTIVE_AREA_NAMES.has(n.name)) flat.push(n);
          if (n.children?.length) walk(n.children);
        }
      };
      walk(r || []);
      // 按 sortOrder 排序(DB 已排过,这里保险)
      flat.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      setAreas(flat);
    });
  }, [router]);

  useEffect(() => {
    setPriceUnit(type === 'house' ? '元/月' : '元');
  }, [type]);

  // 当前 type 的元数据
  const currentTypeMeta = TYPE_OPTIONS.find((t) => t.code === type);
  const Icon = currentTypeMeta?.icon;

  // 子分类 (按 type 取)
  const subCategories = (() => {
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
    setImageUrls((prev) => {
      const next = [...prev];
      const [picked] = next.splice(idx, 1);
      return [picked, ...next];
    });
  }

  /** 校验 + 收集所有错误 */
  function validate(): string | null {
    if (!title.trim()) return '请输入标题';
    if (title.trim().length < 5) return '标题至少 5 字,让人一眼看明白';
    if (!categoryId) return '请选择分类';
    if (!description.trim() || description.trim().length < 10) return '详细描述至少 10 字';
    if (!contactPhone.trim()) return '请输入联系电话';
    if (!/^1[3-9]\d{9}$/.test(contactPhone.trim())) return '手机号格式不正确';
    return null;
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const err = validate();
    if (err) {
      setError(err);
      // 滚动到错误提示
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      // 计算 expireAt (仅 lifebiz)
      let detail: any = undefined;
      if (type === 'house') {
        detail = {
          rentalType,
          propertyType,
          decoration,
          areaSqm: areaSqm ? Number(areaSqm) : undefined,
          rooms: Number(rooms),
          livingRooms: Number(livingRooms),
          bathrooms: Number(bathrooms),
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
        detail = {
          ...(jobCompanyId ? { companyId: Number(jobCompanyId) } : {}),
          jobType,
          salaryMin: jobSalaryMin ? Number(jobSalaryMin) : undefined,
          salaryMax: jobSalaryMax ? Number(jobSalaryMax) : undefined,
          salaryUnit: jobSalaryUnit,
          education: jobEducation,
          experience: jobExperience,
          industry: jobIndustry || undefined,
          welfare: jobWelfare
            ? jobWelfare.split(/[,，;；\s]+/).filter(Boolean)
            : undefined,
          recruitCount: jobRecruitCount ? Number(jobRecruitCount) : undefined,
          workCity: jobWorkCity || undefined,
          workAddress: jobWorkAddress || undefined,
        };
      } else if (type === 'lifebiz') {
        const periodMap: Record<string, number | null> = { '一天': 1, '一周': 7, '一个月': 30, '长期': null };
        const days = periodMap[lbValidityPeriod];
        const expireAt =
          days === null ? undefined : new Date(Date.now() + days * 86400000).toISOString();
        detail = {
          subCategory: lbSubCategory,
          serviceType: lbServiceType,
          price: price ? Number(price) : undefined,
          priceText: lbPriceText || undefined,
          validityPeriod: lbValidityPeriod,
          expireAt,
        };
      }

      const post = await postApi.create({
        type,
        title: title.trim(),
        description: description.trim(),
        price: price ? Number(price) : undefined,
        priceUnit,
        categoryId: Number(categoryId),
        areaId: areaId ? Number(areaId) : undefined,
        contactName: contactName.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        detail,
        images: imageUrls.length > 0 ? imageUrls : undefined,
      } as any);

      // [2026-07-14] PM 决策: 新发布帖需经 admin 审核才能公开展示
      // toast 提示 + 跳 "我的发布" 列表,用户能看到自己刚提交的 待审核 帖子
      toast.success('已提交,待管理员审核通过后发布', '提交成功');
      router.push('/me/posts');
    } catch (e: any) {
      setError(e?.message || '发布失败,请稍后再试');
      setTimeout(() => errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
    } finally {
      setSubmitting(false);
    }
  }

  // 必填完成度计算 — 用于底部 Sticky CTA 的圆形进度环
  const requiredFields = [
    { name: '标题', done: title.trim().length >= 5 },
    { name: '分类', done: !!categoryId },
    { name: '描述', done: description.trim().length >= 10 },
    { name: '电话', done: /^1[3-9]\d{9}$/.test(contactPhone.trim()) },
  ];
  const completedCount = requiredFields.filter((f) => f.done).length;

  if (!loggedIn) {
    return (
      <main className="container py-20 text-center text-muted-foreground">
        跳转登录中…
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary/20 via-background to-background pb-36">
      {/* ============== Hero 头部 ============== */}
      <div className="relative overflow-hidden">
        {/* 渐变背景 — 按 type 切换色 */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${currentTypeMeta?.gradient} opacity-[0.06]`}
          aria-hidden
        />
        <div
          className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-accent-orange/10 blur-3xl"
          aria-hidden
        />

        {/* 顶部导航条 (玻璃) */}
        <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border/40">
          <div className="container max-w-4xl flex items-center justify-between h-14">
            <Link
              href={`/?type=${type}`}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 mr-1 group-hover:-translate-x-0.5 transition-transform" />
              返回
            </Link>
            <div className="flex items-center gap-2.5">
              {Icon && (
                <div
                  className={`h-8 w-8 rounded-xl bg-gradient-to-br ${currentTypeMeta?.gradient} flex items-center justify-center shadow-md ring-2 ring-background`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
              )}
              <div>
                <div className="font-display text-base font-bold leading-tight">
                  发布{currentTypeMeta?.title}
                </div>
                <div className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                  让本地信息流动起来
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <div className="hidden sm:flex h-7 items-center gap-1.5 px-2.5 rounded-full bg-secondary/60">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="tabular-nums font-medium">
                  {completedCount}/{requiredFields.length}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero 文案区 */}
        <div className="container max-w-4xl pt-10 pb-8 relative">
          <div className="flex items-start gap-4">
            {Icon && (
              <div
                className={`hidden sm:flex h-16 w-16 rounded-2xl bg-gradient-to-br ${currentTypeMeta?.gradient} items-center justify-center shadow-elevated shrink-0`}
              >
                <Icon className="h-8 w-8 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">
                <Sparkles className="h-3 w-3" />
                <span>本地生活信息发布</span>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
                发布一条<span className={`bg-gradient-to-br ${currentTypeMeta?.gradient} bg-clip-text text-transparent`}> {currentTypeMeta?.title} </span>信息
              </h1>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed max-w-xl">
                {type === 'house'
                  ? '把房子情况写清楚,感兴趣的邻居会主动联系你 — 价格透明、位置准确、配图齐全最容易成交'
                  : type === 'secondhand'
                    ? '把物品成色、瑕疵、交易方式说清楚,同城自提当面验货更靠谱'
                    : type === 'job'
                      ? '岗位职责、薪资范围、福利待遇越具体,越能吸引到合适的求职者'
                      : '便民信息要简洁明了,留下有效联系方式,需求双方能快速对接'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ============== 提示卡 (3 个 tip) ============== */}
      <div className="container max-w-4xl pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <TipCard
            icon={<TrendingUp className="h-4 w-4" />}
            color="emerald"
            title="标题 = 转化率"
            desc="品类 + 关键卖点"
          />
          <TipCard
            icon={<ImageIcon className="h-4 w-4" />}
            color="amber"
            title="配图很重要"
            desc="实拍图成交率高 3 倍"
          />
          <TipCard
            icon={<Shield className="h-4 w-4" />}
            color="blue"
            title="联系方式真实"
            desc="系统会下架虚假信息"
          />
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="container max-w-4xl py-6 space-y-5"
        noValidate
      >
        {/* ============== 1. 类型选择 ============== */}
        <SectionCard index="01" title="选择发布类型" subtitle="点击切换其他类型,数据会保留">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {TYPE_OPTIONS.map((t) => {
              const TIcon = t.icon;
              const active = type === t.code;
              return (
                <Link
                  key={t.code}
                  href={`/posts/publish?type=${t.code}`}
                  className={`
                    relative group p-4 rounded-2xl border transition-all duration-300 ease-out
                    hover:-translate-y-1 hover:shadow-hover
                    ${
                      active
                        ? `border-transparent bg-gradient-to-br ${t.gradient} text-white shadow-elevated ring-4 ${t.ring} scale-[1.02]`
                        : 'border-border bg-card hover:border-primary/30'
                    }
                  `}
                >
                  {active && (
                    <>
                      <div className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-white shadow-md flex items-center justify-center ring-2 ring-background">
                        <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3.5} />
                      </div>
                      {/* 装饰光斑 */}
                      <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full bg-white/15 blur-xl pointer-events-none" aria-hidden />
                    </>
                  )}
                  <div
                    className={`h-11 w-11 rounded-xl flex items-center justify-center mb-2.5 transition-transform ${
                      active
                        ? 'bg-white/20 backdrop-blur-sm group-hover:scale-110'
                        : `bg-gradient-to-br ${t.gradient} text-white shadow-sm group-hover:scale-110`
                    } transition-all duration-300`}
                  >
                    <TIcon className="h-5 w-5" strokeWidth={2.25} />
                  </div>
                  <div className={`font-bold text-sm leading-tight ${active ? 'text-white' : 'text-foreground'}`}>
                    {t.title}
                  </div>
                  <div className={`text-[11px] mt-0.5 ${active ? 'text-white/85' : 'text-muted-foreground'}`}>
                    {t.desc}
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>

        {/* ============== 2. 基本信息 ============== */}
        <SectionCard
          index="02"
          title="基本信息"
          subtitle="让人一眼明白你发的是什么"
          icon={<TypeIcon className="h-4 w-4" />}
          iconBg="bg-blue-500/10 text-blue-600"
        >
          <div className="space-y-5">
            {/* 标题 */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="title" className="text-sm">
                  标题<span className="text-destructive">*</span>
                </Label>
                <span
                  className={`text-xs tabular-nums ${
                    title.length >= 100
                      ? 'text-destructive font-medium'
                      : title.length >= 80
                        ? 'text-amber-600 font-medium'
                        : 'text-muted-foreground'
                  }`}
                >
                  {title.length}/100
                </span>
              </div>
              <Input
                id="title"
                placeholder="一句话讲清楚 — 例如:万象城合租主卧 限女生 月租 900"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">
                好的标题 = 品类 + 关键卖点 (位置/价格/限制) — 别人一看就明白
              </p>
            </div>

            {/* 分类 + 区域 */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-sm">
                  分类<span className="text-destructive">*</span>
                </Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">请选择</option>
                  {subCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="area" className="text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground" /> 所在区域
                </Label>
                <select
                  id="area"
                  value={areaId}
                  onChange={(e) => setAreaId(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  <option value="">请选择</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 价格 */}
            <div className="space-y-1.5">
              <Label className="text-sm flex items-center gap-1">
                <Wallet className="h-3 w-3 text-muted-foreground" /> 价格
              </Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="h-11"
                />
                <select
                  value={priceUnit}
                  onChange={(e) => setPriceUnit(e.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {type === 'house'
                    ? ['元/月', '元/天', '元/时', '元', '面议'].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))
                    : ['元', '面议', '元/天', '元/时'].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                </select>
              </div>
              <p className="text-xs text-muted-foreground">不确定?选「面议」也完全可以</p>
            </div>
          </div>
        </SectionCard>

        {/* ============== 3. 详情 (按 type 动态) ============== */}
        <SectionCard
          index="03"
          title={`${currentTypeMeta?.title} · 详细参数`}
          subtitle="选填 — 填的越多,信息越精准"
          icon={Icon && <Icon className="h-4 w-4" />}
          iconBg={`bg-gradient-to-br ${currentTypeMeta?.gradient} text-white`}
        >
          <div className="space-y-4">
            {/* HOUSE */}
            {type === 'house' && (
              <>
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="租售方式">
                    <Select value={rentalType} onChange={setRentalType} options={RENTAL_TYPES} />
                  </Field>
                  <Field label="物业类型">
                    <Select value={propertyType} onChange={setPropertyType} options={PROPERTY_TYPES} />
                  </Field>
                  <Field label="装修">
                    <Select value={decoration} onChange={setDecoration} options={DECORATIONS} />
                  </Field>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="面积 (㎡)" hint="选填">
                    <Input type="number" value={areaSqm} onChange={(e) => setAreaSqm(e.target.value)} placeholder="78" className="h-10" />
                  </Field>
                  <Field label="小区名称" hint="选填">
                    <Input value={communityName} onChange={(e) => setCommunityName(e.target.value)} placeholder="如 万象城" className="h-10" />
                  </Field>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="室">
                    <Input type="number" value={rooms} onChange={(e) => setRooms(e.target.value)} min={0} className="h-10" />
                  </Field>
                  <Field label="厅">
                    <Input type="number" value={livingRooms} onChange={(e) => setLivingRooms(e.target.value)} min={0} className="h-10" />
                  </Field>
                  <Field label="卫">
                    <Input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} min={0} className="h-10" />
                  </Field>
                  <Field label="楼层" hint="如 5/18">
                    <Input value={floorInfo} onChange={(e) => setFloorInfo(e.target.value)} placeholder="5/18层" className="h-10" />
                  </Field>
                </div>
                <Field label="配套设施" hint="点击切换,选中后变绿色">
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_FACILITIES.map((f) => {
                      const on = facilities.includes(f);
                      return (
                        <button
                          key={f}
                          type="button"
                          onClick={() => toggleFacility(f)}
                          className={`px-3 py-1.5 text-sm rounded-full font-medium transition-all ${
                            on
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
                          }`}
                        >
                          {on && '✓ '}
                          {f}
                        </button>
                      );
                    })}
                  </div>
                </Field>
              </>
            )}

            {/* SECONDHAND */}
            {type === 'secondhand' && (
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="物品分类">
                  <Select value={shCategory} onChange={setShCategory} options={SH_CATEGORIES} />
                </Field>
                <Field label="新旧程度">
                  <Select value={shCondition} onChange={setShCondition} options={SH_CONDITIONS} />
                </Field>
                <Field label="原价 (元)" hint="选填,购入价">
                  <Input type="number" value={shOriginalPrice} onChange={(e) => setShOriginalPrice(e.target.value)} placeholder="如 3000" className="h-10" />
                </Field>
                <Field label="交易方式">
                  <Select value={shTradeMethod} onChange={setShTradeMethod} options={SH_TRADE_METHODS} />
                </Field>
                <Field label="使用时长" hint="如 半年">
                  <Input value={shUsageDuration} onChange={(e) => setShUsageDuration(e.target.value)} placeholder="半年 / 一年" className="h-10" />
                </Field>
              </div>
            )}

            {/* JOB */}
            {type === 'job' && (
              <>
                <div className="grid md:grid-cols-3 gap-3">
                  <Field label="工作类型">
                    <Select value={jobType} onChange={setJobType} options={JOB_TYPES} />
                  </Field>
                  <Field label="招聘人数">
                    <Input type="number" value={jobRecruitCount} onChange={(e) => setJobRecruitCount(e.target.value)} min={1} className="h-10" />
                  </Field>
                  <Field label="学历要求">
                    <Select value={jobEducation} onChange={setJobEducation} options={JOB_EDUCATIONS} />
                  </Field>
                </div>
                <Field label="薪资范围" hint="选填,留空表示面议">
                  <div className="flex gap-2 items-center">
                    <Input type="number" value={jobSalaryMin} onChange={(e) => setJobSalaryMin(e.target.value)} placeholder="最低" className="h-10" />
                    <span className="text-muted-foreground">—</span>
                    <Input type="number" value={jobSalaryMax} onChange={(e) => setJobSalaryMax(e.target.value)} placeholder="最高" className="h-10" />
                    <select
                      value={jobSalaryUnit}
                      onChange={(e) => setJobSalaryUnit(e.target.value)}
                      className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    >
                      {JOB_SALARY_UNITS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
                <div className="grid md:grid-cols-2 gap-3">
                  <Field label="经验要求">
                    <Select value={jobExperience} onChange={setJobExperience} options={JOB_EXPERIENCES} />
                  </Field>
                  <Field label="行业" hint="选填">
                    <Input value={jobIndustry} onChange={(e) => setJobIndustry(e.target.value)} placeholder="餐饮 / 销售 / 互联网" className="h-10" />
                  </Field>
                  <Field label="工作城市">
                    <Input value={jobWorkCity} onChange={(e) => setJobWorkCity(e.target.value)} placeholder="伊春" className="h-10" />
                  </Field>
                  <Field label="工作地点" hint="选填,详细地址">
                    <Input value={jobWorkAddress} onChange={(e) => setJobWorkAddress(e.target.value)} placeholder="详细地址" className="h-10" />
                  </Field>
                </div>
                <Field label="福利 (逗号分隔)" hint="选填,例:五险一金,包吃,双休">
                  <Input value={jobWelfare} onChange={(e) => setJobWelfare(e.target.value)} placeholder="五险一金,包吃,周末双休" className="h-10" />
                </Field>
              </>
            )}

            {/* LIFEBIZ */}
            {type === 'lifebiz' && (
              <div className="grid md:grid-cols-2 gap-3">
                <Field label="子分类">
                  <Select value={lbSubCategory} onChange={setLbSubCategory} options={LB_SUBCATEGORIES} />
                </Field>
                <Field label="服务类型">
                  <Select value={lbServiceType} onChange={setLbServiceType} options={LB_SERVICE_TYPES} />
                </Field>
                <Field label="价格说明" hint="选填,例:50元/小时起 / 面议">
                  <Input value={lbPriceText} onChange={(e) => setLbPriceText(e.target.value)} placeholder="50元/小时起 / 面议" className="h-10" />
                </Field>
                <Field label="有效期">
                  <Select value={lbValidityPeriod} onChange={setLbValidityPeriod} options={LB_VALIDITY} />
                </Field>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ============== 4. 描述 + 图片 ============== */}
        <SectionCard
          index="04"
          title="详细描述 & 图片"
          subtitle="实拍图 + 真实描述 = 高转化"
          icon={<ImageIcon className="h-4 w-4" />}
          iconBg="bg-amber-500/10 text-amber-600"
        >
          <div className="space-y-5">
            {/* 图片 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  上传图片
                  <span className="text-muted-foreground ml-1">(最多 9 张,第一张为封面)</span>
                </Label>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {imageUrls.length} / 9
                </span>
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
                  <div
                    key={url + idx}
                    className="relative group aspect-square rounded-lg overflow-hidden border bg-secondary"
                  >
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
                        <span className="text-[11px] text-muted-foreground">添加图片</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                支持 jpg / png / webp / gif,单张不超过 5MB
              </p>
            </div>

            {/* 描述 */}
            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="desc" className="text-sm">
                  详细描述<span className="text-destructive">*</span>
                </Label>
                <span
                  className={`text-xs tabular-nums ${
                    description.length >= 5000
                      ? 'text-destructive font-medium'
                      : description.length >= 4000
                        ? 'text-amber-600 font-medium'
                        : 'text-muted-foreground'
                  }`}
                >
                  {description.length}/5000
                </span>
              </div>
              <textarea
                id="desc"
                rows={6}
                placeholder={
                  type === 'house'
                    ? '描述房屋亮点、周边配套、交通、入住时间、特殊要求等…'
                    : type === 'secondhand'
                      ? '描述物品成色、使用情况、瑕疵、交易时间等…'
                      : type === 'job'
                        ? '描述岗位职责、任职要求、福利待遇、工作时间等…'
                        : '描述具体需求 / 可提供的服务细节…'
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm leading-relaxed placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">越详细越容易成交 · 至少 10 字</p>
            </div>
          </div>
        </SectionCard>

        {/* ============== 5. 联系方式 ============== */}
        <SectionCard
          index="05"
          title="联系方式"
          subtitle="留真实联系方式,买家才能联系到你"
          icon={<Phone className="h-4 w-4" />}
          iconBg="bg-emerald-500/10 text-emerald-600"
        >
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="联系人" hint="选填,如 王先生">
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="如 王先生"
                  className="h-11"
                />
              </Field>
              <Field label="联系电话" required>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="11 位手机号"
                  inputMode="numeric"
                  maxLength={11}
                  className="h-11"
                />
              </Field>
            </div>
            <div className="rounded-lg bg-amber-50/50 border border-amber-200/80 p-3 text-xs text-amber-900/80 leading-relaxed flex gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                请确保联系方式真实有效。虚假信息将被系统下架并可能影响账号信用。
              </span>
            </div>
          </div>
        </SectionCard>

        {/* ============== 错误提示 (sticky 之前的内联位置) ============== */}
        {error && (
          <div
            ref={errorRef}
            role="alert"
            className="rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm px-4 py-3 flex items-start gap-2 animate-fade-in"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </form>

      {/* ============== Sticky 底部 CTA (玻璃拟态) ============== */}
      <div className="fixed bottom-0 left-0 right-0 z-30">
        {/* 顶部渐变阴影 — 视觉上让 CTA 与内容柔和分离 */}
        <div className="h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
        <div className="bg-background/80 backdrop-blur-xl border-t border-border/60 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.08)]">
          <div className="container max-w-4xl py-3 flex items-center gap-3">
            {/* 圆形进度环 — 比条形进度更有品质感 */}
            <div className="hidden sm:flex items-center gap-2.5">
              <CircularProgress
                value={completedCount}
                max={requiredFields.length}
                gradient={currentTypeMeta?.gradient || 'from-primary to-emerald-600'}
              />
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold tabular-nums">
                  {completedCount}/{requiredFields.length}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {completedCount === requiredFields.length ? '可以发布' : '必填项'}
                </span>
              </div>
            </div>
            <Link
              href={`/?type=${type}`}
              className="ml-auto sm:ml-0 h-11 px-5 inline-flex items-center justify-center rounded-full border border-border/60 bg-background/80 hover:bg-secondary text-sm font-medium transition-all hover:shadow-soft"
            >
              取消
            </Link>
            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={submitting}
              className={`h-11 px-7 rounded-full font-semibold transition-all duration-300 shadow-soft hover:shadow-hover ${
                completedCount === requiredFields.length
                  ? `bg-gradient-to-r ${currentTypeMeta?.gradient} hover:scale-[1.02] active:scale-[0.98]`
                  : 'bg-gradient-to-r from-primary to-emerald-600 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  发布中…
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" strokeWidth={2.5} />
                  立即发布
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

/** ===========================================================
 * 辅助组件
 * =========================================================== */

/** 分组卡片 — 序号徽章 + 标题 + 副标题 + 内容 */
function SectionCard({
  index,
  title,
  subtitle,
  icon,
  iconBg,
  children,
}: {
  index: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  iconBg?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-border/60 hover:shadow-hover hover:-translate-y-0.5 transition-all duration-300 group">
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          {icon && (
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center shadow-sm ${iconBg}`}>
              {icon}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold text-muted-foreground/70 tabular-nums">
                {index}
              </span>
              <h2 className="font-display font-bold text-base leading-tight">{title}</h2>
            </div>
            {subtitle && (
              <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
            )}
          </div>
        </div>
      </div>
      <CardContent className="pt-5 pb-5 px-5">{children}</CardContent>
    </Card>
  );
}

/** 提示卡 — Hero 区下方 3 个 tip */
function TipCard({
  icon,
  color,
  title,
  desc,
}: {
  icon: React.ReactNode;
  color: 'emerald' | 'amber' | 'blue';
  title: string;
  desc: string;
}) {
  const colorMap = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  };
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-card/60 border border-border/40 hover:bg-card hover:shadow-soft transition-all">
      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-foreground leading-tight">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{desc}</div>
      </div>
    </div>
  );
}

/** 圆形进度环 — Sticky CTA 用的精致进度可视化 */
function CircularProgress({
  value,
  max,
  gradient,
  size = 44,
  stroke = 4,
}: {
  value: number;
  max: number;
  gradient: string;
  size?: number;
  stroke?: number;
}) {
  const pct = max === 0 ? 0 : Math.min(1, value / max);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - circumference * pct;
  const complete = pct >= 1;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={complete ? '#10b981' : 'url(#progressGradient)'}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.4,0,0.2,1)' }}
        />
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(158 64% 40%)" />
            <stop offset="100%" stopColor="hsl(158 80% 30%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {complete ? (
          <Check className="h-4 w-4 text-emerald-600" strokeWidth={3} />
        ) : (
          <span className="text-[11px] font-bold tabular-nums text-foreground">
            {value}
          </span>
        )}
      </div>
    </div>
  );
}

/** 统一的字段包装:Label + 内容 + 可选 hint */
function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
        {hint && <span className="ml-1.5 text-xs text-muted-foreground font-normal">({hint})</span>}
      </Label>
      {children}
    </div>
  );
}

/** 统一 select 样式 */
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm transition-colors hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}