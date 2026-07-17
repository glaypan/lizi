# 声学模拟页面 — 苹果设计风格全面优化方案

## 摘要

对 `/workspace/acoustic-reflection-simulation.html`（3400+ 行单文件）进行苹果设计风格优化。核心方向：**"安静的精密仪器"** — 克制、精致，让数据可视化本身成为视觉焦点。涉及 CSS 变量系统重构、字体替换（全部 OFL 1.1 免费商用）、JS 颜色集中管理、动效系统、人体工学合规。

## 当前问题

- **颜色混乱**：30+ 种硬编码颜色，仅 11 种走 CSS 变量；JS 中 ECharts + Canvas 约 80+ 处颜色硬编码
- **动效缺失**：3400 行文件仅 1 个 CSS 动画，无入场/切换/滚动动画
- **字体未统一加载**：Canvas 中引用 `JetBrainsMono`（7处）但未加载该字体
- **人体工学不达标**：多处文字 < 16px，`--text-secondary` 对比度约 5.6:1 不满足 WCAG AAA（7:1）
- **inline style 泛滥**：约 40+ 处
- **border-radius 9 种值**未统一
- **`transition: all` 滥用**（5 处）
- **噪点纹理覆盖全页**影响 Canvas 清晰度
- **无 focus-visible 状态**、无 `prefers-reduced-motion` 适配

## 字体方案（全部免费商用）

| 用途 | 字体 | 许可证 | 来源 |
|------|------|--------|------|
| Display/Body | Inter | SIL OFL 1.1 | Google Fonts |
| 中文 | Noto Sans SC（保留） | SIL OFL 1.1 | Google Fonts |
| Mono | JetBrains Mono | SIL OFL 1.1 | Google Fonts |

## 实施步骤

### 步骤 1：CSS 变量系统重构

扩展 `:root` 从 18 个变量到约 45 个，建立完整 Design Token 体系：

**颜色变量**（12 语义色 + surface + text + border）：
- `--c-omni: #22d3ee` / `--c-point: #fb7185` / `--c-stand-omni: #34d399` / `--c-stand-point: #fbbf24` / `--c-diffuse: #a78bfa` / `--c-info: #fb923c`
- `--bg-primary: #06080c` / `--bg-elevated: #0c1017` / `--bg-surface: #161d2a` / `--bg-canvas: #040609`
- `--text-primary: #f1f5f9`（AAA 15.6:1）/ `--text-secondary: #b4c0ce`（AAA 7.2:1）/ `--text-tertiary: #64748b`
- `--border-subtle` / `--border-default` / `--border-active` / `--border-glass`

**排版变量**：`--text-hero/h1/h2/h3/body/body-sm/caption/micro`、`--leading-tight/normal/relaxed`、`--weight-semibold/regular/light`、`--tracking-tight/normal/mono/label`

**间距变量**：`--space-1` 到 `--space-16`（4px base）、`--layout-pad`/`--layout-pad-sm`

**圆角变量**：`--radius-sm: 6px` / `--radius-md: 10px` / `--radius-lg: 16px` / `--radius-xl: 24px` / `--radius-full: 9999px` / `--radius-circle: 50%`

**阴影变量**：`--shadow-subtle/default/elevated`

**动效变量**：`--ease-default/spring/out`、`--duration-fast/normal/slow/slower`、`--stagger-step: 60ms`

### 步骤 2：字体替换

1. 替换 `@import` URL：DM Sans → Inter，DM Mono → JetBrains Mono
2. 更新 `:root` font-family 变量（加 `-apple-system, BlinkMacSystemFont` 后备）
3. JS 中 7 处 `ctx.font` 的 `'JetBrainsMono'` → `'"JetBrains Mono"'`（加引号）
4. 3 处 `'9px monospace'`/`'8px monospace'` → `'"JetBrains Mono", monospace'`
5. 1 处 `'bold 13px system-ui'` → `'bold 13px "Inter", sans-serif'`

### 步骤 3：JS 颜色集中管理

**在 AcousticEngine 之后插入 `ThemeColors` 全局对象**：

```javascript
var ThemeColors = {
  omni: '#22d3ee', point: '#fb7185', standOmni: '#34d399',
  standPoint: '#fbbf24', diffuse: '#a78bfa', info: '#fb923c',
  textPrimary: '#f1f5f9', textSecondary: '#b4c0ce',
  canvas: '#060a14', grid: '#1e293b', disabled: '#1e293b',
  rgba: function(hex, a) { /* hex → rgba(r,g,b,a) */ },
  particleColor: function(hex) { /* 生成 rgba(r,g,b,1)，兼容 .replace 模式 */ },
  echartsAxis: function() { /* 通用轴线/标签/网格配置 */ },
  echartsLegend: function(data) { /* 通用图例配置 */ }
};
```

**替换范围**（约 80+ 处）：
- 4 处粒子颜色数组（OMNI_COLORS/POINT_COLORS）→ `ThemeColors.particleColor()`
- 1 处 3D BOUNCE_COLORS
- Canvas 绘制函数（drawOmniSpeaker/drawPointSpeaker/drawListener/drawRoom/drawSpeaker3D/drawListener3D/drawAxes3D/drawRoom3D 等）→ `ThemeColors.rgba()`
- 4 个 tab 的 ECharts 配置中的 `itemStyle.color`、`axisLabel.color`、`lineStyle.color` 等 → `ThemeColors` 引用 + `echartsAxis()` 辅助函数
- 3 处 mode badge 动态 style → `ThemeColors.rgba()`

