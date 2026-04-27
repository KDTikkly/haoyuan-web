# 自转速度控制拖拽系统

## 实现日期
2026-04-27

## 核心特性

### 1. 自转速度控制
- **实时速度调整**：光标拖拽直接改变地球自转速度（rad/s），而非视角旋转
- **拖拽方向**：
  - 向右拖拽 → 加速自转（正速度增量）
  - 向左拖拽 → 减速或反向自转（负速度增量）
- **零延迟响应**：拖拽时速度立即变化，星球表面实时响应

### 2. 惯性阻尼衰减系统
- **释放时速度保留**：松开光标后速度增量按指数衰减
- **快速衰减**：每帧衰减 `8%`（damping factor = 0.92），营造"重型仪表"手感
- **自动回接**：速度增量低于阈值（0.001 rad/s）时重置为零，恢复预设基础自转速度
- **云层同步**：云层以地球自转速度的 0.6 倍独立旋转，同步响应拖拽控制

### 3. 物理厚重感参数
- **拖拽灵敏度**：`0.002` rad/s per pixel
  - 可通过 `window._superResEngine.configureDragInteraction({ sensitivity: 0.003 })` 调整
- **阻尼系数**：`0.92`（~8% 每帧）
  - 更大值 = 更长惯性衰减，更小值 = 更快回接基础速度
  - 调整范围：`[0.9, 0.999]`
- **基础自转速度**：`0.18` rad/s（~35秒/圈，清晰可见的自转效果）

## 技术实现

### 核心方法

#### `_setupDragInteraction()`
绑定指针事件到 WebGL canvas：
- `pointerdown`: 激活拖拽控制，记录初始位置，重置速度增量
- `pointermove`: 计算水平位移差，映射为自转速度增量
- `pointerup/leave/cancel`: 释放控制权，启用阻尼衰减

#### `_updateRotationSpeedDamping()`
在每帧渲染循环中执行：
```javascript
rotationSpeedDelta *= dampingFactor  // 衰减速度增量
if (|speedDelta| < minSpeedDelta) speedDelta = 0  // 回接基础速度
```

#### `_getCurrentRotationSpeed()`
动态计算当前自转速度：
```javascript
const baselineSpeed = 0.18  // 基础自转速度（rad/s）
const currentSpeed = baselineSpeed + rotationSpeedDelta  // 实际速度
return currentSpeed
```

### 速度控制流程

```
用户拖拽 → 速度增量 → 基础速度 + 增量 → 地球自转
     ↓            ↓            ↓            ↓
  水平位移    Δx × 0.002    0.18 + Δω   cloud × 0.6
     ↓            ↓            ↓            ↓
  向右加速    正增量加速    实时更新    云层同步
  向左减速    负增量反向    释放后      惯性衰减
```

## 使用方法

### 基础交互
1. **抓取**：在星球上按下鼠标左键
2. **拖拽**：水平移动鼠标改变自转速度
   - 向右拖拽：加速自转
   - 向左拖拽：减速或反向自转
3. **释放**：松开鼠标，速度增量按阻尼衰减，平滑回接基础自转速度

### 高级配置

```javascript
// 调整拖拽灵敏度（默认 0.002）
window._superResEngine.configureDragInteraction({ sensitivity: 0.003 })

// 调整阻尼系数（默认 0.92）
// 0.95 = 更长惯性，0.90 = 更快回接基础速度
window._superResEngine.configureDragInteraction({ damping: 0.95 })

// 禁用阻尼（速度增量不衰减）
window._superResEngine.configureDragInteraction({ enabled: false })

// 组合配置
window._superResEngine.configureDragInteraction({
  sensitivity: 0.003,
  damping: 0.95,
  enabled: true
})
```

## 调试信息

控制台输出：
```
[SuperResEngine] Rotation speed control interaction system initialized ✓
[SuperResEngine] Drag interaction configured: sensitivity: 0.002 damping: 0.92 enabled: true
```

## 注意事项

1. **光标样式**：悬停时显示 `grab`（手掌），拖拽时显示 `ew-resize`（水平调整）
2. **速度限制**：可通过调整灵敏度防止过快自转导致的视觉模糊
3. **性能优化**：使用 `passive: false` 精确控制事件，防止滚动干扰
4. **指针兼容**：支持鼠标、触摸、笔等所有指针设备
5. **云层同步**：云层始终以地球自转速度的 60% 独立旋转

## 未来优化方向

1. **垂直拖拽控制俯仰**：添加垂直拖拽来调整视角俯仰角（观察纬度）
2. **滚轮缩放**：绑定鼠标滚轮到相机距离
3. **速度可视化**：添加UI显示当前自转速度（相对于基础速度的百分比）
4. **惯性感测**：根据星球大小动态调整阻尼系数
5. **多星系控制**：扩展支持月球轨道速度控制

