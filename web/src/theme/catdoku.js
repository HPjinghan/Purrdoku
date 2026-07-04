// 拆家喵 (Catdoku) theme pack — pure decoration, fully decoupled from logic
// (spec §10). Pools per spec §10.3; wording per §10.4–10.5.

export const THEME_ID = "catdoku";

// Cat roster: identified by a fixed number (1..9). The player supplies photos
// named cat1.png … cat9.png in web/public/cats/ — each cat renders its photo,
// falling back to the emoji when the file is absent. `nick` is a cute,
// breed-agnostic handle used in clue text; `color` tints the cat's cells.
export const CATS = [
  { id: 1, nick: "团子", emoji: "🐱", color: "#f6a24a" },
  { id: 2, nick: "毛球", emoji: "😸", color: "#c9a7d8" },
  { id: 3, nick: "煤球", emoji: "🐈‍⬛", color: "#5b5566" },
  { id: 4, nick: "汤圆", emoji: "🐈", color: "#e07a6d" },
  { id: 5, nick: "布丁", emoji: "😺", color: "#b79b78" },
  { id: 6, nick: "奶盖", emoji: "😻", color: "#9fb4c7" },
  { id: 7, nick: "芝麻", emoji: "🐮", color: "#6d7f8c" },
  { id: 8, nick: "花卷", emoji: "🙀", color: "#e8b7a0" },
  { id: 9, nick: "大福", emoji: "😼", color: "#8a9a5b" },
];

export const catImage = (id) => `./cats/cat${id}.png`;

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
};

export const TITLE_TEMPLATES = [
  ({ room }) => `${room}惨案`,
  ({ mess }) => `谁动了我的${mess}`,
  ({ cat }) => `${cat}的不在场证明`,
  ({ room }) => `周一早晨的${room}`,
  ({ mess }) => `${mess}失踪之谜`,
];