**关键约束**：`ThemeColors.particleColor()` 必须生成 `rgba(r,g,b,1)` 格式（无空格），兼容现有 14 处 `p.color.replace('1)', alpha + ')')` 模式。

### 步骤 4：间距和排版系统

**正文尺寸调整（人体工学）**：
- `.sim-desc` / `.info-card p` / `.nav-card p`：≥ 15px（0.9375rem）
- `.ctrl-group label` / `.chart-desc` / `.hint-row`：0.75rem
- `.metric-row`：0.8125rem（13px）
- `.metric-head` / `.canvas-label` / `.canvas-legend` / `.mode-badge` / `.site-footer`：0.6875rem
- 行高统一：正文 1.6-1.7，描述文字用 `--leading-relaxed`

**留白增加**：
- hero padding：→ `5rem var(--layout-pad) 4rem`
- nav-cards gap/margin：→ `1.5rem / 3.5rem auto`
- sim-section padding：→ `2rem var(--layout-pad)`（layout-pad=32px）
- info-panel padding：→ 2.5rem
- controls-bar padding：→ `1rem var(--layout-pad)`

**border-radius 统一**：9 种值映射到变量系统，删除 `--radius: 12px` 和 `--radius-lg: 20px`，统一为 `--radius-md: 10px` 和 `--radius-lg: 16px`

### 步骤 5：动效系统

1. **删除 body::before 噪点纹理**（影响 Canvas 清晰度）
2. **修复 5 处 `transition: all`** → 精确属性名
3. **新增入场动画** `fadeInUp`（staggered，仅对 `.tab-content.active` 内子元素）
4. **Tab 切换淡入淡出**：修改 `switchTab()` 函数，添加 `.tab-visible` class 控制 opacity 过渡
5. **Canvas 容器呼吸感边框**：`borderBreathe` 动画（4s 周期），hover 时停止
6. **新增 hover 微交互**：nav-card translateY(-3px) + shadow-elevated
7. **优化 pulse 动画**：扩散半径从 6px → 8px
8. **新增 `prefers-reduced-motion` 媒体查询**

### 步骤 6：组件级优化

- **Tab 导航**：pill 形状（`border-radius: var(--radius-full)`），active 态用 `rgba(255,255,255,0.08)` 背景替代实色
- **Controls 栏**：gap 增大到 20px，按钮 pill 化
- **Canvas Wrapper**：`border-radius: var(--radius-lg)`，hover 时微妙 glow `0 0 0 3px rgba(34,211,238,0.05)`
- **Chart Card**：去除 hover border-color 变化（苹果风格更平静）
- **Info Panel**：info-card 背景改为 transparent（去卡片化），hover 时才显示 surface 背景
- **Hero**：去掉底部 border，光晕 opacity 降至 0.6 + blur 增到 100px；hero badge inline style 提取为 `.hero-badge` class
- **Nav Card**：padding 增大，hover transform 用 spring 曲线

### 步骤 7：人体工学合规

1. `--text-secondary` 从 `#94a3b8`（5.6:1）→ `#b4c0ce`（7.2:1，满足 AAA）
2. 所有描述文字 ≥ 15px
3. 行高 ≥ 1.5
4. 新增 `focus-visible` 样式（2px solid --c-omni + outline-offset: 2px）
5. ctrl-btn padding 从 `6px 14px` → `8px 16px`（增大触摸目标）

### 步骤 8：验证

1. **功能回归**：5 个 Tab 切换、粒子模拟、ECharts 图表、拖拽交互、3D 旋转、模式切换全部正常
2. **颜色一致性**：`grep` 确认 JS 中剩余硬编码 hex 接近 0
3. **对比度**：DevTools 验证关键文字 ≥ 7:1
4. **字体加载**：确认 Inter / JetBrains Mono / Noto Sans SC 正确加载，Canvas 文字正确渲染
5. **性能**：`ThemeColors.rgba()` 不会成为性能瓶颈（仅字符串拼接）
6. **prefers-reduced-motion**：动画正确禁用

## 实施顺序

```
步骤 1 (CSS变量) ─┐
步骤 2 (字体)     ─┤
                   ├── 步骤 4 (间距排版) ── 步骤 6 (组件)
步骤 3 (JS颜色)   ─┤
                   └── 步骤 5 (动效)
                       └── 步骤 7 (人体工学) ── 步骤 8 (验证)
```

## 假设与决策

1. **不做 Light 模式适配**：页面为暗色科技可视化工具，Light 模式不在本次范围
2. **保留苹果风格的克制**：info-card 不完全去边框，仅降低存在感（transparent bg + 微弱 border）
3. **`--text-tertiary: #64748b`** 对比度约 3.6:1，仅用于装饰性/非关键文字（如 footer）
4. **ECharts tooltip 保持默认样式**：不额外定制
5. **manifest 中颜色保持同步**：`#06080c`、`#22d3ee`、`#fb7185`