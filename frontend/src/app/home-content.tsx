'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PostCard, type PostCardData } from '@/components/post/post-card';
import { postApi, categoryApi, areaApi, bannerApi, type BannerItem } from '@/lib/api';
import {
  Home, ShoppingBag, Briefcase, Megaphone, Plus, ArrowRight, Sparkles, ChevronLeft, ChevronRight,
} from 'lucide-react';

const MODULES = [
  {
    code: 'house',
    title: '房屋出租',
    subtitle: 'House Rental',
    desc: '整租 / 合租 / 短租 / 商铺',
    icon: Home,
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    ring: 'ring-blue-500/20',
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    code: 'secondhand',
    title: '二手交易',
    subtitle: 'Secondhand',
    desc: '数码 / 家电 / 服饰 / 图书',
    icon: ShoppingBag,
    gradient: 'from-pink-500 via-rose-600 to-fuchsia-700',
    ring: 'ring-pink-500/20',
    accent: 'bg-pink-50 text-pink-700',
  },
  {
    code: 'job',
    title: '招聘求职',
    subtitle: 'Job & Career',
    desc: '销售 / 餐饮 / 技工 / 互联网',
    icon: Briefcase,
    gradient: 'from-emerald-500 via-teal-600 to-cyan-700',
    ring: 'ring-emerald-500/20',
    accent: 'bg-emerald-50 text-emerald-700',
  },
  {
    code: 'lifebiz',
    title: '便民信息',
    subtitle: 'Local Services',
    desc: '顺风车 / 家政 / 打听事 / 维修',
    icon: Megaphone,
    gradient: 'from-amber-500 via-orange-600 to-red-600',
    ring: 'ring-amber-500/20',
    accent: 'bg-amber-50 text-orange-700',
  },
];

const SORT_OPTIONS = [
  { value: 'latest', label: '最新发布' },
  { value: 'oldest', label: '最早发布' },
  { value: 'price_asc', label: '价格从低到高' },
  { value: 'price_desc', label: '价格从高到低' },
];

