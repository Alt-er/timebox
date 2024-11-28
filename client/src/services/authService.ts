
import { setLoginUser } from '@/hooks/useAuth';
import { LOGIN_API_PATH } from '@/constants/api';
import apiClient from '@/utils/apiClient';

export const login = async (serverUrl: string, username: string, password: string) => {
  const loginData = { username, password };

  try {
    const response = await apiClient.post(
      serverUrl + LOGIN_API_PATH,
      JSON.stringify(loginData),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 200 && response.data.status === 200) {
      setLoginUser({ username });
      window.ipcRenderer.invoke("writeConfig", {
        serverUrl,
        username,
        password,
      });
      return true;
    } else {
      console.error('登录失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('请求错误:', error);
    return false;
  }
};
