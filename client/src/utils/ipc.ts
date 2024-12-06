export const isElectron = (): boolean => {
  return !!window?.ipcRenderer;
};

export const readConfig = async () => {
  return window.ipcRenderer.invoke("readConfig") as Promise<Config>;
};

export const writeConfig = async (config: Partial<Config>) => {
  return window.ipcRenderer.invoke("writeConfig", config);
};

interface Config {
  captureIntervalTime: number; // 截图间隔
  pushIntervalTime: number; // 推送间隔
  similarityThreshold: number; // 相似度阈值
  maxImagesPerPush: number; // 每次推送的最大截图数量
  screenshotDir: string; // 截图目录
  serverUrl: string; // 服务器URL
  username: string; // 用户名
  password: string;
}
