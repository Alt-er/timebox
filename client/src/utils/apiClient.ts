import axios from 'axios';
import { login } from '@/services/authService';

const apiClient = axios.create({
//   baseURL: process.env.API_BASE_URL,
  withCredentials: true,
});

let retryCount = 0;
const maxRetries = 3;

apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
   
    if (error.response && error.response.status === 401 && retryCount < maxRetries) {
      const config = await window.ipcRenderer.invoke("readConfig");
      const { serverUrl, username, password } = config;
      retryCount += 1;
      const loginSuccess = await login(serverUrl, username, password);
      if (loginSuccess) {
        retryCount = 0;
        return apiClient(originalRequest);
      }
    }

    if (retryCount >= maxRetries) {
      console.error('重试次数达到上限，停止重试');
    }

    return Promise.reject(error);
  }
);

export default apiClient; 