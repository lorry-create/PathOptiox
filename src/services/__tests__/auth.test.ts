import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

// S3-T06: 使用代理对象避免 axios.create() 实例与 MockAdapter 时机问题
// axiosInstance.request 委托给全局 axios（共享 defaults.adapter，MockAdapter 可拦截）
// 并手动注入 Authorization token（模拟真实 axiosInstance.ts 拦截器行为）
// 手动监听 cancelToken.promise：MockAdapter 返回永不 resolve 的 Promise 时，
// axios 不会主动检查 cancel，需要手动触发 reject 以支持请求取消测试
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
          if (config.cancelToken) {
            config.cancelToken.promise.then((cancel: any) => {
              reject(cancel);
            });
          }
          axiosInstance.request(config).then(resolve, reject);
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

import { authApi } from '../modules/auth';

const mock = new MockAdapter(axios, { delayResponse: 10 });

describe('authApi', () => {
  beforeEach(() => {
    mock.reset();
    localStorage.removeItem('access_token');
  });

  afterAll(() => {
    mock.restore();
  });

  describe('login', () => {
    it('should return access token on successful login', async () => {
      const responseData = { access_token: 'test_token_123', token_type: 'bearer' };
      mock.onPost('/auth/login').reply(200, responseData);

      const result = await authApi.login({ username: 'testuser', password: 'password123' });
      expect(result.access_token).toBe('test_token_123');
    });

    it('should handle login error', async () => {
      mock.onPost('/auth/login').reply(401, { detail: 'Invalid credentials' });

      await expect(authApi.login({ username: 'wrong', password: 'wrong' }))
        .rejects.toMatchObject({ code: 401 });
    });

    it('should store token in localStorage on successful login', async () => {
      const responseData = { access_token: 'stored_token' };
      mock.onPost('/auth/login').reply(200, responseData);

      await authApi.login({ username: 'test', password: 'test' });
      expect(localStorage.getItem('access_token')).toBe('stored_token');
    });
  });

  describe('logout', () => {
    it('should remove token from localStorage', async () => {
      localStorage.setItem('access_token', 'some_token');
      authApi.logout();
      expect(localStorage.getItem('access_token')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when token exists', () => {
      localStorage.setItem('access_token', 'valid_token');
      expect(authApi.isAuthenticated()).toBe(true);
    });

    it('should return false when token does not exist', () => {
      localStorage.removeItem('access_token');
      expect(authApi.isAuthenticated()).toBe(false);
    });
  });

  describe('getToken', () => {
    it('should return the stored token', () => {
      localStorage.setItem('access_token', 'my_token');
      expect(authApi.getToken()).toBe('my_token');
    });

    it('should return null when no token is stored', () => {
      localStorage.removeItem('access_token');
      expect(authApi.getToken()).toBeNull();
    });
  });

  describe('getCurrentUser', () => {
    it('should fetch current user info', async () => {
      const userData = { id: '1', username: 'testuser', email: 'test@example.com' };
      mock.onGet('/auth/me').reply(200, userData);

      const result = await authApi.getCurrentUser();
      expect(result.username).toBe('testuser');
    });
  });
});
