import { httpClient } from '../api/httpClient';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  detail?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  role?: string;
}

export const authApi = {
  // 后端使用 OAuth2PasswordRequestForm，要求 form-urlencoded 格式（非 JSON）
  login: (data: LoginRequest) => {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    return httpClient.post<LoginResponse>('/auth/login', formData.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      showLoading: true,
    }).then((response) => {
      // 登录成功后存储 token 到 localStorage，供后续请求的 Authorization 头使用
      if (response.access_token) {
        localStorage.setItem('access_token', response.access_token);
      }
      return response;
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
  },

  getCurrentUser: () => {
    return httpClient.get<UserInfo>('/auth/me', { showLoading: false });
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  getToken: (): string | null => {
    return localStorage.getItem('access_token');
  },
};