export function HomeContent() {
  const router = useRouter();
  const search = useSearchParams();
  const currentType = search.get('type');

  const [list, setList] = useState<PostCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [areas, setAreas] = useState<Array<{ id: string; name: string; level: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [sort, setSort] = useState<string>('latest');
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);

  useEffect(() => {
    categoryApi.list().then((r: any) => setCategories(r || [])).catch(() => {});
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
    }).catch(() => {});
    bannerApi.active('home_top').then((r: any) => setBanners(Array.isArray(r) ? r : [])).catch(() => setBanners([]));
  }, []);

  // Banner 自动轮播
  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setBannerIdx((i) => (i + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, [banners.length]);

  useEffect(() => {
    if (!currentType) return;
    setLoading(true);
    postApi
      .list({
        type: currentType,
        categoryId: selectedCategory ? Number(selectedCategory) : undefined,
        areaId: selectedArea ? Number(selectedArea) : undefined,
        sort: sort as any,
        pageSize: 24,
      })
      .then((r: any) => {
        setList(r?.list || []);
        setTotal(r?.total || 0);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [currentType, selectedCategory, selectedArea, sort]);

  // ====================== 首页 Hero ======================
  if (!currentType) {
    return (
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* 渐变 mesh 背景 */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-emerald-200/40 via-teal-100/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-orange-200/30 via-amber-100/30 to-transparent rounded-full blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(15,122,94,0.06),transparent_50%)]" />
          </div>

          <div className="container py-20 md:py-28">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6 animate-fade-in">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20">
                  <Sparkles className="h-3 w-3" />
                  小兴安岭脚下 · 本地生活信息平台
                </div>
                <h1 className="font-display text-5xl md:text-6xl font-black leading-[1.1] tracking-tight">
                  <span className="text-gradient">伊春</span>
                  <span className="text-foreground">有事儿</span>
                  <span className="text-foreground">说</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                  房屋出租 · 二手交易 · 招聘求职 · 便民信息<br />
                  <span className="text-sm text-muted-foreground/80">本地人发布，本地人浏览，真实可靠</span>
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Link href="/posts/publish">
                    <Button size="lg" className="rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-primary to-emerald-600 px-7 h-12 text-base">
                      <Plus className="mr-1.5 h-5 w-5" />
                      立即发布
                    </Button>
                  </Link>
                  <Link href="/?type=house">
                    <Button size="lg" variant="outline" className="rounded-full px-7 h-12 text-base border-2">
                      浏览信息
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="flex items-center gap-6 pt-4 text-xs text-muted-foreground">
                  <div><span className="text-2xl font-bold text-foreground">4</span> 大模块</div>
                  <div className="h-6 w-px bg-border" />
                  <div><span className="text-2xl font-bold text-foreground">29</span> 个分类</div>
                  <div className="h-6 w-px bg-border" />
                  <div><span className="text-2xl font-bold text-foreground">12</span> 个区县</div>
                </div>
              </div>

              {/* 装饰图：伊春地图 + 4 大模块浮动卡片 */}
              <div className="relative h-[400px] hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/50 to-orange-100/30 rounded-3xl rotate-3" />
                <div className="absolute inset-0 bg-card rounded-3xl shadow-soft border p-6 -rotate-1">
                  <div className="text-center space-y-2 mb-6">
                    <div className="text-5xl">🌲</div>
                    <div className="font-display text-2xl font-bold text-foreground">伊春</div>
                    <div className="text-xs text-muted-foreground">小兴安岭 · 黑龙江省</div>
                  </div>
                  {/* 4 个浮动模块圆 */}
                  <div className="grid grid-cols-2 gap-3">
                    {MODULES.map((m, i) => {
                      const Icon = m.icon;
                      return (
                        <Link
                          key={m.code}
                          href={`/?type=${m.code}`}
                          className={`group relative p-4 rounded-2xl bg-gradient-to-br ${m.gradient} text-white shadow-md hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-fade-in`}
                          style={{ animationDelay: `${i * 100}ms` }}
                        >
                          <Icon className="h-6 w-6 mb-2" />
                          <div className="text-sm font-bold">{m.title}</div>
                          <div className="text-[10px] text-white/80">{m.subtitle}</div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 首页 Banner 轮播 */}
        {banners.length > 0 && (
          <section className="container pt-2 pb-4">
            <div className="relative h-32 md:h-44 rounded-2xl overflow-hidden shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banners[bannerIdx]?.imageUrl}
                alt={banners[bannerIdx]?.title || ''}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div className="text-white">
                  <div className="text-xs text-white/80">📢 平台公告</div>
                  <div className="font-bold text-lg line-clamp-1">{banners[bannerIdx]?.title}</div>
                </div>
                {banners[bannerIdx]?.linkTarget && (
                  <button
                    onClick={() => {
                      const t = banners[bannerIdx].linkTarget;
                      if (banners[bannerIdx].linkType === 'url') {
                        window.open(t, '_blank');
                      } else if (banners[bannerIdx].linkType === 'search') {
                        router.push(`/search?q=${encodeURIComponent(t)}`);
                      } else if (banners[bannerIdx].linkType === 'category') {
                        router.push(`/?type=${t}`);
                      } else {
                        router.push(`/posts/${t}`);
                      }
                    }}
                    className="px-4 py-1.5 rounded-full bg-white text-foreground text-sm font-semibold shadow hover:shadow-md"
                  >
                    查看 →
                  </button>
                )}
              </div>
              {banners.length > 1 && (
                <>
                  <button
                    onClick={() => setBannerIdx((i) => (i - 1 + banners.length) % banners.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center"
                    aria-label="上一张"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setBannerIdx((i) => (i + 1) % banners.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white shadow flex items-center justify-center"
                    aria-label="下一张"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute top-3 right-3 flex gap-1">
                    {banners.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setBannerIdx(i)}
                        className={`h-1.5 rounded-full transition-all ${i === bannerIdx ? 'bg-white w-5' : 'bg-white/50 w-1.5'}`}
                        aria-label={`第${i + 1}张`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {/* 4 大模块入口 */}
        <section className="container py-12">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="font-display text-3xl font-bold">热门分类</h2>
              <p className="text-sm text-muted-foreground mt-1">选择你感兴趣的信息类别</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              return (
                <Link
                  key={m.code}
                  href={`/?type=${m.code}`}
                  className={`group relative overflow-hidden rounded-2xl bg-card border shadow-soft hover:shadow-hover hover:-translate-y-1 transition-all duration-300 animate-slide-up`}
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${m.gradient}`} />
                  <div className="p-6 space-y-3">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-display text-xl font-bold">{m.title}</div>
                      <div className="text-xs text-muted-foreground">{m.subtitle}</div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
                    <div className="flex items-center text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      浏览 <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* 页脚 */}
        <footer className="border-t mt-8">
          <div className="container py-8 text-center text-sm text-muted-foreground">
            <p>© 2026 伊春有事儿说 · Made with 🌲 in 小兴安岭</p>
          </div>
        </footer>
      </main>
    );
  }

  // ====================== 列表页 ======================
  const currentModule = MODULES.find((m) => m.code === currentType);
  const Icon = currentModule?.icon;
  // 只展示真正的子分类（排除父类"房屋出租/二手交易/招聘求职/便民信息"，
  // 否则会出现 "全部" 和 "房屋出租" 两个看起来一样但实际过滤结果不同的 tab，
  // 让用户困惑为什么 20 → 19 突然少 1 条）
  const subCategories = categories.filter(
    (c) => c.code === currentType && c.parentId != null && c.parentId !== '',
  );

  return (
    <main className="container py-8 space-y-6">
      {/* 顶部 Banner */}
      <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${currentModule?.gradient} text-white p-8 md:p-10 shadow-lg`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 text-white/80 text-xs uppercase tracking-widest font-semibold">
              {Icon && <Icon className="h-4 w-4" />}
              {currentModule?.subtitle}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
              {currentModule?.title}
            </h1>
            <p className="text-white/85 mt-1.5 text-sm">{currentModule?.desc}</p>
          </div>
          <Link href={`/posts/publish?type=${currentType}`}>
            <Button size="lg" className="rounded-full bg-white text-foreground hover:bg-white/90 shadow-md">
              <Plus className="mr-1 h-4 w-4" />
              发布{currentModule?.title}
            </Button>
          </Link>
        </div>
      </div>

      {/* 粘性筛选条 */}
      <div className="sticky top-16 z-30 -mx-4 px-4 py-3 bg-background/85 backdrop-blur-md border-b">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3.5 py-1.5 text-sm rounded-full font-medium transition-all ${
              !selectedCategory
                ? 'bg-foreground text-background shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
            }`}
          >
            全部
          </button>
          {subCategories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3.5 py-1.5 text-sm rounded-full font-medium transition-all ${
                selectedCategory === c.id
                  ? 'bg-foreground text-background shadow-md'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
              }`}
            >
              {c.name}
            </button>
          ))}
          <div className="flex-1" />
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="h-9 px-3 rounded-full border bg-background text-sm"
          >
            <option value="">📍 全部区域</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-9 px-3 rounded-full border bg-background text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border bg-card overflow-hidden">
              <div className="aspect-[16/9] bg-muted animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border-2 border-dashed bg-muted/30">
          <div className="text-6xl mb-4 opacity-50">📭</div>
          <p className="text-muted-foreground mb-4">暂无相关信息</p>
          <Link href={`/posts/publish?type=${currentType}`}>
            <Button>发布一条</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>共 <span className="font-bold text-foreground">{total}</span> 条</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {list.map((p, i) => (
              <PostCard key={p.id} post={p} index={i} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}