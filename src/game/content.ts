// ============ 黑市拍卖行 · 文本与角色内容池 ============
import type { AIKind, Category } from "./types";

export const ITEM_NAMES: Record<Category, string[]> = {
  绘画: ["无名港口", "雾中灯塔", "雨夜归舟", "胭脂雪", "孤城暮鸦", "春江旧梦", "月下听琴", "长街残照", "深院海棠", "北地秋猎", "烟岚十二峰", "金陵夜宴", "白马入关", "寒塘鹤影", "故园梨花", "赤壁余烬", "海上蜃楼", "空山行旅"],
  珠宝: ["泣血红玉", "月蚀胸针", "孔雀石王冠", "蓝焰指环", "海妖泪坠", "翡翠连环", "黑珍珠耳饰", "鎏星手钏", "蛇衔祖母绿", "雪原琥珀", "鸽血石项链", "银月脚铃", "断虹发簪", "夜皇后冠饰", "珊瑚凤钗", "紫晶祷珠", "金丝璎珞", "幽兰领扣"],
  古币: ["龙纹当十", "海东银饼", "赤乌通宝", "宣和孤品", "沙漠金币", "双凤花钱", "大秦半两", "永乐金叶", "安南船钱", "西域马币", "天启镇库钱", "咸丰母钱", "月氏银铢", "南洋贸易币", "北境军饷", "王城开炉钱", "铜雀宫钱", "幽州鬼脸钱"],
  武器: ["雁翎短刀", "虎头湛金枪", "雨切胁差", "霜纹马刀", "玄铁袖箭", "龙泉残剑", "银翅火铳", "边军腰刀", "宫廷仪仗剑", "蛇骨匕首", "猎鲸长矛", "鎏金护手刺", "黑旗军佩剑", "十字猎弩", "狼牙战斧", "鸦羽手杖剑", "海盗弯刀", "青铜戈首"],
  酒: ["女儿红旧藏", "波尔多黑印", "雪夜烧刀子", "修道院金露", "南洋沉船朗姆", "桂花御酿", "高原蜂蜜酒", "赤霞珠孤桶", "竹叶青秘藏", "勃艮第月桂", "沙皇冬宫伏特加", "绍兴花雕元红", "伊比利亚黑雪莉", "泥封杏花春", "海风杜松子酒", "琥珀贵腐甜酒", "丝路葡萄酿", "古堡夜钟干红"],
  手稿: ["雨巷遗札", "北平密电", "海上航海簿", "王府药方", "无字兵书", "旧都戏谱", "天文台观星录", "南渡日记", "失踪诗人的手抄本", "宫门夜值录", "租界暗语册", "西行传教札记", "江湖门派谱", "盐商账外账", "帝陵营造图", "孤岛植物志", "密室审讯录", "末代乐师曲谱"],
  雕塑: ["沉思的旅人", "折翼胜利女神", "青铜睡狮", "白玉飞天", "黑曜石祭司", "汉白玉侍女", "鎏金护法", "石榴裙舞者", "断首执灯者", "海潮圣母", "铜铸驯鹰人", "大理石少年", "木雕夜叉", "象牙微笑佛", "陶塑胡旋女", "铁铸守墓犬", "月桂诗人像", "无面国王"],
  奇物: ["永动沙漏", "逆纹罗盘", "无声留声机", "第十三把钥匙", "装雨的玻璃瓶", "褪色预言球", "黑潮怀表", "会呼吸的匣子", "双面占星盘", "午夜电话机", "失温的烛台", "不存在的门牌", "盐封人偶", "倒写日历", "深井回声盒", "月蚀标本瓶", "空白通行证", "梦境测量尺"],
};

export const ITEM_ADJECTIVES: string[] = ["鎏金", "残破", "鎏彩", "乌木", "象牙", "珐琅", "鎏银", "漆器", "烟熏", "秘藏", "雨蚀", "宫廷", "海捞", "血沁", "泥封", "失传", "孤本", "旧王朝", "租界", "午夜"];

export interface ClueTemplate { text: string; strength: number; }

