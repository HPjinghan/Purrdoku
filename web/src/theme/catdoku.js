// 拆家喵 (Catdoku) theme pack — pure decoration, fully decoupled from logic
// (spec §10). Pools per spec §10.3; wording per §10.4–10.5.

export const THEME_ID = "catdoku";

// Cat photos supplied by the player in web/public/cats/, grouped by body size.
// The generator assigns each cat a size class (large/medium/small); the skin
// picks a matching photo, so a "这格是只大猫" clue is always truthful and big
// cats really are drawn bigger. The cat's NAME is its filename (as requested).
export const CAT_POOL = {
  large: ["l1", "l2", "l3"],
  medium: ["m1", "m2", "m3", "m4", "m5", "sp1", "sp2", "sp3", "sp4"],
  small: ["s2", "s3"],
};

// Per-cat accent colour (tints its cells) + emoji fallback, keyed by filename.
const CAT_ORDER = [
  "l1", "l2", "l3", "m1", "m2", "m3", "m4", "m5",
  "sp1", "sp2", "sp3", "sp4", "s2", "s3",
];
const CAT_COLORS = [
  "#f6a24a", "#c9a7d8", "#5b5566", "#e07a6d", "#b79b78", "#9fb4c7", "#6d7f8c",
  "#e8b7a0", "#8a9a5b", "#d98b6a", "#7a9cc6", "#c58fb0", "#8a8f6d", "#6d8f8a",
];
const FALLBACK_EMOJI = "🐱😸🐈‍⬛🐈😺😻🐮🙀😼".split(/(?=)/u).filter((c) => c.trim());
export const CAT_META = Object.fromEntries(
  CAT_ORDER.map((name, i) => [
    name,
    { color: CAT_COLORS[i % CAT_COLORS.length], emoji: FALLBACK_EMOJI[i % FALLBACK_EMOJI.length] },
  ])
);

export const catImage = (name) => `./cats/${name}.png`;

// Visual scale + label per size class.
export const SIZE_SCALE = { large: 1.34, medium: 1.0, small: 0.82 };
export const SIZE_LABEL = { large: "大", medium: "中等个头的", small: "小" };

// Room types, ordered large → small. Rooms are named by size rank (the biggest
// room becomes the 客厅, the smallest a 储物间 / 衣帽间), so names stay
// plausible for the shape the generator produced. Each type carries its own
// furniture; cats may perch on any cell.
export const ROOM_TYPES = [
  { name: "客厅", furniture: [
    { name: "沙发", emoji: "🛋️" }, { name: "电视", emoji: "📺" },
    { name: "茶几", emoji: "🍵" }, { name: "落地灯", emoji: "💡" },
    { name: "绿植", emoji: "🪴" } ] },
  { name: "主卧", furniture: [
    { name: "大床", emoji: "🛏️" }, { name: "衣柜", emoji: "🚪" },
    { name: "梳妆镜", emoji: "🪞" }, { name: "台灯", emoji: "💡" } ] },
  { name: "餐厅", furniture: [
    { name: "餐桌", emoji: "🍽️" }, { name: "餐椅", emoji: "🪑" },
    { name: "酒柜", emoji: "🍷" }, { name: "吊灯", emoji: "💡" } ] },
  { name: "次卧", furniture: [
    { name: "床", emoji: "🛏️" }, { name: "书桌", emoji: "🪑" },
    { name: "抱枕", emoji: "🧸" }, { name: "台灯", emoji: "💡" } ] },
  { name: "客房", furniture: [
    { name: "床", emoji: "🛏️" }, { name: "衣柜", emoji: "🚪" },
    { name: "椅子", emoji: "🪑" }, { name: "台灯", emoji: "💡" } ] },
  { name: "书房", furniture: [
    { name: "书架", emoji: "📚" }, { name: "电脑", emoji: "🖥️" },
    { name: "椅子", emoji: "🪑" }, { name: "文件柜", emoji: "🗄️" } ] },
  { name: "厨房", furniture: [
    { name: "炉灶", emoji: "🍳" }, { name: "冰箱", emoji: "🧊" },
    { name: "咖啡机", emoji: "☕" }, { name: "刀架", emoji: "🔪" } ] },
  { name: "儿童房", furniture: [
    { name: "玩偶", emoji: "🧸" }, { name: "积木", emoji: "🧩" },
    { name: "气球", emoji: "🎈" }, { name: "小车", emoji: "🚗" } ] },
  { name: "茶室", furniture: [
    { name: "茶几", emoji: "🍵" }, { name: "茶壶", emoji: "🫖" },
    { name: "挂画", emoji: "🖼️" }, { name: "花瓶", emoji: "🏺" } ] },
  { name: "阳台", furniture: [
    { name: "盆栽", emoji: "🪴" }, { name: "晾衣架", emoji: "🧺" },
    { name: "摇椅", emoji: "🪑" }, { name: "花架", emoji: "🌿" } ] },
  { name: "洗衣房", furniture: [
    { name: "洗衣机", emoji: "🧺" }, { name: "挂架", emoji: "🪝" },
    { name: "瓶罐", emoji: "🧴" }, { name: "水桶", emoji: "🪣" } ] },
  { name: "玄关", furniture: [
    { name: "鞋柜", emoji: "👟" }, { name: "挂钩", emoji: "🧥" },
    { name: "伞架", emoji: "☂️" }, { name: "钥匙盘", emoji: "🔑" } ] },
  { name: "走廊", furniture: [
    { name: "挂画", emoji: "🖼️" }, { name: "边柜", emoji: "🗄️" },
    { name: "花瓶", emoji: "🏺" }, { name: "台灯", emoji: "💡" } ] },
  { name: "猫房", furniture: [
    { name: "猫爬架", emoji: "🐈" }, { name: "猫窝", emoji: "🧺" },
    { name: "猫碗", emoji: "🥣" }, { name: "逗猫棒", emoji: "🎣" } ] },
  { name: "浴室", furniture: [
    { name: "浴缸", emoji: "🛁" }, { name: "花洒", emoji: "🚿" },
    { name: "洗漱台", emoji: "🪥" }, { name: "卷纸架", emoji: "🧻" } ] },
  { name: "储物间", furniture: [
    { name: "纸箱", emoji: "📦" }, { name: "工具箱", emoji: "🧰" },
    { name: "水桶", emoji: "🪣" }, { name: "扫把", emoji: "🧹" } ] },
  { name: "衣帽间", furniture: [
    { name: "衣架", emoji: "🧥" }, { name: "鞋盒", emoji: "👟" },
    { name: "镜子", emoji: "🪞" }, { name: "帽子", emoji: "🎩" } ] },
];

