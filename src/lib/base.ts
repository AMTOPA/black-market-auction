/**
 * 应用部署前缀。构建期由 NEXT_PUBLIC_BASE_PATH 注入（例如 "/black-market-auction"），
 * 本地开发未设置时为空字符串，所有地址保持根路径。
 */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").replace(/\/+$/, "");

/** 将根路径 API 地址拼上前缀，供客户端 fetch 使用 */
export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}