import axios from "axios";
import { login } from "@/services/authService";
import { isElectron } from "./ipc";
import { message } from "antd";
import pkg from '../../package.json';

const apiClient = axios.create({
  //   baseURL: process.env.API_BASE_URL,
  withCredentials: true,
  headers: {
    'X-Client-Version': pkg.version
  }
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401) {
      window.location.hash = "#/login";
      message.error("登录已过期，请重新登录");
      return Promise.reject({
        ...error.response,
        data: {
          status: 401,
          message: "登录已过期，请重新登录",
        },
      });
    }

    if (error.response) {
      return Promise.reject(error.response);
    } else {
      return Promise.reject({
        data: {
          status: -1,
          message: error.message,
        },
      });
    }
  }
);

export default apiClient;
