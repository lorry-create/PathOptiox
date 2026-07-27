/**
 * carbonApi 单元测试
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
import { carbonApi } from '@services/modules/carbonApi';

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('carbonApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOverview', () => {
    it('应调用 GET /carbon/overview', async () => {
      const mockResponse = {
        total_emission_kg: 96124.2,
        trend_pct: -5.2,
        green_rate: 0.35,
        green_rate_trend: 2.1,
        offset_count_kg: 15000,
        offset_trend: -1.5,
        esg_score: 78.5,
        esg_trend: 3.2,
        energy_consumption_kwh: 50591,
        energy_trend: -4.1,
        pue: 1.42,
        pue_trend: -0.02,
      };
      mockHttpClient.get.mockResolvedValue(mockResponse as never);

      const result = await carbonApi.getOverview();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/carbon/overview', expect.objectContaining({
        showLoading: false,
      }));
      expect(result.total_emission_kg).toBe(96124.2);
    });
  });

  describe('getTrend', () => {
    it('应调用 GET /carbon/trend 并传递 time_range + transport_mode 参数', async () => {
      const mockResponse = [
        { date: '2026-07-22', sea: 120, air: 500, land: 80, rail: 20 },
      ];
      mockHttpClient.get.mockResolvedValue(mockResponse as never);

      await carbonApi.getTrend({ time_range: 'week', transport_mode: 'all' });

      expect(mockHttpClient.get).toHaveBeenCalledWith('/carbon/trend', expect.objectContaining({
        params: { time_range: 'week', transport_mode: 'all' },
        showLoading: false,
      }));
    });
  });

  describe('getNodes', () => {
    it('应调用 GET /carbon/nodes', async () => {
      const mockResponse = [
        { node_id: 'n1', node_name: '深圳', emission_kg: 50000, trend_pct: -2.5 },
      ];
      mockHttpClient.get.mockResolvedValue(mockResponse as never);

      const result = await carbonApi.getNodes();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/carbon/nodes', expect.objectContaining({
        showLoading: false,
      }));
      expect(result).toHaveLength(1);
      expect(result[0].node_name).toBe('深圳');
    });
  });

  describe('toggleGreenMode', () => {
    it('应调用 POST /carbon/toggle-green-mode 并传递 enable 参数', () => {
      carbonApi.toggleGreenMode(true);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/carbon/toggle-green-mode',
        { enable: true },
        expect.objectContaining({ showLoading: true })
      );
    });
  });

  describe('getEsgReport', () => {
    it('应调用 GET /carbon/esg-report', async () => {
      const mockResponse = {
        report_period: '2026 Q3',
        total_emission: 96000,
        scope1: 30000,
        scope2: 20000,
        scope3: 46000,
        reduction_target: 80000,
        actual_reduction: 75000,
        highlights: ['海运占比提升 12%'],
      };
      mockHttpClient.get.mockResolvedValue(mockResponse as never);

      const result = await carbonApi.getEsgReport();

      expect(mockHttpClient.get).toHaveBeenCalledWith('/carbon/esg-report', expect.objectContaining({
        showLoading: false,
      }));
      expect(result.scope1).toBe(30000);
    });
  });
});
