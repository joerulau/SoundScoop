import React from 'react';
import { Upload, Play, Download, History, FileVideo, Music, Zap, CheckCircle, Loader2, FileText, Mic } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const Home: React.FC = () => {
  const { setCurrentPage, ffmpegLoaded } = useAppStore();

  const features = [
    {
      icon: <FileVideo className="w-8 h-8" />,
      title: '视频音频提取',
      description: '基于 FFmpeg 从视频中提取高质量音频文件'
    },
    {
      icon: <Music className="w-8 h-8" />,
      title: '多格式输出',
      description: '支持 MP3、WAV、AAC 等音频格式，可调节质量'
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: '语音转录',
      description: '采用先进技术，精准识别语音内容并生成文字稿'
    },
    {
      icon: <History className="w-8 h-8" />,
      title: '历史记录',
      description: '自动保存处理记录，支持重新下载和管理'
    }
  ];

  const supportedFormats = [
    'MP4', 'AVI', 'MOV', 'MKV', 'WMV', 'FLV', 'WebM', 'OGG'
  ];

  const handleStartUpload = () => {
    setCurrentPage('upload');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Sound<span className="text-blue-300">Scoop</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              专业的视频音频提取工具，快速从视频中提取高质量音频，支持音频转文本功能
            </p>
            
            {/* FFmpeg Status Indicator */}
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2">
                {ffmpegLoaded ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-medium">音频处理引擎已就绪</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-5 h-5 text-blue-300 animate-spin" />
                    <span className="text-blue-300 font-medium">音频处理引擎准备中...</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Quick Upload Area */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl mx-auto mb-12 border border-white/20">
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-200 transition-colors cursor-pointer"
                   onClick={handleStartUpload}>
                <Upload className="w-16 h-16 text-blue-300 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-white mb-2">开始提取音频</h3>
                <p className="text-blue-100 mb-4">拖拽视频文件到这里，或点击选择文件</p>
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                  onClick={handleStartUpload}
                >
                  选择视频文件
                </button>
              </div>
            </div>

            {/* Process Steps */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">1. 上传视频</h4>
                <p className="text-blue-100 text-sm">选择或拖拽视频文件</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Play className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">2. 自动处理</h4>
                <p className="text-blue-100 text-sm">智能提取音频</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">3. 选择输出</h4>
                <p className="text-blue-100 text-sm">选择音频格式或转录文本</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">4. 转录文本</h4>
                <p className="text-blue-100 text-sm">智能语音识别转文字</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-white" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">5. 下载结果</h4>
                <p className="text-blue-100 text-sm">获取音频文件或文本</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-white py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">强大功能特性</h2>
            <p className="text-xl text-gray-600">专业级的音频提取工具，满足各种需求</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-6 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="text-blue-600 mb-4 flex justify-center">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Supported Formats */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">支持的视频格式</h3>
          <div className="flex flex-wrap justify-center gap-4">
            {supportedFormats.map((format, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full font-medium">
                {format}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-900 py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-white mb-4">准备好开始了吗？</h3>
          <p className="text-xl text-blue-100 mb-8">立即上传您的视频文件，体验专业的音频提取服务</p>
          <div className="space-x-4">
            <button 
              onClick={handleStartUpload}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors mr-4 shadow-lg hover:shadow-xl"
            >
              开始提取音频
            </button>
            <button 
              onClick={() => setCurrentPage('transcription')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors mr-4 shadow-lg hover:shadow-xl"
            >
              <Mic className="w-5 h-5 inline mr-2" />
              音频转文本
            </button>
            <button 
              onClick={() => setCurrentPage('history')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              查看历史记录
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;