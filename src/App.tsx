import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import { useAppStore } from './store/useAppStore';
import { ffmpegProcessor } from './utils/ffmpeg';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Processing from './pages/Processing';
import Download from './pages/Download';
import History from './pages/History';
import Transcription from './pages/Transcription';
import { toast } from 'sonner';

function App() {
  const { currentPage, ffmpegLoaded, setFFmpegLoaded } = useAppStore();

  // 在应用启动时预加载FFmpeg
  useEffect(() => {
    const preloadFFmpeg = async () => {
      if (ffmpegLoaded) {
        console.log('FFmpeg已经加载，跳过预加载');
        return;
      }

      console.log('开始预加载FFmpeg音频处理引擎...');
      
      try {
        // 静默加载，不显示toast提示
        await ffmpegProcessor.load((progress) => {
          // console.log('FFmpeg预加载进度:', progress + '%');
        });
        
        if (ffmpegProcessor.isLoaded()) {
          setFFmpegLoaded(true);
          console.log('FFmpeg预加载完成');
          // 可选：显示一个不显眼的成功提示
          toast.success('音频处理引擎已就绪', {
            duration: 2000,
            style: {
              background: '#f0f9ff',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            },
          });
        }
      } catch (error) {
        console.warn('FFmpeg预加载失败，将在需要时重新加载:', error);
        // 预加载失败时不显示错误提示，因为用户可能还没有使用音频处理功能
        setFFmpegLoaded(false);
      }
    };

    // 延迟一小段时间再开始预加载，避免影响应用初始渲染
    const timer = setTimeout(preloadFFmpeg, 1000);
    
    return () => clearTimeout(timer);
  }, [ffmpegLoaded, setFFmpegLoaded]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'upload':
        return <Upload />;
      case 'processing':
        return <Processing />;
      case 'download':
        return <Download />;
      case 'transcription':
        return <Transcription />;
      case 'history':
        return <History />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <main className="flex-1 overflow-y-auto">
        {renderCurrentPage()}
      </main>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'white',
            color: '#374151',
            border: '1px solid #e5e7eb',
          },
        }}
      />
    </div>
  );
}

export default App;
