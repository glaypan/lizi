# 音量滑块 + 粒子动态响应 + GitHub 发布计划

## 摘要

在当前声学模拟页面基础上，添加**总体音量控制滑块**，让粒子视觉效果（大小、亮度、光晕强度）随实时声压级动态变化，并完成整体页面优化后发布到 GitHub。

## 当前状态

- 页面已完成苹果设计风格优化（Inter 字体、ThemeColors 系统、动效系统）
- 已有独立 SPL 滑块（全向 0-140dB、点源 0-140dB）
- 粒子通过 `AcousticEngine.drawParticle` 统一绘制，使用 `p.size` 和 `alpha` 控制外观
- `calcDirectSPL` 已支持 `baseSPL` 参数

## 设计决策

### 总体音量滑块（Master Volume）

- **位置**：每个 tab 的 `controls-bar` 中，放在现有控制组之后
- **范围**：0% – 100%，默认 100%
- **作用**：作为全局乘数，影响所有粒子的视觉表现（不影响物理计算）
- **语义**：不是 SPL 替代，而是视觉表现的"增益控制"

### 粒子视觉动态响应

`drawParticle` 增加 `volumeFactor` 参数（0-1），影响以下属性：

| 视觉属性 | 当前固定值 | 动态公式 |
|---------|-----------|---------|
| 主体粒子半径 | `p.size` | `p.size * (0.5 + 0.5 * volumeFactor)` |
| 光晕半径 | `p.size * 2` | `p.size * (1 + 2 * volumeFactor)` |
| 光晕 alpha | `a * 0.12` | `a * (0.05 + 0.2 * volumeFactor)` |
| 核心高亮 alpha | `a * 0.9 + 0.1` | `a * (0.5 + 0.5 * volumeFactor)` |
| 轨迹 alpha | `segA * 0.75` | `segA * (0.3 + 0.7 * volumeFactor)` |

**volumeFactor 计算**：
- 反射 tab：`volumeFactor = (masterVolume / 100) * Math.min(1, spl / 120)`
- 漫射/驻波/3D tab：类似逻辑，基于各自的 SPL 计算

### 实时 SPL 显示增强

- 在 Canvas 角落显示当前两个音箱的实时 SPL 值（已有 label 系统可复用）
- 当 SPL > 120dB 时，粒子增加红色警告光晕

### 整体页面优化

1. **性能**：`drawParticle` 中减少不必要的 `beginPath()` 调用合并
2. **交互**：滑块拖动时实时更新，debounce 图表重绘
3. **视觉**：controls-bar 在小屏下的换行优化

### GitHub 发布

1. 初始化 git repo（如未初始化）
2. 添加 `.gitignore`
3. 创建 README.md（项目说明 + 截图 + 使用说明）
4. 提交并推送到 GitHub

## 实施步骤

### 步骤 1：添加 Master Volume 滑块

- 在 4 个 tab 的 `controls-bar` 中添加 `<input type="range" id="*-master-vol">`
- 添加显示值 `<span class="ctrl-value">`
- 添加 CSS `.ctrl-value` 样式（已存在）

### 步骤 2：修改 drawParticle 支持 volumeFactor

- `drawParticle(ctx, p, alpha)` → `drawParticle(ctx, p, alpha, volumeFactor)`
- volumeFactor 默认 1（向后兼容）
- 按上表修改各层半径和 alpha

### 步骤 3：各 tab 模拟引擎传递 volumeFactor

- 反射 tab：在 `draw()` 循环中计算每个粒子的 `volumeFactor`
- 漫射/驻波/3D tab：同样处理

### 步骤 4：添加事件监听

- 4 个 master volume slider 的 `input` 事件
- 更新全局 `AcousticEngine.masterVolume`

### 步骤 5：页面优化

- controls-bar 响应式换行
- 性能微调

### 步骤 6：GitHub 发布

- `git init`（如需要）
- 写 README.md
- `git add . && git commit -m "..."`
- `git remote add origin ... && git push`

## 验证

- [ ] 拖动 Master Volume 滑块，所有 tab 粒子大小同步变化
- [ ] 调整 SPL 滑块，粒子在相同 Master Volume 下仍有差异
- [ ] Master Volume 0% 时粒子几乎不可见但仍存在
- [ ] Master Volume 100% + SPL 140dB 时粒子有明显光晕
- [ ] GitHub repo 可正常访问
