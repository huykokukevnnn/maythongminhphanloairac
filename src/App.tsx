import React, { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  Clock,
  HelpCircle,
  Flame,
  Star
} from "lucide-react";
import { pipeline, env } from "@huggingface/transformers";
import { mapLabelToBin } from "./imagenet_classes";

interface ClassificationResult {
  bin_type: "vô cơ" | "tái chế" | "hữu cơ";
  explanation: string;
}

interface HistoryItem {
  id: string;
  bin_type: "vô cơ" | "tái chế" | "hữu cơ";
  timestamp: string;
}

// Beautiful Vector Trash Bin SVG component with interactive Lid opening animation
const TrashBinSvg = ({ 
  type, 
  isOpen, 
  isHighlighted, 
  onClick 
}: { 
  type: "vô cơ" | "tái chế" | "hữu cơ"; 
  isOpen: boolean; 
  isHighlighted: boolean; 
  onClick?: () => void;
}) => {
  const colors = {
    "vô cơ": {
      primary: "#ef4444", // Red
      dark: "#b91c1c",
      light: "#fee2e2",
      textColor: "text-red-600",
      label: "RÁC VÔ CƠ",
      icon: "🗑️"
    },
    "tái chế": {
      primary: "#eab308", // Yellow
      dark: "#a16207",
      light: "#fef9c3",
      textColor: "text-yellow-600",
      label: "RÁC TÁI CHẾ",
      icon: "♻️"
    },
    "hữu cơ": {
      primary: "#22c55e", // Green
      dark: "#15803d",
      light: "#dcfce7",
      textColor: "text-emerald-600",
      label: "RÁC HỮU CƠ",
      icon: "🍃"
    }
  };

  const active = colors[type];

  return (
    <div 
      onClick={onClick}
      className={`flex flex-col items-center cursor-pointer transition-all duration-300 select-none ${
        isHighlighted ? "scale-105 filter drop-shadow-xl" : "hover:scale-102 opacity-90 hover:opacity-100"
      }`}
      id={`svg-bin-${type === "vô cơ" ? "inorganic" : type === "tái chế" ? "recyclable" : "organic"}`}
    >
      <div className="w-40 h-52 sm:w-52 sm:h-68 md:w-[245px] md:h-[315px] lg:w-[270px] lg:h-[345px] p-1 relative flex items-center justify-center">
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 140 180" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="relative overflow-visible"
        >
          {/* Wheels support / axle */}
          <rect x="35" y="160" width="70" height="6" rx="3" fill="#4b5563" />
          {/* Wheels */}
          <circle cx="35" cy="163" r="10" fill="#1f2937" />
          <circle cx="35" cy="163" r="4" fill="#6b7280" />
          <circle cx="105" cy="163" r="10" fill="#1f2937" />
          <circle cx="105" cy="163" r="4" fill="#6b7280" />

          {/* Main Garbage Bin Base Body */}
          <path 
            d="M 25 45 L 34 152 Q 35 158 41 158 L 99 158 Q 105 158 106 152 L 115 45 Z" 
            fill={active.primary} 
            stroke="#1f2937"
            strokeWidth="3.5"
          />

          {/* Internal contrast shade line */}
          <path 
            d="M 102 45 L 93 152 Q 92 158 88 158" 
            stroke="rgba(0,0,0,0.15)" 
            strokeWidth="6" 
            fill="none" 
          />

          {/* Center icon emblem badge on the bin */}
          <circle cx="70" cy="100" r="21" fill="white" stroke="#1f2937" strokeWidth="2.5" />
          <text 
            x="70" 
            y="105" 
            fontSize="22" 
            textAnchor="middle" 
            dominantBaseline="middle"
          >
            {active.icon}
          </text>

          {/* Lid (Nắp Thùng Rác) Component Group with Smooth Lid Opening Motion */}
          <g 
            className="transition-transform duration-500 ease-out"
            style={{
              transform: isOpen ? "rotate(-38deg) translate(-22px, -24px)" : "rotate(0deg)",
              transformOrigin: "20px 42px"
            }}
          >
            {/* Bottom rim edge of the lid */}
            <rect x="18" y="32" width="104" height="12" rx="4" fill={active.dark} stroke="#1f2937" strokeWidth="3" />
            {/* Inside top lid structure */}
            <path d="M 45 32 L 52 20 Q 54 17 58 17 L 82 17 Q 86 17 88 20 L 95 32 Z" fill={active.primary} stroke="#1f2937" strokeWidth="3" />
          </g>
        </svg>
      </div>
      {/* Centered label directly on the bottom matching the Vietnamese drawing values */}
      <div className="mt-2.5 text-center">
        <span className={`text-[11px] sm:text-xs md:text-sm lg:text-base font-black px-4 py-2 md:px-6 md:py-3.5 border-3 rounded-2xl tracking-wide uppercase shadow-sm transition-all ${
          isHighlighted 
            ? "border-amber-400 bg-amber-50 text-amber-900 font-extrabold ring-4 ring-amber-400/20" 
            : "border-slate-800 bg-white text-slate-800"
        }`}>
          {active.label}
        </span>
      </div>
    </div>
  );
};

