'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { postApi, categoryApi, areaApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { Home, ShoppingBag, Briefcase, Megaphone, ArrowLeft, ArrowRight, Check } from 'lucide-react';

const TYPE_OPTIONS = [
  { code: 'house', title: '房屋出租', icon: Home, gradient: 'from-blue-500 to-indigo-600' },
  { code: 'secondhand', title: '二手交易', icon: ShoppingBag, gradient: 'from-pink-500 to-fuchsia-600' },
  { code: 'job', title: '招聘求职', icon: Briefcase, gradient: 'from-emerald-500 to-teal-600' },
  { code: 'lifebiz', title: '便民信息', icon: Megaphone, gradient: 'from-amber-500 to-red-600' },
] as const;

const RENTAL_TYPES = ['整租', '合租', '短租', '日租'];
const PROPERTY_TYPES = ['小区', '公寓', '民房', '商铺', '写字楼', '其他'];
const DECORATIONS = ['精装', '简装', '毛坯', '豪装'];
const COMMON_FACILITIES = ['空调', '洗衣机', '冰箱', '热水器', '床', '衣柜', '宽带', '电视', '沙发', '厨房'];

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-muted-foreground">加载中...</div>}>
      <PublishContent />
    </Suspense>
  );
}

function PublishContent() {
  const router = useRouter();
  const search = useSearchParams();
  const type = (search.get('type') as 'house' | 'secondhand' | 'job' | 'lifebiz') || 'house';

  const [loggedIn, setLoggedIn] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [areas, setAreas] = useState<Array<{ id: string; name: string; level: number }>>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
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

  const [step, setStep] = useState(1); // 1=基本信息 2=详细参数 3=联系发布
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const subCategories = categories.filter((c) => c.code === type);
  const currentTypeMeta = TYPE_OPTIONS.find((t) => t.code === type);
  const Icon = currentTypeMeta?.icon;

  function toggleFacility(f: string) {
    setFacilities((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
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
      const payload: any = {
        type,
        title,
        description,
        price: price ? Number(price) : undefined,
        priceUnit,
        categoryId: Number(categoryId),
        areaId: areaId ? Number(areaId) : undefined,
        contactName: contactName || undefined,
        contactPhone: contactPhone || undefined,
      };
      const post = await postApi.create(payload);
      if (type === 'house') {
        await fetch(`http://localhost:3001/api/v1/posts/${post.id}/house`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({
            rentalType, propertyType, decoration,
            areaSqm: areaSqm ? Number(areaSqm) : undefined,
            rooms: Number(rooms), livingRooms: Number(livingRooms), bathrooms: Number(bathrooms),
            floorInfo: floorInfo || undefined,
            communityName: communityName || undefined,
            facilities: facilities.length > 0 ? facilities : undefined,
          }),
        });
      }
      router.push(`/posts/${post.id}`);
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
          {/* 类型切换 */}
          <div className="grid grid-cols-4 gap-2">
            {TYPE_OPTIONS.map((t) => {
              const TIcon = t.icon;
              return (
                <Link key={t.code} href={`/posts/publish?type=${t.code}`}>
                  <div className={`p-3 rounded-xl text-center transition-all ${
                    type === t.code
                      ? `bg-gradient-to-br ${t.gradient} text-white shadow-md scale-105`
                      : 'bg-secondary text-muted-foreground hover:bg-secondary/70'
                  }`}>
                    <TIcon className="h-5 w-5 mx-auto mb-1" />
                    <div className="text-xs font-medium">{t.title}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Step 1: 基本信息 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm">标题 <span className="text-destructive">*</span></Label>
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
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-sm">详细描述 <span className="text-destructive">*</span></Label>
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
