# 项目记忆 — 伊春有事儿说

## 协作模式（三 AI 分角色）

```
WorkBuddy（产品经理）→ 写提示词
    ↓
Hermes（项目经理）→ 生成开发规格书 + 审查清单
    ↓
Claude Code（VSCode 开发）→ 按规格书编码 → Git commit
    ↓
Codex（审查）→ 审计代码 → 评分
    ↓
Hermes → 更新 project-state.md → 循环
```

- Hermes 模型: MiniMax-M3
- Hermes SOUL: `E:\workspace\yichun-you-shi-er-shuo\.hermes\SOUL.md`
- 提示词库: `E:\workspace\yichun-you-shi-er-shuo\HERMES-PROMPTS.md`

## 当前进度
- 后端: ~95%，用户端前端: ~70%，管理后台: ~40%
- 单元测试: 0%，生产部署: 未执行
