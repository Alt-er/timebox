import React, { useState } from "react";
import axios from "axios"; // 使用 axios 发送请求

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

const ImageSearch = () => {
  const [searchType, setSearchType] = useState(SEARCH_TYPES.COMPREHENSIVE);
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<ImageMetadata[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(true);

  const handleSearch = async (event?: React.FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    
    try {
      const response = await axios.post(
        "http://localhost:8000/timebox/api/image/search",
        {
          query: searchQuery,
          type: searchType,
        }
      );

      setImages(response.data.results);
      setHasSearched(true);

      console.log("发送到后端的搜索类型:", searchType);
      console.log("发送到后端的搜索查询:", searchQuery);
    } catch (error) {
      console.error("搜索请求失败:", error);
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
  };

  const toggleInfo = () => {
    setShowInfo(prev => !prev);
  };

  const handleToggleFullScreen = () => {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center p-4">
      <form 
        onSubmit={handleSearch}
        className={`w-full max-w-lg flex items-center mb-8 ${
          hasSearched ? "mt-4" : "mt-40"
        }`}
      >
        <select
          className="select select-bordered"
          value={searchType}
          onChange={(e) => setSearchType(Number(e.target.value))}
        >
          <option value={SEARCH_TYPES.COMPREHENSIVE}>
            {SEARCH_TYPE_NAMES[1]}
          </option>
          <option value={SEARCH_TYPES.PRECISE}>{SEARCH_TYPE_NAMES[2]}</option>
          <option value={SEARCH_TYPES.SIMILARITY}>
            {SEARCH_TYPE_NAMES[3]}
          </option>
        </select>
        <input
          type="text"
          className="input input-bordered flex-grow mx-2"
          placeholder="搜索图片内容"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">
          搜索
        </button>
      </form>
      {hasSearched && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-7xl">
          {images.map((image, index) => (
            <div
              key={index}
              className="card bg-base-100 shadow-xl overflow-hidden"
            >
              <div className="card-body p-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
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
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <span className="truncate">
                    {image.ocr_metadata.active_app} - {image.ocr_metadata.window_title}
                  </span>
                </div>
              </div>
              <figure className="relative cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => handleImageClick(index)}>
                <img
                  src={`http://localhost:8000/timebox/api/image/${image.file_path}`}
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
      {selectedImageIndex !== null && (
        <dialog className="modal modal-open">
          <div className="modal-box max-w-none max-h-none w-screen h-screen p-0 relative bg-base-200">
            <div className="flex h-full">
              {/* 左侧图片区域 */}
              <div className={`flex-1 relative bg-black flex items-center ${showInfo ? '' : 'w-full'}`}>
                <img
                  src={`http://localhost:8000/timebox/api/image/${images[selectedImageIndex].file_path}`}
                  alt={`Screenshot ${selectedImageIndex + 1}`}
                  className="max-h-full max-w-full m-auto object-contain"
                />
                
                {/* 导航按钮 */}
                <button
                  className="btn btn-circle btn-ghost absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 hover:bg-opacity-40"
                  onClick={handlePrevImage}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className="btn btn-circle btn-ghost absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-20 hover:bg-opacity-40"
                  onClick={handleNextImage}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* 顶部控制栏 */}
                <div className="absolute top-0 left-0 right-0 p-2 flex justify-end items-center bg-gradient-to-b from-black/50 to-transparent">
                  <button 
                    className="btn btn-circle btn-ghost text-white mr-2"
                    onClick={handleToggleFullScreen}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h6M4 4v6M20 20h-6M20 20v-6M4 20h6M4 20v-6M20 4h-6M20 4v6" />
                    </svg>
                  </button>
                  <button 
                    className="btn btn-circle btn-ghost text-white"
                    onClick={handleCloseModal}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 右侧信息栏 - 使用条件渲染和过渡动画 */}
              {showInfo && (
                <div 
                  className="w-80 bg-base-100 overflow-y-auto transition-transform duration-300"
                >
                  <div className="p-4 space-y-4">
                    <div>
                      <h4 className="font-semibold mb-1">应用程序</h4>
                      <p className="text-sm">{images[selectedImageIndex].ocr_metadata.active_app}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">窗口标题</h4>
                      <p className="text-sm">{images[selectedImageIndex].ocr_metadata.window_title}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">时间戳</h4>
                      <p className="text-sm">{images[selectedImageIndex].ocr_metadata.timestamp}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold mb-1">识别文本</h4>
                      <div className="text-sm space-y-1">
                        {images[selectedImageIndex].ocr_metadata.ocr_result.map((result, idx) => (
                          <div key={idx} className="p-2 bg-base-200 rounded flex items-center">
                            <p className="flex-grow break-all mr-2">{result.text}</p>
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              {result.confidence}%
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <button
                className={`btn btn-circle btn-ghost absolute right-2 top-16 text-white ${showInfo ? '' : 'bg-black bg-opacity-60'}`}
                onClick={toggleInfo}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                </svg>
              </button>
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
