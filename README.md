# 拆家喵 · Purrdoku

纯算法(非 LLM)的凶案推理逻辑谜题:N×N 网格上 N 只猫各躲一处,满足**每行每列各一只**(排列/拉丁方)+ 空间线索(房间 / 方位 / 对角 / 排除)。生成器保证 **唯一解 + 纯逻辑可解(无需盲猜)+ 难度可控**。逻辑骨架 100% 算法,主题(拆家喵)是可插拔的皮肤层,与逻辑完全解耦。

设计依据见 [`murdoku-clone-spec.md`](murdoku-clone-spec.md)。

## 结构

```
puzzle-gen/            离线生成器(算法主体,Python)
  purrgen/
    model.py           网格几何、房间、线索类型与语义(位掩码传播)
    rooms.py           随机连通房间划分(多源生长)
    layout.py          完整解生成(随机排列矩阵)+ 引导钉扎
    clues.py           从已知解枚举候选线索池(天然正确)
    solver_complete.py 完备求解器:回溯数解,验证唯一性
    solver_logical.py  逻辑推理求解器:分层人类规则,禁盲猜 + 难度打分
    difficulty.py      5 档难度(按最高推理规则层级 + 链式深度)
    pipeline.py        拒绝采样主流程:构造→裁剪→强制难度→校验→分桶
    export.py          输出静态 JSON 谜题包(仅逻辑层)
  generate.py          CLI:批量产出分级谜题包
  selftest.py          核心不变量自检
web/                  React 18 + Vite 前端(消费 JSON,套皮肤)
  src/
    theme/catdoku.js   拆家喵主题包:池子 + 措辞模板(纯装饰)
    theme/skin.js      按谜题 seed 确定性套皮(可复现)
    game/logic.js      前端解校验(线索语义与生成器一致)
    grid/, components/ 网格渲染(DOM/CSS,无游戏引擎)+ UI
    state/storage.js   localStorage 存档(prd_ 前缀)+ 分享编码
  public/puzzles/      生成器产出的谜题包
```

## 生成谜题

```bash
cd puzzle-gen
python selftest.py                 # 自检(房间连通性、求解器、端到端分级)
python generate.py \
  --plan "very-easy:6,easy:6,medium:6,hard:5,expert:3" \
  --seed 20260704 \
  --out ../web/public/puzzles/puzzles.json
```

无第三方依赖(纯标准库)。`--plan` 是 `档位:数量` 列表;生成器对每个候选实测求解过程,只保留落在目标难度带的题,并按实测难度重新分桶。

## 运行前端

```bash
cd web
npm install
npm run dev        # http://localhost:5173
npm run build      # 静态包 -> web/dist
```

## 核心原则

- **逻辑全算法**:两个求解器分工 —— 完备求解器验唯一性,逻辑求解器保证纯逻辑可解并给难度分级(用到的最高推理层级 + 链式推理深度)。
- **排列模型几何推论**:任意两猫必不同行不同列,曼哈顿距离恒 ≥ 2 —— 故"正交相邻""同行/同列"线索恒不成立,不采用;成立的邻近是**对角相邻**。
- **皮肤解耦**:谜题 JSON 只存抽象逻辑(网格 / 房间 id / 线索类型 + 实体 id);猫的品种、房间名、线索措辞、标题都由前端按 seed 采样主题包生成,一份谜题可换任意皮肤。
- **可复现随机**:提案端随机(尺寸/房间/线索配比)+ 皮肤随机都由种子驱动;验证端(唯一解 + 纯逻辑可解 + 难度)永远严格。
