import { getLoginUser, removeLoginUser, setLoginUser } from "@/hooks/useAuth";
import { LOGIN_API_PATH, LOGOUT_API_PATH } from "@/constants/api";
import apiClient from "@/utils/apiClient";
import { isElectron, writeConfig } from "@/utils/ipc";

export const login = async (
  serverUrl: string,
  username: string,
  password: string
) => {
  const loginData = { username, password };

  try {
    const response = await apiClient.post(
      serverUrl + LOGIN_API_PATH,
      JSON.stringify(loginData),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 200 && response.data.status === 200) {
      // password 暂时不存了
      setLoginUser({ serverUrl, username });
      // electron环境保存账号密码
      if (isElectron()) {
        writeConfig({
          serverUrl,
          username,
          password,
        });
      }
      return [true, response.data.message];
    } else {
      console.error("登录失败:", response.data);
      return [false, response.data.message];
    }
  } catch (error: any) {
    console.error("请求错误:", error.data.message || error.data.detail  );
    return [false, error.data.message || error.data.detail];
  }
};

export const logout = async (serverUrl: string) => {
  try {
    const response = await apiClient.post(serverUrl + LOGOUT_API_PATH);

    if (response.status === 200 && response.data.status === 200) {
      removeLoginUser(); // 清除登录用户信息
      return [true, response.data.message];
    } else {
      console.error("登出失败:", response.data);
      return [false, response.data.message];
    }
  } catch (error: any) {
    console.error("请求错误:", error.data.message || error.data.detail);
    return [false, error.data.message || error.data.detail];
  }
};
