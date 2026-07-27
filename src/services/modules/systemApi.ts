import { httpClient } from '../api/httpClient';

// ================================================================
// 类型定义
// ================================================================

export interface SystemConfigItem {
  config_key: string;
  config_value: string | null;
  description: string | null;
}

export interface SystemConfigResponse {
  /** 配置键值对字典 */
  configs: Record<string, string>;
  /** 配置项列表（含 description） */
  items: SystemConfigItem[];
}

export interface SystemConfigUpdateRequest {
  /** 需更新的配置键值对 */
  configs: Record<string, string>;
}

export interface SystemConfigUpdateResponse {
  success: boolean;
  updated_keys: string[];
}

// ================================================================
// API
// ================================================================

export const systemApi = {
  /** 查询全部系统配置 */
  getConfig: () =>
    httpClient.get<SystemConfigResponse>('/system/config', {
      showLoading: false,
    }),

  /** 批量更新系统配置 */
  updateConfig: (data: SystemConfigUpdateRequest) =>
    httpClient.put<SystemConfigUpdateResponse>('/system/config', data, {
      showLoading: true,
    }),
};
