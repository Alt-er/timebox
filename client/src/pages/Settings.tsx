import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import { isElectron, readConfig, writeConfig } from "@/utils/ipc";
import { logout } from "@/services/authService";
import { message, Modal } from "antd";

interface ClientConfig {
  captureIntervalTime: number; // 截图间隔时间（毫秒）
  pushIntervalTime: number; // 推送间隔时间（毫秒）
  similarityThreshold: number; // 相似度阈值（百分比）
  maxImagesPerPush: number; // 每次推送的最大图片数量
  screenshotDir: string; // 截图保存目录
}

interface ServerConfig {
  serverUrl: string;
  username: string;
  password: string;
}

export default function Settings() {
  const loginUser = useAuth();
  const navigate = useNavigate();

  // 默认值没有用, 会被nodejs数据覆盖
  const [clientConfig, setClientConfig] = useState<ClientConfig>({
    captureIntervalTime: 5000,
    pushIntervalTime: 10000,
    similarityThreshold: 80,
    maxImagesPerPush: 5,
    screenshotDir: "",
  });

  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    serverUrl: "",
    username: "",
    password: "",
  });

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      if (isElectron()) {
        const config = await readConfig();
        setClientConfig({
          captureIntervalTime: config.captureIntervalTime,
          pushIntervalTime: config.pushIntervalTime,
          similarityThreshold: config.similarityThreshold,
          maxImagesPerPush: config.maxImagesPerPush,
          screenshotDir: config.screenshotDir,
        });
        setServerConfig({
          serverUrl: config.serverUrl,
          username: config.username,
          password: config.password,
        });
      } else {
        // 浏览器环境不让进设置页面
        navigate("/");
      }
    };

    loadConfig();
  }, []);

  const handleSaveClientConfig = async () => {
    try {
      await writeConfig(clientConfig);
      message.success("客户端配置保存成功");
    } catch (error) {
      message.error("保存失败");
    }
  };

  const handleSaveServerConfig = async () => {
    try {
      await window.ipcRenderer.invoke("writeConfig", serverConfig);
      message.success("服务端配置保存成功");
    } catch (error) {
      message.error("保存失败");
    }
  };

  const handleLogout = async () => {
    const [success, errorMessage] = await logout(loginUser.serverUrl);
    if (success) {
      navigate("/login");
    } else {
      message.error(errorMessage);
      if(isElectron()){
        // 使用 antd 的 Modal.confirm 来显示确认框
        Modal.confirm({
          title: '登出失败',
          content: '是否强制退出登录到登录页面？',
          okText: '确认',
          cancelText: '取消',
          onOk: () => {
            // 强制跳转到登录页
            navigate("/login");
          }
        });
      }
    }
  };

  return (
    <div className="min-h-screen bg-base-200 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* 客户端配置 */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title text-2xl mb-6">客户端配置</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">截屏时间间隔 (秒)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={clientConfig.captureIntervalTime / 1000}
                onChange={(e) =>
                  setClientConfig({
                    ...clientConfig,
                    captureIntervalTime: Number(e.target.value) * 1000,
                  })
                }
                min="1"
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">推送时间间隔 (秒)</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={clientConfig.pushIntervalTime / 1000}
                onChange={(e) =>
                  setClientConfig({
                    ...clientConfig,
                    pushIntervalTime: Number(e.target.value) * 1000,
                  })
                }
                min="1"
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">相似度阈值 (%)</span>
                <span className="label-text-alt">低于此阈值的图片将被推送</span>
              </label>
              <input
                type="range"
                className="range range-primary"
                value={clientConfig.similarityThreshold}
                onChange={(e) =>
                  setClientConfig({
                    ...clientConfig,
                    similarityThreshold: Number(e.target.value),
                  })
                }
                min="0"
                max="100"
                step="1"
              />
              <div className="text-center mt-2">
                {clientConfig.similarityThreshold}%
              </div>
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">单次最大推送图片数量</span>
                <span className="label-text-alt">
                  每次最多推送多少张图片到服务器
                </span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={clientConfig.maxImagesPerPush}
                onChange={(e) =>
                  setClientConfig({
                    ...clientConfig,
                    maxImagesPerPush: Number(e.target.value),
                  })
                }
                min="1"
                max="100"
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">截图保存目录</span>
                <span className="label-text-alt">只读</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-grow"
                  value={clientConfig.screenshotDir}
                  disabled
                  readOnly
                />
                <div className="tooltip" data-tip="此设置暂不支持修改">
                  <button className="btn btn-circle btn-ghost btn-sm" disabled>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div className="card-actions justify-end mt-6">
              <button
                className="btn btn-primary"
                onClick={handleSaveClientConfig}
              >
                保存客户端配置
              </button>
            </div>
          </div>
        </div>

        {/* 服务端配置 */}
        <div className="card bg-base-100 shadow-xl opacity-70">
          <div className="card-body">
            <div className="flex items-center justify-between mb-6">
              <h2 className="card-title text-2xl">服务端配置</h2>
              <div className="badge badge-neutral">只读</div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">服务器地址</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={serverConfig.serverUrl}
                disabled
                readOnly
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">用户名</span>
              </label>
              <input
                type="text"
                className="input input-bordered"
                value={serverConfig.username}
                disabled
                readOnly
              />
            </div>

            <div className="form-control mt-4">
              <label className="label">
                <span className="label-text">密码</span>
              </label>
              <input
                type="password"
                className="input input-bordered"
                value={serverConfig.password}
                disabled
                readOnly
              />
            </div>

            <div className="card-actions justify-between mt-6">
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
                退出登录
              </button>
              <button className="btn btn-disabled" disabled>
                保存服务端配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