export const GENUINE_CLUES: ClueTemplate[] = [
  { text: "流传脉络完整，最早可追至一位前朝盐商的私库", strength: 0.88 },
  { text: "包浆深入纹理，边角磨损与漫长岁月相互吻合", strength: 0.82 },
  { text: "旧档案中的尺寸、缺口与眼前之物逐一对应", strength: 0.93 },
  { text: "材质检测符合传闻年代，未见现代合成物残留", strength: 0.9 },
  { text: "落款笔意连贯，藏锋处保留着作者惯有的迟疑", strength: 0.79 },
  { text: "一枚几乎不可见的旧藏印，曾出现在民国图录中", strength: 0.86 },
  { text: "榫接与锻造方式已经失传，仿制成本极高", strength: 0.84 },
  { text: "显微观察可见自然氧化层层叠合，并非药水催成", strength: 0.91 },
  { text: "背面题记与某位末代王府管事的日记互相印证", strength: 0.87 },
  { text: "纸张纤维、墨色沉降与当时官坊用料一致", strength: 0.89 },
  { text: "修复师发现一处年代久远的暗补，手法符合旧例", strength: 0.72 },
  { text: "海外退藏清单中留有同一编号，来源并非空穴来风", strength: 0.9 },
  { text: "器物重心与手工误差自然，没有机械复制的僵硬感", strength: 0.76 },
  { text: "老藏家只看了一眼内壁火痕，便沉默着加了价", strength: 0.68 },
  { text: "紫外光下的老化反应均匀，后添部分极少", strength: 0.83 },
  { text: "家族信札提到过这件物品失踪前的最后一次转手", strength: 0.81 },
];

export const FAKE_CLUES: ClueTemplate[] = [
  { text: "底部发现过于新鲜的修补痕迹，像是刻意做旧", strength: 0.84 },
  { text: "卖家拒绝交代上一任持有人，只反复催促成交", strength: 0.63 },
  { text: "专家意见严重分裂，其中两人拒绝在证书上署名", strength: 0.72 },
  { text: "所谓旧藏印的边缘发虚，疑似照着图录翻刻", strength: 0.89 },
  { text: "材质中检出现代工业才有的微量成分", strength: 0.94 },
  { text: "年代故事讲得滴水不漏，却找不到任何同期旁证", strength: 0.75 },
  { text: "磨损集中在最显眼处，隐蔽角落反而光洁如新", strength: 0.86 },
  { text: "落款习惯与传世作品相反，像是临摹者用力过猛", strength: 0.91 },
  { text: "包装盒比物件本身更旧，二者似乎并非原配", strength: 0.7 },
  { text: "检测报告的骑缝章有重压痕迹，页码也不连续", strength: 0.92 },
  { text: "表面包浆能被酒精轻易带走，气味近似鞋油", strength: 0.96 },
  { text: "同模具制品上月曾在南方仓库成批出现", strength: 0.9 },
  { text: "细节巧妙避开所有可断代部位，留下的只有故事", strength: 0.77 },
  { text: "卖家声称来自王府，却把早已废止的年号说错", strength: 0.82 },
  { text: "内部螺纹规格晚于标称年代近半个世纪", strength: 0.93 },
  { text: "火漆封口下藏着第二层标签，日期明显更晚", strength: 0.8 },
];

export const NEUTRAL_CLUES: ClueTemplate[] = [
  { text: "拍卖行未随拍品提供正式检测报告", strength: 0.35 },
  { text: "委托人要求匿名，所有联络均由中间人代办", strength: 0.31 },
  { text: "物件曾在潮湿环境中存放，部分细节已难辨认", strength: 0.4 },
  { text: "现场灯光偏暗，颜色判断可能存在误差", strength: 0.25 },
  { text: "同类器物近年成交稀少，缺乏可靠价格参照", strength: 0.38 },
  { text: "木箱封条完好，但封存日期没有明确记录", strength: 0.34 },
  { text: "目录只写着一句旧藏，未列出历次转手", strength: 0.37 },
  { text: "几位买家交换过眼神，却没有人公开表态", strength: 0.28 },
];

export interface NewsTemplate { title: string; hint: string; affects: { category: Category; dir: 1 | -1 }[]; }

