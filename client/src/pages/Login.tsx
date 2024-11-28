import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/services/authService";

interface LoginForm {
  serverUrl: string;
  username: string;
  password: string;
}

interface ToastState {
  isVisible: boolean;
  message: string;
  type: "info" | "success" | "error";
}

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<LoginForm>({
    serverUrl: "",
    username: "",
    password: "",
  });

  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    message: "",
    type: "info",
  });

  useEffect(() => {
    window.ipcRenderer.invoke("readConfig").then((config) => {
      const { serverUrl, username, password } = config;
      setFormData({ serverUrl, username, password });
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.serverUrl || !formData.username || !formData.password) {
      console.error("请填写完整的登录信息");
      return;
    }

    const loginSuccess = await login(formData.serverUrl, formData.username, formData.password);

    if (loginSuccess) {
      setToast({ isVisible: true, message: "登录成功", type: "success" });
      setTimeout(() => {
        navigate("/settings");
      }, 350);
    } else {
      setToast({ isVisible: true, message: "登录失败", type: "error" });
    }

    setTimeout(() => {
      setToast((prev) => ({ ...prev, isVisible: false }));
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center">
      <div
        className={`toast toast-top toast-center transition-opacity duration-300 ${
          toast.isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div
          className={`alert ${
            toast.type === "success" ? "alert-success" : "alert-error"
          }`}
        >
          <span>{toast.message}</span>
        </div>
      </div>
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center mb-4">
            登录
          </h2>
          <div className="form-control">
            <label className="input input-bordered flex items-center gap-2">
              服务地址
              <input
                type="text"
                className="grow"
                placeholder="https://localhost:8000"
                value={formData.serverUrl}
                onChange={(e) =>
                  setFormData({ ...formData, serverUrl: e.target.value })
                }
              />
            </label>
          </div>
          <div className="form-control mt-4">
            <label className="input input-bordered flex items-center gap-2">
              用户名
              <input
                type="text"
                className="grow"
                placeholder="请输入用户名"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
              />
            </label>
          </div>

          <div className="form-control mt-4">
            <label className="input input-bordered flex items-center gap-2">
              密码
              <input
                type="password"
                className="grow"
                placeholder="请输入密码"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
              />
            </label>
            <label className="label">
              <a href="#" className="label-text-alt link link-hover">
                忘记密码?
              </a>
            </label>
          </div>

          <div className="form-control mt-6">
            <button className="btn btn-primary" onClick={handleSubmit}>
              登录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
