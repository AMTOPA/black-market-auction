// ============ 黑市拍卖行 · 唯一 ID 生成（独立模块，避免 engine↔generator 循环依赖） ============
let uid = 0;

/** 生成稳定的唯一 ID（React key + 引擎实体引用共用） */
export const nextId = () => `e${Date.now().toString(36)}${(uid++).toString(36)}`;
