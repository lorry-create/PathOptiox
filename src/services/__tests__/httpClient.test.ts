import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// S3-T06: 使用代理对象避免 axios.create() 实例与 MockAdapter 时机问题
// axiosInstance.request 委托给全局 axios（共享 defaults.adapter，MockAdapter 可拦截）
// 手动注入 Authorization token（模拟真实 axiosInstance.ts 拦截器行为）
// 用 cancelToken.promise.then 监听取消：MockAdapter 的 adapter 不主动处理 cancel，
// 当 mock reply 返回 pending Promise 时，需要手动监听 cancelToken 来触发 reject
// 加入 settled 防护，避免同一请求多次 resolve/reject
jest.mock('../api/axiosInstance', () => {
  const axiosReal: any = jest.requireActual('axios');
  const axiosInstance = axiosReal.default ?? axiosReal;
  return {
    axiosInstance: {
      request: (config: any) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
        return new Promise((resolve, reject) => {
          let settled = false;
          const onCanceled = (cancel: any) => {
            if (!settled) {
              settled = true;
              reject(cancel);
            }
          };
          if (config.cancelToken && !config.cancelToken.reason) {
            config.cancelToken.promise.then(onCanceled);
          }
          axiosInstance.request(config).then(
            (response) => {
              if (!settled) {
                settled = true;
                resolve(response);
              }
            },
            (error) => {
              if (!settled) {
                settled = true;
                reject(error);
              }
            }
          );
        });
      },
    },
  };
});

// S3-T06: mock @/mock 模块（同样使用 import.meta.env，在 Jest 下不可用）
jest.mock('@/mock', () => ({
  matchMockHandler: jest.fn(() => null),
  isMockEnabled: jest.fn(() => false),
}));

import { HttpClient } from '../api/httpClient';
import { loadingStateManager } from '../api/loadingState';

