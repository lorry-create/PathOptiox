/**
 * systemApi 单元测试
 *
 * 直接从模块文件导入，避免 barrel index.ts 触发 import.meta.env 加载链。
 */
jest.mock('@services/api/httpClient', () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  buildAuthHeaders: jest.fn(),
}));

import { httpClient } from '@services/api/httpClient';
import { systemApi } from '@services/modules/systemApi';

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('systemApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getConfig', () => {
    it('应调用 GET /system/config', async () => {
      const mockResponse = {
        configs: { green_mode_enabled: 'false', alert_threshold_delay_hours: '24' },
        items: [],
      };
      mockHttpClient.get.mockResolvedValue(mockResponse as never);

      const result = await systemApi.getConfig();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/system/config', expect.objectContaining({
        showLoading: false,
      }));
      expect(result.configs.green_mode_enabled).toBe('false');
    });
  });

  describe('updateConfig', () => {
    it('应调用 PUT /system/config 并传递配置字典', async () => {
      const mockResponse = { success: true, updated_keys: ['green_mode_enabled'] };
      mockHttpClient.put.mockResolvedValue(mockResponse as never);

      const result = await systemApi.updateConfig({
        configs: { green_mode_enabled: 'true' },
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/system/config',
        { configs: { green_mode_enabled: 'true' } },
        expect.objectContaining({ showLoading: true })
      );
      expect(result.success).toBe(true);
      expect(result.updated_keys).toContain('green_mode_enabled');
    });

    it('应支持批量更新多个配置', async () => {
      const mockResponse = {
        success: true,
        updated_keys: ['key1', 'key2', 'key3'],
      };
      mockHttpClient.put.mockResolvedValue(mockResponse as never);

      await systemApi.updateConfig({
        configs: { key1: 'v1', key2: 'v2', key3: 'v3' },
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/system/config',
        { configs: { key1: 'v1', key2: 'v2', key3: 'v3' } },
        expect.any(Object)
      );
    });
  });
});