export const NEWS_TEMPLATES: NewsTemplate[] = [
  { title: "欧洲博物馆筹备战争遗物大展", hint: "旧军械与战争遗物的询价正在升温", affects: [{ category: "武器", dir: 1 }] },
  { title: "港口仓库查获一批来路不明的古兵器", hint: "同类货源骤增，武器行情或将承压", affects: [{ category: "武器", dir: -1 }] },
  { title: "沪上私人美术馆征集民国油画", hint: "有出处的绘画作品可能更受追捧", affects: [{ category: "绘画", dir: 1 }] },
  { title: "伪造名家印章的作坊被连夜端掉", hint: "市场对绘画真伪愈发敏感，短线交易趋冷", affects: [{ category: "绘画", dir: -1 }] },
  { title: "王室旧藏珠宝将在海外巡展", hint: "华丽珠宝重新回到藏家视线", affects: [{ category: "珠宝", dir: 1 }] },
  { title: "南洋矿场恢复供应，彩色宝石涌入市场", hint: "珠宝稀缺性可能暂时下降", affects: [{ category: "珠宝", dir: -1 }] },
  { title: "失落王朝钱币图录再版", hint: "古币圈正在重估罕见版别", affects: [{ category: "古币", dir: 1 }] },
  { title: "北方地窖出土整罐旧钱", hint: "普通古币供应增多，价格或有松动", affects: [{ category: "古币", dir: -1 }] },
  { title: "百年酒窖将在慈善晚宴开封", hint: "陈年佳酿成为席间最热的话题", affects: [{ category: "酒", dir: 1 }] },
  { title: "一批名庄酒被揭露换塞灌装", hint: "酒类买家开始收紧钱袋", affects: [{ category: "酒", dir: -1 }] },
  { title: "失踪作家遗稿现身旧报馆", hint: "手稿与私人信札或迎来一轮争夺", affects: [{ category: "手稿", dir: 1 }] },
  { title: "档案馆公开大批数字化文献", hint: "普通手稿的稀缺光环有所减弱", affects: [{ category: "手稿", dir: -1 }] },
  { title: "滨海新馆高价征集近代雕塑", hint: "雕塑类藏品出现机构买盘", affects: [{ category: "雕塑", dir: 1 }] },
  { title: "豪宅税务清算释放大批庭院雕像", hint: "雕塑供给增加，行情可能回落", affects: [{ category: "雕塑", dir: -1 }] },
  { title: "城南连续出现无法解释的停摆钟表", hint: "神秘物件引发猎奇藏家的追逐", affects: [{ category: "奇物", dir: 1 }] },
  { title: "巡捕房警告地下市场流传危险装置", hint: "奇物交易风险上升，接盘者趋于谨慎", affects: [{ category: "奇物", dir: -1 }] },
  { title: "海外基金同时追索东方旧藏", hint: "绘画与雕塑可能受到跨境资金青睐", affects: [{ category: "绘画", dir: 1 }, { category: "雕塑", dir: 1 }] },
  { title: "码头保险费突然上调", hint: "酒与异域珠宝的流通成本正在增加", affects: [{ category: "酒", dir: -1 }, { category: "珠宝", dir: -1 }] },
];

export interface SetTemplate { setId: number; setName: string; category: Category; parts: string[]; }

export const SET_TEMPLATES: SetTemplate[] = [
  { setId: 1, setName: "失落王朝金币", category: "古币", parts: ["晨星币", "日轮币", "暮月币"] },
  { setId: 2, setName: "金陵四时屏", category: "绘画", parts: ["春雨", "夏荷", "秋灯", "冬雪"] },
  { setId: 3, setName: "海妖的三滴泪", category: "珠宝", parts: ["潮生", "月落", "风息"] },
  { setId: 4, setName: "黑旗军官佩装", category: "武器", parts: ["佩刀", "火铳", "徽章"] },
  { setId: 5, setName: "修道院末宴", category: "酒", parts: ["祷告", "沉默", "钟声", "黎明"] },
  { setId: 6, setName: "雾都密电抄本", category: "手稿", parts: ["来电", "回电", "焚毁令"] },
  { setId: 7, setName: "十二夜守门人", category: "雕塑", parts: ["持钥者", "提灯者", "守钟者", "无面者"] },
  { setId: 8, setName: "逆行者仪器", category: "奇物", parts: ["逆纹罗盘", "停摆怀表", "无底沙漏"] },
  { setId: 9, setName: "旧宫凤钗", category: "珠宝", parts: ["东宫", "西宫"] },
  { setId: 10, setName: "边城烽火图", category: "绘画", parts: ["初烽", "孤城", "残垣"] },
  { setId: 11, setName: "南渡行囊文书", category: "手稿", parts: ["船票", "家书", "名册", "借据"] },
  { setId: 12, setName: "占星师的四方匣", category: "奇物", parts: ["东风", "南火", "西潮", "北辰"] },
];

