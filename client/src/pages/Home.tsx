import React, { useState, useRef, useEffect, useMemo } from "react";
import apiClient from "@/utils/apiClient"; // 添加这行
import { logout } from "@/services/authService";
import useAuth, { getLoginUser } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import {
  LogoutIcon,
  FileIcon,
  PrevIcon,
  NextIcon,
  FullscreenIcon,
  CloseIcon,
  InfoToggleIcon,
  PlayIcon,
  PauseIcon,
} from "@/assets/icons";
import { DatePicker } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// 定义搜索类型常量
const SEARCH_TYPES = {
  COMPREHENSIVE: 1, // 综合搜索
  PRECISE: 2, // 精确搜索
  SIMILARITY: 3, // 相似匹配
};

// 映射搜索类型到中文名称
const SEARCH_TYPE_NAMES = {
  1: "综合搜索",
  2: "精确搜索",
  3: "相似匹配",
};

// 添加类型定义
interface OcrResult {
  text: string;
  confidence: number;
}

interface ImageMetadata {
  file_path: string;
  ocr_metadata: {
    timestamp: string;
    active_app: string;
    window_title: string;
    ocr_result: OcrResult[];
  };
}

// 添加时间范围常量
const TIME_RANGES = {
  TODAY: "today",
  LAST_WEEK: "week",
  LAST_MONTH: "month",
  CUSTOM: "custom",
};

const TIME_RANGE_NAMES = {
  today: "最近一天",
  week: "最近一周",
  month: "最近一月",
  custom: "自定义时间",
};

