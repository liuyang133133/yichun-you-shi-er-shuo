'use client';

import { useEffect, useRef, useState } from 'react';
import { Hash, X, Search, Loader2, Sparkles } from 'lucide-react';
import { tagApi, type Tag } from '@/lib/api';
import { cn } from '@/lib/utils';

export interface TagSelectorProps {
  /** 已选 tagId 列表 */
  value: number[];
  onChange: (ids: number[]) => void;
  /** 上限（与后端 CreatePostDto Max=5 对齐） */
  max?: number;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const DEBOUNCE_MS = 300;

/**
 * TagSelector — 标签多选选择器
 *  - 顶部：已选标签 pill（点击 × 移除）
 *  - 中部：搜索框 + 搜索结果下拉
 *  - 底部：热门标签联想（搜索框为空时显示）
 *  - 超出 max 提示
 */
export function TagSelector({
  value,
  onChange,
  max = 5,
  placeholder = '搜索标签…',
  disabled,
  className,
}: TagSelectorProps) {
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Tag[]>([]);
  const [searching, setSearching] = useState(false);
  const [hotTags, setHotTags] = useState<Tag[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 已选 tag 详情（用于显示）
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  // 加载热门标签
  useEffect(() => {
    tagApi.hot(12).then(setHotTags).catch(() => setHotTags([]));
  }, []);

  // 搜索防抖
  useEffect(() => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      tagApi
        .list({ keyword: keyword.trim(), pageSize: 10 })
        .then((r) => setSearchResults(r?.list || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [keyword]);

  // 用热门 + 搜索结果合并已选 tag 详情（避免重复请求）
  useEffect(() => {
    const allKnown = [...hotTags, ...searchResults];
    setSelectedTags((prev) => {
      const next: Tag[] = [];
      for (const id of value) {
        const found = allKnown.find((t) => Number(t.id) === id);
        if (found) {
          next.push(found);
        } else if (prev.find((p) => Number(p.id) === id)) {
          next.push(prev.find((p) => Number(p.id) === id)!);
        }
        // 否则跳过（未知 id，UI 显示为空但不影响提交）
      }
      return next;
    });
  }, [value, hotTags, searchResults]);

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function add(tag: Tag) {
    const id = Number(tag.id);
    if (value.includes(id)) return;
    if (value.length >= max) return;
    onChange([...value, id]);
  }

  function remove(id: number) {
    onChange(value.filter((v) => v !== id));
  }

  const isMax = value.length >= max;

  return (
    <div className={cn('space-y-3', className)} ref={containerRef}>
      {/* 已选标签 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200"
            >
              <Hash className="h-3 w-3" />
              {tag.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => remove(Number(tag.id))}
                  className="ml-0.5 hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                  aria-label={`移除 ${tag.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* 搜索框 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full h-10 pl-9 pr-3 rounded-lg border bg-background text-sm',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500',
            'disabled:opacity-50',
          )}
        />
        {isMax && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-600">
            已达上限 {max}
          </div>
        )}
      </div>

      {/* 下拉：搜索结果 / 热门联想 */}
      {open && !disabled && (
        <div className="border rounded-lg p-3 bg-card space-y-2 max-h-72 overflow-y-auto">
          {keyword.trim() ? (
            <>
              <div className="text-xs text-muted-foreground px-1">搜索结果</div>
              {searching ? (
                <div className="text-center py-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                  搜索中…
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-3 text-sm text-muted-foreground">
                  没有匹配的标签
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {searchResults.map((tag) => {
                    const selected = value.includes(Number(tag.id));
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => (selected ? remove(Number(tag.id)) : add(tag))}
                        disabled={!selected && isMax}
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          selected
                            ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-secondary text-secondary-foreground hover:bg-emerald-50 hover:text-emerald-700',
                          !selected && isMax && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <Hash className="h-3 w-3 mr-0.5" />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-xs text-muted-foreground px-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                热门标签（点击添加）
              </div>
              {hotTags.length === 0 ? (
                <div className="text-center py-3 text-sm text-muted-foreground">
                  加载中…
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {hotTags.map((tag) => {
                    const selected = value.includes(Number(tag.id));
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => (selected ? remove(Number(tag.id)) : add(tag))}
                        disabled={!selected && isMax}
                        className={cn(
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          selected
                            ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                            : 'bg-secondary text-secondary-foreground hover:bg-emerald-50 hover:text-emerald-700',
                          !selected && isMax && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <Hash className="h-3 w-3 mr-0.5" />
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        最多选 {max} 个标签（让帖子在标签页被找到）
      </div>
    </div>
  );
}