// Knockable "mess" items — what cats bat onto the floor. Used in clue/title
// flavor (spec §10.3); distinct from furniture (where cats perch).
export const MESS = [
  { name: "花瓶", emoji: "🏺" }, { name: "绿植", emoji: "🪴" },
  { name: "毛线球", emoji: "🧶" }, { name: "键盘", emoji: "⌨️" },
  { name: "咖啡杯", emoji: "☕" }, { name: "卷纸", emoji: "🧻" },
  { name: "鱼缸", emoji: "🐟" }, { name: "窗帘", emoji: "🪟" },
  { name: "纸箱", emoji: "📦" }, { name: "充电线", emoji: "🔌" },
];

export const QUIRKS = [
  "爱打翻东西", "爱躲纸箱", "爱咬线", "爱扒拉小物", "爱蹬翻水杯",
];

export const DIR_LABEL = { left: "左", right: "右", above: "上", below: "下" };

// ---- clue wording pools (spec §10.4). {A}{B}=cat nicks, {room}, {mess}, {dir}.
export const CLUE_TEMPLATES = {
  same_room: [
    ({ A, B }) => `${A} 和 ${B} 一起窝在同一间搞事`,
    ({ A, B, mess }) => `打翻${mess}时,${A} 和 ${B} 都在场`,
    ({ A, B }) => `${A} 跟 ${B} 是这场浩劫的同伙,同一间下的手`,
  ],
  diff_room: [
    ({ A, B }) => `${A} 和 ${B} 各拆各的,压根不在同一间`,
    ({ A, B }) => `${A} 与 ${B} 分头行动,不在同一个房间`,
  ],
  in_room: [
    ({ A, room }) => `${A} 就赖在${room}不出来`,
    ({ A, room }) => `${room}的惨状,一看就是 ${A} 干的`,
  ],
  not_in_room: [
    ({ A, room, mess }) => `${room}的${mess}还好好的,${A} 肯定没来过`,
    ({ A, room }) => `${A} 死活不肯进${room}`,
  ],
  relpos: [
    ({ A, B, dir }) => `${A} 待的屋子比 ${B} 更靠${dir}`,
    ({ A, B, dir }) => `从 ${B} 那间往${dir}边走,才轮到 ${A}`,
  ],
  diag_adj: [
    ({ A, B }) => `${A} 和 ${B} 在斜对角的两间,爪子都快够着了`,
    ({ A, B }) => `${A} 跟 ${B} 隔着一个斜角对望`,
  ],
  // Direct pin — the decisive beginner clue ("cat is on this exact furniture").
  at_cell: [
    ({ A, room, furniture }) => `${A} 就趴在${room}的${furniture}上不肯走`,
    ({ A, room, furniture }) => `${room}的${furniture}上正瘫着 ${A}`,
    ({ A, spot }) => `${A} 稳稳占着${spot}`,
  ],
  // Size hint — narrows a cell to same-size cats ("this spot is a big cat").
  cell_size: [
    ({ room, furniture, sizeLabel }) => `${room}的${furniture}上是一只${sizeLabel}猫`,
    ({ spot, sizeLabel }) => `${spot}蹲着一只${sizeLabel}猫`,
  ],
};

export const TITLE_TEMPLATES = [
  ({ room }) => `${room}惨案`,
  ({ mess }) => `谁动了我的${mess}`,
  ({ cat }) => `${cat}的不在场证明`,
  ({ room }) => `周一早晨的${room}`,
  ({ mess }) => `${mess}失踪之谜`,
];