const ImageSearch = () => {
  const loginUser = useAuth();
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState(SEARCH_TYPES.COMPREHENSIVE);
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  );

  const [showInfo, setShowInfo] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const controlsTimerRef = useRef<NodeJS.Timeout>();

  const [isPlaying, setIsPlaying] = useState(false);
  const playTimerRef = useRef<NodeJS.Timeout>();

  // 添加时间相关状态
  const [timeRange, setTimeRange] = useState(TIME_RANGES.LAST_WEEK);
  const [customStartDate, setCustomStartDate] = useState<dayjs.Dayjs | null>(
    null
  );
  const [customEndDate, setCustomEndDate] = useState<dayjs.Dayjs | null>(null);

  const handleSearch = async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }

    let startDate = "";
    let endDate = "";
    const now = dayjs();

    switch (timeRange) {
      case TIME_RANGES.TODAY:
        endDate = now.format("YYYY-MM-DD HH:mm:ss");
        startDate = now.subtract(24, "hour").format("YYYY-MM-DD HH:mm:ss");
        break;
      case TIME_RANGES.LAST_WEEK:
        endDate = now.endOf('day').format("YYYY-MM-DD HH:mm:ss");
        startDate = now.subtract(7, "day").startOf('day').format("YYYY-MM-DD HH:mm:ss");
        break;
      case TIME_RANGES.LAST_MONTH:
        endDate = now.endOf('day').format("YYYY-MM-DD HH:mm:ss");
        startDate = now.subtract(30, "day").startOf('day').format("YYYY-MM-DD HH:mm:ss");
        break;
      case TIME_RANGES.CUSTOM:
        startDate = customStartDate
          ? customStartDate.format("YYYY-MM-DD HH:mm:ss")
          : "";
        endDate = customEndDate
          ? customEndDate.format("YYYY-MM-DD HH:mm:ss")
          : "";
        break;
    }

    const response = await apiClient.post(
      loginUser.serverUrl + "/timebox/api/image/search",
      {
        query: searchQuery,
        type: searchType,
        startDate,
        endDate,
      }
    );

    setImages(response.data.results);
    setHasSearched(true);
  };

  const handleLogout = async () => {
    const [success, msg] = await logout(loginUser.serverUrl);
    if (success) {
      message.success(msg);
      navigate("/login");
    } else {
      message.error(msg);
    }
  };

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const handlePrevImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) =>
        (prev as number) === 0 ? images.length - 1 : (prev as number) - 1
      );
    }
  };

  const handleNextImage = () => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) =>
        (prev as number) === images.length - 1 ? 0 : (prev as number) + 1
      );
    }
  };

  const handleCloseModal = () => {
    setSelectedImageIndex(null);
    setIsPlaying(false);
  };

  const toggleInfo = () => {
    setShowInfo((prev) => !prev);
  };

  const handleToggleFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.error(
          `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
        );
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);

    if (controlsTimerRef.current) {
      clearTimeout(controlsTimerRef.current);
    }

    controlsTimerRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

  const togglePlay = () => {
    setIsPlaying((prev) => !prev);
  };

  useEffect(() => {
    if (isPlaying && selectedImageIndex !== null) {
      playTimerRef.current = setInterval(() => {
        handleNextImage();
      }, 1000); // 每3秒切换一次图片
    }

    return () => {
      if (playTimerRef.current) {
        clearInterval(playTimerRef.current);
      }
    };
  }, [isPlaying, selectedImageIndex]);

  useEffect(() => {
    return () => {
      if (controlsTimerRef.current) {
        clearTimeout(controlsTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center p-4 relative">
      {/* 添加背景图案 */}
      <div className="absolute inset-0 opacity-[0.03] bg-[url('@/assets/images/background.svg')] pointer-events-none"></div>

      {/* 退出登录按钮 */}
      <div className="w-full max-w-7xl flex justify-end mb-4">
        <button onClick={handleLogout} className="btn btn-ghost btn-sm">
          <LogoutIcon />
          退出登录
        </button>
      </div>

      {/* 搜索区域 - 添加更多样式和说明文字 */}
      <div
        className={`w-full max-w-2xl text-center ${
          hasSearched ? "mt-4" : "mt-20"
        }`}
      >
        <h1 className="text-4xl font-bold mb-4">Timebox</h1>
        <p className="text-gray-500 mb-8">让每个屏幕瞬间都成为触手可及的记忆</p>

        <form onSubmit={handleSearch} className="mb-8">
          <div className="flex flex-col gap-4">
            {/* 时间筛选行 */}
            <div className="flex flex-wrap gap-4 justify-center">
              {Object.entries(TIME_RANGE_NAMES).map(([key, value]) => (
                <label key={key} className="cursor-pointer">
                  <input
                    type="radio"
                    name="timeRange"
                    className="hidden"
                    checked={timeRange === key}
                    onChange={() => setTimeRange(key)}
                  />
                  <span
                    className={`px-4 py-2 rounded-full ${
                      timeRange === key
                        ? "bg-primary text-white"
                        : "bg-base-100"
                    }`}
                  >
                    {value}
                  </span>
                </label>
              ))}
            </div>

            {/* 自定义时间选择器 */}
            {timeRange === TIME_RANGES.CUSTOM && (
              <div className="flex gap-4 justify-center items-center">
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  value={[customStartDate, customEndDate]}
                  onChange={(dates) => {
                    setCustomStartDate(dates?.[0] || null);
                    setCustomEndDate(dates?.[1] || null);
                  }}
                  placeholder={["开始时间", "结束时间"]}
                  className="w-full md:w-[400px]"
                />
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 items-center">
              <select
                className="select select-bordered w-full md:w-auto"
                value={searchType}
                onChange={(e) => setSearchType(Number(e.target.value))}
              >
                {Object.entries(SEARCH_TYPE_NAMES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value}
                  </option>
                ))}
              </select>
              <div className="relative flex-1">
                <input
                  type="text"
                  className="input input-bordered w-full pl-4 pr-12"
                  placeholder="输入关键词搜索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary absolute right-0 top-0 rounded-l-none"
                >
                  搜索
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* 搜索结果区域保持不变 */}
      {hasSearched && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
          {images.map((image, index) => (
            <div
              key={index}
              className="card bg-base-100 shadow-xl overflow-hidden"
            >
              <div className="card-body p-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <FileIcon />
                  <span className="truncate">
                    {image.ocr_metadata.active_app} -{" "}
                    {image.ocr_metadata.window_title}
                  </span>
                </div>
              </div>
              <figure
                className="relative cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleImageClick(index)}
              >
                <img
                  src={`${loginUser.serverUrl}/timebox/api/image/${image.file_path}`}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full object-contain"
                />
                <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-gray-300 text-[10px] px-2 py-1 rounded">
                  {image.ocr_metadata.timestamp}
                </div>
              </figure>
            </div>
          ))}
        </div>
      )}

      {/* Modal 部分保持不变 */}
      {selectedImageIndex !== null && (
        <dialog
          className="modal modal-open"
          style={{ position: "fixed", zIndex: 1000 }}
        >
          <div
            className="modal-box max-w-none max-h-none w-screen h-screen p-0 relative bg-base-200"
            onMouseMove={handleMouseMove}
            onClick={handleMouseMove}
          >
            <div className="flex h-full">
              {/* 左侧图片区域 */}
              <div
                className={`flex-1 relative bg-black flex items-center transition-all duration-300 ease-in-out ${
                  showInfo ? "w-[calc(100%-20rem)]" : "w-full"
                }`}
              >
                <img
                  src={`${loginUser.serverUrl}/timebox/api/image/${images[selectedImageIndex].file_path}`}
                  alt={`Screenshot ${selectedImageIndex + 1}`}
                  className="max-h-full max-w-full m-auto object-contain"
                />

                {/* 所有控制按钮都应该在这个容器内 */}
                <div
                  className={`transition-opacity duration-300 ease-in-out ${
                    showControls ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {/* 导航按钮 */}
                  <button
                    className="btn btn-circle btn-ghost absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg border border-white/20 w-12 h-12 flex items-center justify-center z-10"
                    onMouseDown={(e) => {
                      handlePrevImage();
                    }}
                  >
                    <PrevIcon />
                  </button>
                  <button
                    className="btn btn-circle btn-ghost absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 backdrop-blur-sm text-white shadow-lg border border-white/20 w-12 h-12 flex items-center justify-center z-10"
                    onMouseDown={(e) => {
                      handleNextImage();
                    }}
                  >
                    <NextIcon />
                  </button>

                  {/* 顶部控制栏 */}
                  <div className="absolute top-0 left-0 right-0 p-2 flex justify-end items-center bg-gradient-to-b from-black/50 to-transparent">
                    <button
                      className="btn btn-circle btn-ghost text-white mr-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        togglePlay();
                      }}
                    >
                      {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button
                      className="btn btn-circle btn-ghost text-white mr-2"
                      onClick={handleToggleFullScreen}
                    >
                      <FullscreenIcon />
                    </button>
                    <button
                      className="btn btn-circle btn-ghost text-white mr-2"
                      onClick={toggleInfo}
                    >
                      <div
                        className={`transition-transform duration-300 ${
                          showInfo ? "" : "rotate-180"
                        }`}
                      >
                        <InfoToggleIcon />
                      </div>
                    </button>
                    <button
                      className="btn btn-circle btn-ghost text-white"
                      onClick={handleCloseModal}
                    >
                      <CloseIcon />
                    </button>
                  </div>
                </div>
              </div>

              {/* 右侧信息栏 */}
              <div
                className={`bg-base-100 overflow-hidden transition-all duration-300 ease-in-out ${
                  showInfo ? "w-80" : "w-0"
                }`}
              >
                <div className="p-4 space-y-4 w-80 h-full overflow-y-auto">
                  <div>
                    <h4 className="font-semibold mb-1">应用程序</h4>
                    <p className="text-sm">
                      {images[selectedImageIndex].ocr_metadata.active_app}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">窗口标题</h4>
                    <p className="text-sm">
                      {images[selectedImageIndex].ocr_metadata.window_title}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">时间戳</h4>
                    <p className="text-sm">
                      {images[selectedImageIndex].ocr_metadata.timestamp}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-1">识别文本</h4>
                    <div className="text-sm space-y-1">
                      {images[selectedImageIndex].ocr_metadata.ocr_result.map(
                        (result, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-base-200 rounded flex items-center"
                          >
                            <p className="flex-grow break-all mr-2">
                              {result.text}
                            </p>
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              {result.confidence}%
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={handleCloseModal}>关闭</button>
          </form>
        </dialog>
      )}
    </div>
  );
};

export default ImageSearch;
