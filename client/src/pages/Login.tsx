import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/services/authService";
import { isElectron, readConfig } from "@/utils/ipc";
import { message } from "antd";

interface LoginForm {
  serverUrl: string;
  username: string;
  password: string;
}

const validateServerUrl = (url: string): boolean => {
  const urlPattern = /^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*(?::\d+)?$/;
  return urlPattern.test(url);
};

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginForm>({
    serverUrl: localStorage.getItem('lastServerUrl') || "",
    username: "",
    password: "",
  });

  useEffect(() => {
    const loadConfig = async () => {
      if (isElectron()) {
        const { serverUrl, username, password } = await readConfig();
        setFormData({ serverUrl, username, password });
      }
    };
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serverUrl || !formData.username || !formData.password) {
      message.error("请填写完整的登录信息");
      return;
    }

    if (!validateServerUrl(formData.serverUrl)) {
      message.error("服务地址格式不正确，应为 http(s)://域名(:端口) 的格式");
      return;
    }

    localStorage.setItem('lastServerUrl', formData.serverUrl);

    const [loginSuccess, msg] = await login(
      formData.serverUrl,
      formData.username,
      formData.password
    );

    if (loginSuccess) {
      message.success(msg);
      navigate("/settings");
    } else {
      message.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div className="card w-96 bg-base-100 shadow-xl">
        <form className="card-body" onSubmit={handleSubmit}>
          <h2 className="card-title text-2xl font-bold text-center mb-4">
            登录
          </h2>
          <div className="form-control">
            <label className="input input-bordered flex items-center gap-2">
              服务地址
              <input
                type="url"
                name="serverUrl"
                className="grow"
                placeholder="http://localhost:8000"
                value={formData.serverUrl}
                onChange={(e) =>
                  setFormData({ ...formData, serverUrl: e.target.value })
                }
                pattern="^https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9.]*(?::\d+)?$"
                title="请输入正确的服务地址格式：http(s)://域名(:端口)"
                autoComplete="url"
              />
            </label>
          </div>
          <div className="form-control mt-4">
            <label className="input input-bordered flex items-center gap-2">
              用户名
              <input
                type="text"
                name="username"
                className="grow"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                autoComplete="username"
              />
            </label>
          </div>

          <div className="form-control mt-4">
            <label className="input input-bordered flex items-center gap-2">
              密码
              <input
                type="password"
                name="password"
                className="grow"
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                autoComplete="current-password"
              />
            </label>
            <label className="label">
              <a href="#" className="label-text-alt link link-hover">
                忘记密码?
              </a>
            </label>
          </div>

          <div className="form-control mt-6">
            <button type="submit" className="btn btn-primary">
              登录
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
