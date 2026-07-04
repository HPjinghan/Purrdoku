// 拆家喵 (Catdoku) theme pack — pure decoration, fully decoupled from logic
// (spec §10). Swapping this file reskins the game; the solver/generator/grader
// never see it. Pools per spec §10.3; wording per §10.4–10.5.

export const THEME_ID = "catdoku";

// Each cat: a breed name + an emoji + an accent color, so cats are visually
// distinguishable at a glance (spec §10.2: 用品种,视觉天然可区分).
export const CATS = [
  { name: "橘猫", emoji: "🐱", color: "#f6a24a" },
  { name: "布偶", emoji: "😸", color: "#c9a7d8" },
  { name: "黑猫", emoji: "🐈‍⬛", color: "#5b5566" },
  { name: "三花", emoji: "🐈", color: "#e07a6d" },
  { name: "暹罗", emoji: "😺", color: "#b79b78" },
  { name: "银渐层", emoji: "😻", color: "#9fb4c7" },
  { name: "奶牛猫", emoji: "🐮", color: "#6d7f8c" },
  { name: "无毛猫", emoji: "🙀", color: "#e8b7a0" },
  { name: "狸花", emoji: "😼", color: "#8a9a5b" },
];

export const ROOMS = [
  "客厅", "厨房", "卧室", "书房", "阳台",
  "玄关", "浴室", "储物间", "儿童房",
];

// Mess items double as room/cell icons so spatial clues read more easily
// (spec §10.3: 专属彩蛋).
export const MESS = [
  { name: "花瓶", emoji: "🏺" },
  { name: "绿植", emoji: "🪴" },
  { name: "毛线球", emoji: "🧶" },
  { name: "键盘", emoji: "⌨️" },
  { name: "咖啡杯", emoji: "☕" },
  { name: "卷纸", emoji: "🧻" },
  { name: "鱼缸", emoji: "🐟" },
  { name: "窗帘", emoji: "🪟" },
  { name: "纸箱", emoji: "📦" },
  { name: "充电线", emoji: "🔌" },
];

export const QUIRKS = [
  "爱打翻东西", "爱躲纸箱", "爱咬线", "爱扒拉小物", "爱蹬翻水杯",
];

// Furniture per room type — cats may perch on any of it. Purely decorative;
// placed in cells by seed so a room reads as that room at a glance. Keyed by
// the base room name (numeric suffixes on cycled rooms are stripped).
export const ROOM_FURNITURE = {
  客厅: [
    { name: "沙发", emoji: "🛋️" },
    { name: "电视", emoji: "📺" },
    { name: "落地灯", emoji: "💡" },
    { name: "绿植", emoji: "🪴" },
  ],
  厨房: [
    { name: "炉灶", emoji: "🍳" },
    { name: "冰箱", emoji: "🧊" },
    { name: "咖啡机", emoji: "☕" },
    { name: "刀架", emoji: "🔪" },
  ],
  卧室: [
    { name: "床", emoji: "🛏️" },
    { name: "梳妆镜", emoji: "🪞" },
    { name: "台灯", emoji: "💡" },
    { name: "抱枕", emoji: "🧸" },
  ],
  书房: [
    { name: "书架", emoji: "📚" },
    { name: "电脑", emoji: "🖥️" },
    { name: "椅子", emoji: "🪑" },
    { name: "文件柜", emoji: "🗄️" },
  ],
  阳台: [
    { name: "盆栽", emoji: "🪴" },
    { name: "晾衣架", emoji: "🧺" },
    { name: "摇椅", emoji: "🪑" },
    { name: "花架", emoji: "🌿" },
  ],
  玄关: [
    { name: "鞋柜", emoji: "👟" },
    { name: "挂钩", emoji: "🧥" },
    { name: "伞架", emoji: "☂️" },
    { name: "钥匙盘", emoji: "🔑" },
  ],
  浴室: [
    { name: "浴缸", emoji: "🛁" },
    { name: "花洒", emoji: "🚿" },
    { name: "洗漱台", emoji: "🪥" },
    { name: "卷纸架", emoji: "🧻" },
  ],
  储物间: [
    { name: "纸箱", emoji: "📦" },
    { name: "工具箱", emoji: "🧰" },
    { name: "水桶", emoji: "🪣" },
    { name: "扫把", emoji: "🧹" },
  ],
  儿童房: [
    { name: "玩偶", emoji: "🧸" },
    { name: "气球", emoji: "🎈" },
    { name: "积木", emoji: "🧩" },
    { name: "小车", emoji: "🚗" },
  ],
};

// Fallback for any room without a typed set (e.g. cycled extras).
export const GENERIC_FURNITURE = [
  { name: "抱枕", emoji: "🧸" },
  { name: "纸箱", emoji: "📦" },
  { name: "绿植", emoji: "🪴" },
  { name: "小凳", emoji: "🪑" },
];

// Direction labels for relative-position clues.
export const DIR_LABEL = {
  left: "左", right: "右", above: "上", below: "下",
};

// ---- wording template pools (spec §10.4). {A}{B}=cats, {room}, {mess}, {dir}.
// Each is a function of the filled fields, chosen by seed at skin time.
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
};

// ---- title templates (spec §10.5).
export const TITLE_TEMPLATES = [
  ({ room }) => `${room}惨案`,
  ({ mess }) => `谁动了我的${mess}`,
  ({ cat }) => `${cat}的不在场证明`,
  ({ room }) => `周一早晨的${room}`,
  ({ mess }) => `${mess}失踪之谜`,
];