type AIProfile = { emojis: string[]; names: string[]; risk: number; patience: [number, number]; bluffChance: number; preferredCount: [number, number]; };

export const AI_PROFILES: Record<AIKind, AIProfile> = {
  收藏家: { emojis: ["🧐", "🎩", "🦉", "📿"], names: ["顾听泉", "沈墨庵", "林鹤年", "苏砚秋", "白景堂", "闻人月"], risk: 0.15, patience: [5, 9], bluffChance: 0, preferredCount: [2, 2] },
  黄牛: { emojis: ["🧢", "🦊", "💼", "🧮"], names: ["铁算盘阿九", "快手梁三", "马六爷", "周算盘", "钱串子", "陆跑堂"], risk: 0.1, patience: [3, 6], bluffChance: 0, preferredCount: [1, 2] },
  赌徒: { emojis: ["🎲", "🃏", "🔥", "🥃"], names: ["骰王杜七", "红桃夫人", "霍三枪", "叶惊鸿", "唐一掷", "秦满堂"], risk: 0.35, patience: [4, 8], bluffChance: 0, preferredCount: [1, 2] },
  老狐狸: { emojis: ["🦊", "🪭", "👁️", "🕯️"], names: ["柳半城", "魏无咎", "韩九章", "陶掌柜", "秦四海", "罗隐川"], risk: 0.25, patience: [6, 10], bluffChance: 0.35, preferredCount: [1, 2] },
  富豪: { emojis: ["💎", "👑", "🦚", "🥂"], names: ["陆公馆少东", "宋爵士", "虞夫人", "贺兰公子", "荣四小姐", "杜邦办事人"], risk: 0.12, patience: [4, 8], bluffChance: 0, preferredCount: [1, 2] },
};

export const SPECIAL_BUYERS: { name: string; emoji: string; blurb: string }[] = [
  { name: "神秘私人藏家", emoji: "🕶️", blurb: "不问出处，只收能让旧宅再度有梦的珍品" },
  { name: "前朝遗族代理人", emoji: "🪭", blurb: "受命寻回散落民间的家族旧物" },
  { name: "海上博物馆密使", emoji: "⚓", blurb: "愿为镇馆之物绕开公开市场" },
  { name: "租界夜总会老板", emoji: "🥀", blurb: "正在装点一间只对熟客开放的密室" },
  { name: "北境军阀副官", emoji: "🦅", blurb: "奉命采购能替主人增添威仪的旧藏" },
  { name: "无名修道院司库", emoji: "🕯️", blurb: "为一笔沉睡多年的遗产寻找缺失之物" },
  { name: "南洋航运寡妇", emoji: "🦚", blurb: "她带着沉船名单，只买与往事相符的东西" },
  { name: "地下剧院经理", emoji: "🎭", blurb: "舞台背后缺一件足以压住流言的真家伙" },
  { name: "王府旧管家", emoji: "🗝️", blurb: "替不肯露面的主人辨认旧日陈设" },
  { name: "黑伞公馆来客", emoji: "☂️", blurb: "车停在后巷，报价只在午夜前有效" },
  { name: "远东考察团翻译", emoji: "🧭", blurb: "名单上的物件越危险，佣金便越丰厚" },
  { name: "失踪收藏家的女儿", emoji: "📜", blurb: "她只想买回父亲最后追逐的那件藏品" },
];

export const AI_KIND_LABEL: Record<AIKind, string> = { 收藏家: "收藏家", 黄牛: "黄牛", 赌徒: "赌徒", 老狐狸: "老狐狸", 富豪: "富豪" };