describe('HttpClient', () => {
  let httpClient: HttpClient;
  let mock: MockAdapter;

  beforeEach(() => {
    httpClient = new HttpClient();
    mock = new MockAdapter(axios, { delayResponse: 10 });
    loadingStateManager.reset();
  });

  afterEach(() => {
    mock.restore();
  });

  describe('GET requests', () => {
    it('should successfully fetch data', async () => {
      const mockData = { id: 1, name: 'Test' };
      mock.onGet('/test').reply(200, mockData);

      const result = await httpClient.get<typeof mockData>('/test');
      expect(result).toEqual(mockData);
    });

    it('should include auth token in headers', async () => {
      localStorage.setItem('access_token', 'test_token');
      let capturedHeaders: Record<string, string> = {};
      mock.onGet('/auth-test').reply((config) => {
        capturedHeaders = config.headers as Record<string, string>;
        return [200, {}];
      });

      await httpClient.get('/auth-test');
      expect(capturedHeaders.Authorization).toBe('Bearer test_token');
      localStorage.removeItem('access_token');
    });
  });

  describe('POST requests', () => {
    it('should successfully send POST request with data', async () => {
      const requestData = { username: 'test', password: '123456' };
      const responseData = { success: true, token: 'abc123' };
      mock.onPost('/login').reply(200, responseData);

      const result = await httpClient.post<typeof responseData>('/login', requestData);
      expect(result).toEqual(responseData);
    });

    it('should handle POST request with form-urlencoded content type', async () => {
      let capturedHeaders: Record<string, string> = {};
      mock.onPost('/login').reply((config) => {
        capturedHeaders = config.headers as Record<string, string>;
        return [200, { access_token: 'test' }];
      });

      await httpClient.post('/login', { username: 'test' }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      expect(capturedHeaders['Content-Type']).toBe('application/x-www-form-urlencoded');
    });
  });

  describe('Error handling', () => {
    it('should handle 401 unauthorized error', async () => {
      mock.onGet('/unauthorized').reply(401, { detail: 'Unauthorized' });

      await expect(httpClient.get('/unauthorized')).rejects.toMatchObject({
        code: 401,
        message: 'Unauthorized'
      });
    });

    it('should handle 404 not found error', async () => {
      mock.onGet('/notfound').reply(404, { detail: 'Resource not found' });

      await expect(httpClient.get('/notfound')).rejects.toMatchObject({
        code: 404,
      });
    });

    it('should handle 500 server error', async () => {
      mock.onGet('/server-error').reply(500, { message: 'Internal server error' });

      await expect(httpClient.get('/server-error')).rejects.toMatchObject({
        code: 500,
      });
    });

    it('should handle network errors', async () => {
      mock.onGet('/network-error').networkError();

      await expect(httpClient.get('/network-error')).rejects.toMatchObject({
        message: expect.stringContaining('网络'),
      });
    });

    it('should handle timeout errors', async () => {
      mock.onGet('/timeout').timeout();

      await expect(httpClient.get('/timeout')).rejects.toMatchObject({
        message: expect.stringContaining('超时'),
      });
    });
  });

  describe('Request cancellation', () => {
    it('should cancel specific request by key', async () => {
      let resolveReply: (() => void) | null = null;
      mock.onGet('/cancel-test').reply(() => new Promise((resolve) => {
        resolveReply = resolve;
      }));

      const requestPromise = httpClient.get('/cancel-test');
      httpClient.cancelRequest('GET:/cancel-test:{}');

      try {
        await requestPromise;
        throw new Error('Expected promise to reject');
      } catch (e) {
        expect((e as any).message).toBe('请求已取消');
      }
      // 清理 mock reply 的 pending Promise
      if (resolveReply) resolveReply();
    });

    it('should cancel all pending requests', async () => {
      let resolve1: (() => void) | null = null;
      let resolve2: (() => void) | null = null;
      mock.onGet('/request1').reply(() => new Promise((resolve) => { resolve1 = resolve; }));
      mock.onGet('/request2').reply(() => new Promise((resolve) => { resolve2 = resolve; }));

      const promise1 = httpClient.get('/request1');
      const promise2 = httpClient.get('/request2');

      httpClient.cancelAllRequests();

      try {
        await promise1;
        throw new Error('Expected promise1 to reject');
      } catch (e) {
        expect((e as any).message).toBe('请求已取消');
      }
      try {
        await promise2;
        throw new Error('Expected promise2 to reject');
      } catch (e) {
        expect((e as any).message).toBe('请求已取消');
      }
      if (resolve1) resolve1();
      if (resolve2) resolve2();
    });
  });

  describe('Retry mechanism', () => {
    it('should retry on 503 error when retry is enabled', async () => {
      let attemptCount = 0;
      mock.onGet('/retry-test').reply(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return [503, { message: 'Service Unavailable' }];
        }
        return [200, { success: true }];
      });

      const result = await httpClient.get('/retry-test', { retry: 2, retryDelay: 10 });
      expect(result).toEqual({ success: true });
      expect(attemptCount).toBe(3);
    });

    it('should not retry on 404 error', async () => {
      let attemptCount = 0;
      mock.onGet('/no-retry-404').reply(() => {
        attemptCount++;
        return [404, { message: 'Not Found' }];
      });

      await expect(httpClient.get('/no-retry-404', { retry: 2 })).rejects.toMatchObject({
        code: 404,
      });
      expect(attemptCount).toBe(1);
    });
  });

  describe('Loading state management', () => {
    it('should increment loading count on request start', async () => {
      mock.onGet('/loading-test').reply(200, { data: 'test' });

      const callback = jest.fn();
      loadingStateManager.subscribe(callback);

      const promise = httpClient.get('/loading-test');
      expect(loadingStateManager.isLoading()).toBe(true);

      await promise;
      expect(loadingStateManager.isLoading()).toBe(false);
    });
  });

  describe('Request with parameters', () => {
    it('should send query parameters correctly', async () => {
      let capturedParams: Record<string, string> = {};
      mock.onGet('/with-params').reply((config) => {
        capturedParams = config.params as Record<string, string>;
        return [200, {}];
      });

      await httpClient.get('/with-params', {
        params: { keyword: 'test', status: 'active' }
      });

      expect(capturedParams.keyword).toBe('test');
      expect(capturedParams.status).toBe('active');
    });
  });
});