export default function App() {
  const [classifier, setClassifier] = useState<any>(null);
  const [modelLoadingProgress, setModelLoadingProgress] = useState<string>("Mô hình AI đang khởi động...");
  const [useSimulatedAI, setUseSimulatedAI] = useState<boolean>(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);

  // Load model once on mount
  useEffect(() => {
    async function initClassifier() {
      try {
        env.allowLocalModels = false;
        // Load ONNX WASM binaries from local path on our own domain instead of CDN (which is blocked in Vietnam)
        env.backends.onnx.wasm.wasmPaths = "/";
        const pipe = await pipeline("image-classification", "Xenova/mobilenet_v1_1.0_224", {
          progress_callback: (data: any) => {
            if (data.status === "progress") {
              setModelLoadingProgress(`Đang tải mô hình AI: ${data.progress.toFixed(0)}%`);
            } else if (data.status === "ready") {
              setModelLoadingProgress("Mô hình AI đã sẵn sàng!");
            }
          }
        });
        setClassifier(() => pipe);
      } catch (err: any) {
        console.error("Failed to load model:", err);
        setModelError(err.message || String(err));
      }
    }
    initClassifier();
  }, []);

  const [activeTab, setActiveTab] = useState<"webcam" | "presets">("webcam");
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  // Real classification outcome
  const [classification, setClassification] = useState<ClassificationResult | null>(null);

  // Gamification & points metrics loaded from localStorage
  const [points, setPoints] = useState<number>(() => {
    const saved = localStorage.getItem("eco_points_simple");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [streak, setStreak] = useState<number>(() => {
    const saved = localStorage.getItem("eco_streak_simple");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem("eco_history_simple");
    return saved ? JSON.parse(saved) : [];
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Save changes to parameters
  useEffect(() => {
    localStorage.setItem("eco_points_simple", points.toString());
  }, [points]);
  useEffect(() => {
    localStorage.setItem("eco_streak_simple", streak.toString());
  }, [streak]);
  useEffect(() => {
    localStorage.setItem("eco_history_simple", JSON.stringify(history));
  }, [history]);

  // Turn on camera feed automatically when appropriate
  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((playErr) => {
          // AbortError is benign and occurs if camera toggling/unmounting interrupts play
          if (playErr.name !== "AbortError") {
            console.warn("Video stream play() was interrupted gracefully:", playErr);
          }
        });
        setCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setCameraError("Không thể kích hoạt webcam. Vui lòng cho phép quyền truy cập camera hoặc chuyển sang phần 'Vật mẫu'.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
  };

  useEffect(() => {
    if (activeTab === "webcam" && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab, capturedImage]);

  // Capture static frames directly from the live feed and push to server
  const captureAndClassify = async () => {
    setAnalysisError(null);
    setClassification(null);

    let picData = capturedImage;

    // Tự động dọn ảnh cũ và khởi động lại camera nếu đã có ảnh chụp từ trước
    if (capturedImage && activeTab === "webcam") {
      setCapturedImage(null);
      picData = null;
      await startCamera();
      // Đợi cho dòng dữ liệu video nạp đầy đủ trong vài trăm mili giây
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Fetch snapshot directly from webcam canvas element if camera is active
    if (activeTab === "webcam" && videoRef.current && !picData) {
      const video = videoRef.current;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = video.videoWidth || 640;
      tempCanvas.height = video.videoHeight || 480;
      const ctx = tempCanvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
        picData = tempCanvas.toDataURL("image/jpeg", 0.9);
        setCapturedImage(picData);
        stopCamera();
      }
    }

    if (!picData) {
      setAnalysisError("Chưa có ảnh vật phẩm. Vui lòng bật webcam chụp hình hoặc chọn ảnh từ mục 'Vật mẫu' nhé!");
      return;
    }

    setIsAnalyzing(true);
    try {
      let mappedResult;

      if (useSimulatedAI) {
        // Simulated AI mapping for presets and webcam
        if (selectedPreset) {
          if (selectedPreset.startsWith("organic")) {
            mappedResult = {
              bin_type: "hữu cơ" as const,
              explanation: "Đây là thùng rác Hữu cơ dùng để chứa các loại rác dễ phân hủy để ủ thành phân bón cho cây trồng."
            };
          } else if (selectedPreset.startsWith("recycle")) {
            mappedResult = {
              bin_type: "tái chế" as const,
              explanation: "Đây là thùng rác Tái chế dùng để chứa các nguyên liệu có thể tái sản xuất để giảm thiểu rác thải và bảo vệ môi trường."
            };
          } else {
            mappedResult = {
              bin_type: "vô cơ" as const,
              explanation: "Đây là thùng rác Vô cơ dùng để chứa các loại rác không thể tái chế hoặc phân hủy để mang đi chôn lấp hoặc xử lý an toàn."
            };
          }
        } else {
          const types = ["tái chế", "hữu cơ", "vô cơ"] as const;
          const randomType = types[Math.floor(Math.random() * types.length)];
          const explanationTemplates = {
            "tái chế": "Đây là thùng rác Tái chế dùng để chứa các nguyên liệu có thể tái sản xuất để giảm thiểu rác thải và bảo vệ môi trường. (Chế độ mô phỏng)",
            "hữu cơ": "Đây là thùng rác Hữu cơ dùng để chứa các loại rác dễ phân hủy để ủ thành phân bón cho cây trồng. (Chế độ mô phỏng)",
            "vô cơ": "Đây là thùng rác Vô cơ dùng để chứa các loại rác không thể tái chế hoặc phân hủy để mang đi chôn lấp hoặc xử lý an toàn. (Chế độ mô phỏng)"
          };
          mappedResult = {
            bin_type: randomType,
            explanation: explanationTemplates[randomType]
          };
        }
      } else {
        if (!classifier) {
          throw new Error("Mô hình AI chưa sẵn sàng. Vui lòng tải lại trang hoặc đợi trong giây lát.");
        }

        // Run local client-side prediction
        const results = await classifier(picData);
        if (!results || results.length === 0) {
          throw new Error("Không tìm thấy kết quả nhận diện từ mô hình.");
        }

        const topResult = results[0];
        mappedResult = mapLabelToBin(topResult.label);
      }

      setClassification({
        bin_type: mappedResult.bin_type,
        explanation: mappedResult.explanation
      });

      // Award points
      setPoints((prev) => prev + 10);
      setStreak((prev) => prev + 1);

      // Append to local student activity history list
      const logItem: HistoryItem = {
        id: Date.now().toString(),
        bin_type: mappedResult.bin_type,
        timestamp: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      };
      setHistory((prev) => [logItem, ...prev].slice(0, 5));

    } catch (err: any) {
      console.error("AI classify failed:", err);
      setAnalysisError(err.message || "Gặp sự cố phân tích hình ảnh bằng AI cục bộ.");
      setStreak(0);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Preset quick simulation items for seamless testing inside sandboxes
  const selectPreset = (
    item:
      | "organic_apple"
      | "organic_banana"
      | "organic_bread"
      | "recycle_bottle"
      | "recycle_can"
      | "recycle_paper"
      | "inorganic_styrofoam"
      | "inorganic_plastic_bag"
      | "inorganic_ceramic"
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Define colors and emojis for presets
    let bgColor = "#fafafa";
    let emoji = "📦";

    if (item === "organic_apple") {
      bgColor = "#f0fdf4";
      emoji = "🍎";
    } else if (item === "organic_banana") {
      bgColor = "#fef9c3";
      emoji = "🍌";
    } else if (item === "organic_bread") {
      bgColor = "#ffedd5";
      emoji = "🍞";
    } else if (item === "recycle_bottle") {
      bgColor = "#ecfeff";
      emoji = "🧴";
    } else if (item === "recycle_can") {
      bgColor = "#fee2e2";
      emoji = "🥤";
    } else if (item === "recycle_paper") {
      bgColor = "#fafaf9";
      emoji = "📦";
    } else if (item === "inorganic_styrofoam") {
      bgColor = "#faf5ff";
      emoji = "🍱";
    } else if (item === "inorganic_plastic_bag") {
      bgColor = "#fff7ed";
      emoji = "🛍️";
    } else if (item === "inorganic_ceramic") {
      bgColor = "#f1f5f9";
      emoji = "🥣";
    }

    // Draw background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 300, 300);

    // Draw a subtle border or design accent pattern inside the card limit for visual richness
    ctx.strokeStyle = "rgba(0,0,0,0.06)";
    ctx.lineWidth = 12;
    ctx.strokeRect(15, 15, 270, 270);

    // Draw centralized glowing background circle
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(150, 150, 75, 0, Math.PI * 2);
    ctx.fill();

    // Draw black outline circle for comic style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(150, 150, 75, 0, Math.PI * 2);
    ctx.stroke();

    // Draw the main interactive Emoji
    ctx.font = "80px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, 150, 150);

    setSelectedPreset(item);
    setCapturedImage(canvas.toDataURL("image/jpeg", 0.9));
    setClassification(null);
    setAnalysisError(null);
  };

  const clearEverything = () => {
    setCapturedImage(null);
    setClassification(null);
    setAnalysisError(null);
    setPoints(0);
    setStreak(0);
    setHistory([]);
    if (activeTab === "webcam") startCamera();
  };

  const resetCameraOnly = () => {
    setCapturedImage(null);
    setClassification(null);
    setAnalysisError(null);
    if (activeTab === "webcam") startCamera();
  };

  return (
    <div className="h-screen w-screen flex flex-col p-1.5 md:p-3 font-sans text-neutral-800 overflow-hidden bg-neutral-100" id="main-root">
      
      {/* Container holding the simple layout requested by user */}
      <div className="w-full h-full bg-[#f0fdf4] border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-[32px] p-3 md:p-5 flex flex-col gap-3 justify-between relative overflow-hidden" id="app-container">
        
        {/* Full-screen Loading Overlay during classification */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-[#f0fdf4]/95 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-5 animate-fade-in" id="full-viewport-loading-overlay">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 border-[10px] border-emerald-100 border-t-emerald-500 rounded-full animate-spin shadow-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl animate-bounce">🤖</div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-950 animate-pulse text-center max-w-sm sm:max-w-xl px-6 leading-normal uppercase tracking-wider">
              🤖 AI đang phân tích & tìm nắp thùng rác phù hợp...
            </p>
          </div>
        )}

        {/* Full-screen Model Loading Overlay */}
        {!classifier && !useSimulatedAI && (
          <div className="absolute inset-0 bg-[#f0fdf4]/98 backdrop-blur-lg z-50 flex flex-col items-center justify-center gap-5 animate-fade-in" id="model-loading-overlay">
            <div className="relative">
              <div className="w-28 h-28 sm:w-32 sm:h-32 border-[10px] border-emerald-100 border-t-emerald-500 rounded-full animate-spin shadow-lg"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl animate-bounce">🤖</div>
            </div>
            
            {modelError ? (
              <div className="flex flex-col items-center gap-4 max-w-md px-6 text-center">
                <p className="text-xl font-black text-red-600 uppercase">Lỗi tải mô hình AI</p>
                <p className="text-xs text-stone-700 font-bold bg-red-50 border border-red-200 p-3 rounded-xl max-h-36 overflow-y-auto w-full">
                  {modelError}
                </p>
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => window.location.reload()}
                    className="bg-emerald-500 hover:bg-emerald-400 text-white border-2 border-black font-black text-xs py-2 px-4 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    Thử lại
                  </button>
                  <button 
                    onClick={() => setUseSimulatedAI(true)}
                    className="bg-amber-400 hover:bg-amber-300 text-black border-2 border-black font-black text-xs py-2 px-4 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer"
                  >
                    Chạy chế độ mô phỏng
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 text-center max-w-sm sm:max-w-xl px-6 leading-normal uppercase tracking-wider">
                  {modelLoadingProgress}
                </p>
                <p className="text-xs text-stone-500 max-w-xs text-center font-bold px-4">
                  Hệ thống đang tải mô hình xử lý hình ảnh AI (~17MB) về trình duyệt của bạn để phân tích ngoại tuyến hoàn toàn miễn phí!
                </p>
                <button 
                  onClick={() => setUseSimulatedAI(true)}
                  className="mt-2 bg-amber-400 hover:bg-amber-300 text-black border-2 border-black font-black text-xs py-2.5 px-5 rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 transition-all cursor-pointer uppercase"
                >
                  Bỏ qua & Chạy mô phỏng (Không cần AI)
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Sleek top banner showing educational credentials */}
        <div className="flex flex-wrap items-center justify-between border-b-4 border-black pb-3 gap-2 flex-shrink-0 bg-white/70 p-3 rounded-2xl border-2 border-dashed">
          <div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
              <span>🎒</span> MÁY PHÂN LOẠI RÁC THÔNG MINH
            </h1>
            <p className="text-xs font-black text-emerald-700 tracking-wide mt-0.5">
              Đưa rác trước camera và nhấn "Chụp & Phân Tích" để hệ thống tự động phân loại nhé! 💚
            </p>
          </div>

          {/* Points Metrics for Children Gamification */}
          <div className="flex items-center gap-2" id="header-leaderboard-gamify">
            <div className="bg-yellow-100 border-2 border-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-base">⭐</span>
              <span className="font-extrabold text-xs text-amber-950 uppercase">Điểm: {points}</span>
            </div>
            <div className="bg-orange-100 border-2 border-black px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-base">🔥</span>
              <span className="font-extrabold text-xs text-orange-950 uppercase">Chuỗi: {streak}</span>
            </div>
            <button 
              onClick={clearEverything}
              className="bg-stone-100 hover:bg-stone-50 text-stone-800 border-2 border-black px-3 py-1.5 rounded-xl text-xs font-extrabold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-102 active:translate-y-0.5 transition-all uppercase cursor-pointer"
              title="Đặt lại điểm số"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Master horizontal grid for landscape screen view */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch flex-grow min-h-0 overflow-y-auto md:overflow-hidden" id="app-horizontal-master-grid">
          
          {/* COLUMN LEFT (5/12): CAMERA VIEWPORT & SAMPLE TEACHING INFRA */}
          <div className="md:col-span-12 lg:col-span-5 flex flex-col gap-4 h-full justify-center overflow-y-auto px-2 scrollbar-thin md:col-span-5" id="left-camera-panel">
            
            {/* Input Navigation Tabs row for classroom flexibility */}
            <div className="flex items-center justify-start border-b-2 border-emerald-100 pb-2 gap-2 flex-shrink-0 bg-white/50 p-1.5 rounded-2xl border-2 border-black/10">
              <button 
                onClick={() => { setActiveTab("webcam"); setCapturedImage(null); setClassification(null); }}
                className={`px-4 py-2 text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.03] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "webcam" ? "bg-emerald-400 text-black font-extrabold" : "bg-white text-stone-600 hover:bg-stone-50"
                }`}
                id="tab-select-camera"
              >
                📷 Webcam
              </button>
              <button 
                onClick={() => { setActiveTab("presets"); setCapturedImage(null); setClassification(null); }}
                className={`px-4 py-2 text-xs font-black rounded-full border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.03] active:translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === "presets" ? "bg-emerald-400 text-black font-extrabold" : "bg-white text-stone-600 hover:bg-stone-50"
                }`}
                id="tab-select-presets"
              >
                🍎 Vật mẫu
              </button>
            </div>

            {/* ========================================================= */}
            {/* Camera block: Perfect square aspect ratio format          */}
            {/* ========================================================= */}
            <div 
              className="w-full border-4 border-black bg-stone-900 rounded-2xl relative overflow-hidden flex flex-col justify-center items-center flex-grow min-h-0 aspect-square md:max-h-[360px]"
              id="camera-viewport-frame"
            >
              {/* Active webcam view state */}
              {activeTab === "webcam" && (
                <>
                  {!capturedImage ? (
                    <>
                      <video 
                        ref={videoRef} 
                        className="w-full h-full object-cover -scale-x-100"
                        playsInline
                        muted
                      />
                      
                      {/* Glimpse live red dot */}
                      <div className="absolute top-3 left-3 bg-red-600 text-white border-2 border-black px-2 py-0.5 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] animate-pulse">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                        LIVE CAM
                      </div>

                      {cameraError && (
                        <div className="absolute inset-0 bg-stone-950/95 text-white flex flex-col items-center justify-center p-3 text-center gap-1.5">
                          <AlertCircle className="w-8 h-8 text-red-500" />
                          <p className="text-[10px] font-bold max-w-xs">{cameraError}</p>
                          <button 
                            onClick={startCamera}
                            className="bg-emerald-400 text-black border-2 border-black font-extrabold text-[9px] py-1 px-2.5 rounded-lg shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 cursor-pointer"
                          >
                            Thử lại Cam
                          </button>
                        </div>
                      )}

                      {cameraActive && (
                        <div className="absolute bottom-3 left-3 flex items-center">
                          <button
                            onClick={captureAndClassify}
                            className="bg-rose-500 hover:bg-rose-400 text-white border-2 border-black font-black text-[10px] px-3.5 py-1.5 rounded-xl flex items-center gap-1 shadow-[1.5px_1.5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transform cursor-pointer tracking-wider uppercase"
                            id="btn-camera-snap"
                          >
                            <Camera className="w-3.5 h-3.5" /> Chụp ảnh
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center relative bg-stone-800">
                      <img src={capturedImage} alt="Captured preview" className="h-full w-full object-cover -scale-x-100" />
                      <button 
                        onClick={resetCameraOnly}
                        className="absolute top-2.5 right-2.5 bg-white text-black border-2 border-black p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 cursor-pointer"
                        title="Chụp ảnh mới"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Presets tab */}
              {activeTab === "presets" && (
                <div className="w-full h-full bg-stone-50 flex flex-col items-center justify-start p-2.5 text-center overflow-y-auto">
                  {!capturedImage ? (
                    <div className="w-full bg-white/40 p-2.5 border-2 border-dashed border-stone-200 rounded-xl flex flex-col gap-2.5">
                      <p className="text-[10px] font-black text-stone-500 uppercase tracking-wider">
                        Chọn một rác học tập mẫu dưới đây:
                      </p>

                      {/* Hữu Cơ */}
                      <div className="text-left bg-emerald-50/40 p-1.5 rounded-xl border border-black/5">
                        <p className="text-[9px] font-black text-emerald-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span>☘️</span> RÁC HỮU CƠ (DỄ PHÂN HỦY)
                        </p>
                        <div className="grid grid-cols-3 gap-1 px-0.5">
                          <button 
                            onClick={() => selectPreset("organic_apple")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-emerald-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🍎</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Khúc táo</span>
                          </button>
                          <button 
                            onClick={() => selectPreset("organic_banana")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-emerald-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🍌</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Vỏ chuối</span>
                          </button>
                          <button 
                            onClick={() => selectPreset("organic_bread")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-emerald-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🍞</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Bánh mì mốc</span>
                          </button>
                        </div>
                      </div>

                      {/* Tái Chế */}
                      <div className="text-left bg-cyan-50/40 p-1.5 rounded-xl border border-black/5">
                        <p className="text-[9px] font-black text-cyan-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span>♻️</span> RÁC TÁI CHẾ (TÁI SẢN XUẤT)
                        </p>
                        <div className="grid grid-cols-3 gap-1 px-0.5">
                          <button 
                            onClick={() => selectPreset("recycle_bottle")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-cyan-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🧴</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Chai nhựa</span>
                          </button>
                          <button 
                            onClick={() => selectPreset("recycle_can")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-cyan-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🥤</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Lon coca</span>
                          </button>
                          <button 
                            onClick={() => selectPreset("recycle_paper")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-cyan-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">📦</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Hộp giấy</span>
                          </button>
                        </div>
                      </div>

                      {/* Vô Cơ */}
                      <div className="text-left bg-purple-50/40 p-1.5 rounded-xl border border-black/5">
                        <p className="text-[9px] font-black text-purple-800 uppercase tracking-wider mb-1 flex items-center gap-1">
                          <span>🗑️</span> RÁC VÔ CƠ (CHÔN LẤP/XỬ LÝ)
                        </p>
                        <div className="grid grid-cols-3 gap-1 px-0.5">
                          <button 
                            onClick={() => selectPreset("inorganic_styrofoam")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-purple-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🍱</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Mảnh xốp</span>
                          </button>
                          <button 
                            onClick={() => selectPreset("inorganic_plastic_bag")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-purple-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🛍️</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Túi nilon</span>
                          </button>
                          <button 
                            onClick={() => selectPreset("inorganic_ceramic")} 
                            className="p-1 bg-white border border-black rounded-lg hover:bg-purple-50 active:translate-y-0.5 transition-all text-center flex flex-col items-center gap-0.5 shadow-sm cursor-pointer"
                          >
                            <span className="text-base">🥣</span>
                            <span className="text-[8px] font-black text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis w-full">Chén vỡ</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center relative bg-stone-800 p-2">
                      <img src={capturedImage} alt="Preset select preview" className="h-full w-full object-cover rounded-lg" />
                      <button 
                        onClick={resetCameraOnly}
                        className="absolute top-2.5 right-2.5 bg-white text-black border-2 border-black p-1.5 rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 cursor-pointer"
                        title="Chọn vật mẫu khác"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Fast alert badge */}
              {classification && (
                <div className="absolute top-2.5 right-2.5 bg-emerald-100 text-emerald-800 border-2 border-black py-0.5 px-2 rounded-lg text-[9px] font-bold shadow-sm">
                  ✓ XONG
                </div>
              )}
            </div>

            {/* Functional snap buttons / triggers row */}
            <div className="flex flex-col gap-3 mt-1 flex-shrink-0" id="core-interactive-triggers">
              {capturedImage ? (
                classification ? (
                  // Case 3: analyzed successfully, let the user scan another
                  <button
                    onClick={resetCameraOnly}
                    className="w-full border-4 border-black text-black font-black text-sm tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-yellow-300 hover:scale-[1.02] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer bg-yellow-400 uppercase h-14 md:h-16"
                    id="btn-trigger-reset-stage1"
                  >
                    <RefreshCw className="w-5 h-5 text-stone-800" />
                    Chụp Tiếp / Quay Lại
                  </button>
                ) : (
                  // Case 2: image is loaded (via preset or upload) but not analyzed yet
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={resetCameraOnly}
                      className="border-3 border-black text-stone-800 font-black text-xs tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-50 hover:scale-[1.02] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer h-14 md:h-16 uppercase text-center"
                      id="btn-choose-other-stage1"
                    >
                      <RefreshCw className="w-4 h-4 text-emerald-600" />
                      Chọn Lại
                    </button>
                    <button
                      onClick={captureAndClassify}
                      disabled={isAnalyzing}
                      className="border-3 border-black text-white font-black text-xs tracking-wider py-4 rounded-2xl flex items-center justify-center gap-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.02] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 uppercase h-14 md:h-16"
                      id="btn-trigger-ai-presets-stage1"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-100" />
                      Phân Tích Ảnh
                    </button>
                  </div>
                )
              ) : (
                // Case 1: Live webcam is running, snapshot ready
                <button
                  onClick={captureAndClassify}
                  disabled={isAnalyzing}
                  className="w-full border-4 border-black text-white font-black text-sm tracking-wider py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:scale-[1.03] hover:shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer bg-rose-500 hover:bg-rose-400 uppercase h-14 md:h-16"
                  id="btn-trigger-ai-start-stage1"
                >
                  <Camera className="w-5 h-5 animate-pulse" />
                  CHỤP & PHÂN TÍCH
                </button>
              )}
            </div>

            {analysisError && (
              <div className="bg-red-50 border-3 border-red-500 rounded-2xl p-3 flex items-start gap-2 shadow-sm text-xs text-red-950 font-bold border-dashed">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{analysisError}</span>
              </div>
            )}

            {/* Short gamified activity history of last 5 items */}
            {history.length > 0 && (
              <div className="bg-white/60 border-2 border-black border-dashed p-3 rounded-2xl flex flex-col gap-1.5">
                <p className="text-[10px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1">
                  <span>🏆</span> Lịch sử phân loại gần đây:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {history.map((item) => (
                    <span 
                      key={item.id} 
                      className={`text-[9px] font-extrabold px-2 py-1 border border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${
                        item.bin_type === "vô cơ" 
                          ? "bg-red-100 text-red-950" 
                          : item.bin_type === "tái chế"
                            ? "bg-yellow-100 text-yellow-950"
                            : "bg-emerald-100 text-emerald-950"
                      }`}
                    >
                      {item.bin_type.toUpperCase()} ({item.timestamp})
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>


          {/* COLUMN RIGHT (7/12): 3 GARBAGE BINS DISPLAY & RESULTS EXPLANATION CARD & ACTION BUTTONS */}
          <div className="md:col-span-12 lg:col-span-7 md:lg:col-span-7 flex flex-col gap-3 text-center h-full justify-between overflow-y-auto px-2 scrollbar-thin md:col-span-7" id="right-trash-panel">
            
            {/* Trash Bins Container */}
            <div className="flex flex-col justify-center bg-emerald-50/50 border-4 border-black rounded-[32px] p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex-grow h-full py-8 md:py-16" id="bins-side-by-side-layout">
              <p className="text-center text-xs md:text-sm font-black text-emerald-800/80 bg-white/80 border-2 border-black py-2 px-4 rounded-full w-fit mx-auto shadow-sm uppercase tracking-wider mb-8 md:mb-12">
                Thùng Rác Học Tập (Nắp thùng tự động mở khi AI tìm đúng nhóm!)
              </p>

              <div className="grid grid-cols-3 gap-2 md:gap-6 justify-center items-end" id="bins-horizontal-view">
                
                {/* VÔ CƠ BIN (Red) */}
                <div className="relative flex flex-col items-center w-full">
                  {classification?.bin_type === "vô cơ" && !isAnalyzing && (
                    <div className="absolute bottom-[108%] left-1/2 -translate-x-1/2 w-48 md:w-64 bg-amber-50 border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[10px] md:text-xs font-black text-slate-950 z-30 animate-bounce leading-relaxed text-center">
                      <p>{classification.explanation}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-black mt-[-1.5px]" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-amber-50 mt-[-3px]" />
                    </div>
                  )}
                  <TrashBinSvg 
                    type="vô cơ"
                    isOpen={classification?.bin_type === "vô cơ"}
                    isHighlighted={classification?.bin_type === "vô cơ"}
                  />
                </div>

                {/* TÁI CHẾ BIN (Yellow) */}
                <div className="relative flex flex-col items-center w-full">
                  {classification?.bin_type === "tái chế" && !isAnalyzing && (
                    <div className="absolute bottom-[108%] left-1/2 -translate-x-1/2 w-48 md:w-64 bg-amber-50 border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[10px] md:text-xs font-black text-slate-950 z-30 animate-bounce leading-relaxed text-center">
                      <p>{classification.explanation}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-black mt-[-1.5px]" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-amber-50 mt-[-3px]" />
                    </div>
                  )}
                  
                  {/* Floating analyzing Speech Bubble on top of the middle garbage bin during processing */}
                  {isAnalyzing && (
                    <div className="absolute bottom-[108%] left-1/2 -translate-x-1/2 w-48 md:w-64 bg-amber-400 border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[10px] md:text-xs font-black text-black z-30 animate-pulse leading-relaxed text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        <span>AI đang phân tích & Mở nắp tự động...</span>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-black mt-[-1.5px]" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-amber-400 mt-[-3px]" />
                    </div>
                  )}

                  <TrashBinSvg 
                    type="tái chế"
                    isOpen={classification?.bin_type === "tái chế"}
                    isHighlighted={classification?.bin_type === "tái chế"}
                  />
                </div>

                {/* HỮU CƠ BIN (Green) */}
                <div className="relative flex flex-col items-center w-full">
                  {classification?.bin_type === "hữu cơ" && !isAnalyzing && (
                    <div className="absolute bottom-[108%] left-1/2 -translate-x-1/2 w-48 md:w-64 bg-amber-50 border-3 border-black p-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-[10px] md:text-xs font-black text-slate-950 z-30 animate-bounce leading-relaxed text-center">
                      <p>{classification.explanation}</p>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-black mt-[-1.5px]" />
                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-[8px] border-transparent border-t-amber-50 mt-[-3px]" />
                    </div>
                  )}
                  <TrashBinSvg 
                    type="hữu cơ"
                    isOpen={classification?.bin_type === "hữu cơ"}
                    isHighlighted={classification?.bin_type === "hữu cơ"}
                  />
                </div>

              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
