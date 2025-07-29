import React, { useState, useRef } from 'react';
import { Download as DownloadIcon, Play, Pause, Volume2, RotateCcw, Settings, CheckCircle, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { downloadFile, formatFileSize, generateUniqueFilename } from '../utils/fileUtils';
import { ffmpegProcessor } from '../utils/ffmpeg';
import { toast } from 'sonner';

const Download: React.FC = () => {
  const { files, setCurrentPage, updateFileInfo, clearFiles, setTranscriptionAudioFile } = useAppStore();
  const [selectedFormat, setSelectedFormat] = useState<'mp3' | 'wav' | 'aac'>('mp3');
  const [selectedQuality, setSelectedQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState<Record<string, boolean>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  const completedFiles = files.filter(file => file.status === 'completed');

  const handlePlayPause = (fileId: string, audioUrl: string) => {
    const audio = audioRefs.current[fileId];
    
    if (!audio) {
      const newAudio = new Audio(audioUrl);
      audioRefs.current[fileId] = newAudio;
      
      newAudio.addEventListener('ended', () => {
        setPlayingAudio(null);
      });
      
      newAudio.play();
      setPlayingAudio(fileId);
    } else {
      if (playingAudio === fileId) {
        audio.pause();
        setPlayingAudio(null);
      } else {
        // 停止其他音频
        Object.values(audioRefs.current).forEach(a => a.pause());
        audio.currentTime = 0;
        audio.play();
        setPlayingAudio(fileId);
      }
    }
  };

  const handleDownload = async (file: any) => {
    if (!file.audioUrl) {
      toast.error('音频文件不可用');
      return;
    }

    try {
      // 如果当前格式和质量与文件匹配，直接下载
      if (file.audioFormat === selectedFormat && file.audioQuality === selectedQuality) {
        const response = await fetch(file.audioUrl);
        const blob = await response.blob();
        const filename = generateUniqueFilename(file.name, selectedFormat);
        downloadFile(blob, filename);
        toast.success('下载开始');
        return;
      }

      // 需要重新转换格式或质量
      setIsConverting(prev => ({ ...prev, [file.id]: true }));
      toast.info('正在转换音频格式...');

      const audioBlob = await ffmpegProcessor.extractAudio(
        file.file,
        selectedFormat,
        selectedQuality
      );

      const filename = generateUniqueFilename(file.name, selectedFormat);
      downloadFile(audioBlob, filename);
      
      // 更新文件信息
      const newAudioUrl = URL.createObjectURL(audioBlob);
      updateFileInfo(file.id, {
        audioUrl: newAudioUrl,
        audioFormat: selectedFormat,
        audioQuality: selectedQuality
      });

      toast.success('下载开始');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('下载失败，请重试');
    } finally {
      setIsConverting(prev => ({ ...prev, [file.id]: false }));
    }
  };

  const handleDownloadAll = async () => {
    if (completedFiles.length === 0) {
      toast.error('没有可下载的文件');
      return;
    }

    toast.info('开始批量下载...');
    
    for (const file of completedFiles) {
      try {
        await handleDownload(file);
        // 添加延迟避免浏览器阻止多个下载
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Batch download failed for file:', file.name, error);
      }
    }
  };

  const handleStartNew = () => {
    // 清理音频引用
    Object.values(audioRefs.current).forEach(audio => {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    });
    audioRefs.current = {};
    setPlayingAudio(null);
    
    clearFiles();
    setCurrentPage('upload');
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'high': return '高质量';
      case 'medium': return '中等质量';
      case 'low': return '低质量';
      default: return quality;
    }
  };

  const getFormatInfo = (format: string) => {
    switch (format) {
      case 'mp3': return { name: 'MP3', desc: '通用格式，兼容性好' };
      case 'wav': return { name: 'WAV', desc: '无损格式，文件较大' };
      case 'aac': return { name: 'AAC', desc: '高效压缩，质量好' };
      default: return { name: format.toUpperCase(), desc: '' };
    }
  };

  if (completedFiles.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <DownloadIcon className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">没有可下载的文件</h2>
          <p className="text-gray-600 mb-6">请先上传并处理视频文件</p>
          <button
            onClick={() => setCurrentPage('upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            上传视频文件
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="w-12 h-12 text-green-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">处理完成</h1>
          </div>
          <p className="text-lg text-gray-600">
            成功处理了 {completedFiles.length} 个文件，现在可以下载音频了
          </p>
        </div>

        {/* Download Options */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Settings className="w-6 h-6 mr-2" />
              下载设置
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleStartNew}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                处理新文件
              </button>
              <button
                onClick={handleDownloadAll}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
              >
                <DownloadIcon className="w-5 h-5 mr-2" />
                批量下载全部
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                音频格式
              </label>
              <div className="space-y-2">
                {(['mp3', 'wav', 'aac'] as const).map((format) => {
                  const info = getFormatInfo(format);
                  return (
                    <label key={format} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="format"
                        value={format}
                        checked={selectedFormat === format}
                        onChange={(e) => setSelectedFormat(e.target.value as any)}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{info.name}</div>
                        <div className="text-sm text-gray-600">{info.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            
            {/* Quality Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                音频质量
              </label>
              <div className="space-y-2">
                {(['high', 'medium', 'low'] as const).map((quality) => (
                  <label key={quality} className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="quality"
                      value={quality}
                      checked={selectedQuality === quality}
                      onChange={(e) => setSelectedQuality(e.target.value as any)}
                      className="mr-3"
                    />
                    <div className="font-medium text-gray-900">
                      {getQualityLabel(quality)}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* File List */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">音频文件</h2>
          
          <div className="space-y-4">
            {completedFiles.map((file) => (
              <div key={file.id} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {file.name}
                    </h3>
                    <div className="flex items-center text-sm text-gray-600 space-x-4">
                      <span>原文件: {formatFileSize(file.size)}</span>
                      <span>格式: {file.audioFormat?.toUpperCase()}</span>
                      <span>质量: {getQualityLabel(file.audioQuality || 'medium')}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Play/Pause Button */}
                    {file.audioUrl && (
                      <button
                        onClick={() => handlePlayPause(file.id, file.audioUrl!)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-3 rounded-full transition-colors"
                        title={playingAudio === file.id ? '暂停' : '播放'}
                      >
                        {playingAudio === file.id ? (
                          <Pause className="w-5 h-5" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                      </button>
                    )}
                    
                    {/* Transcription Button */}
                    <button
                      onClick={() => {
                        if (file.audioUrl) {
                          // 从audioUrl创建File对象
                          fetch(file.audioUrl)
                            .then(response => response.blob())
                            .then(blob => {
                              const audioFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.' + (file.audioFormat || 'mp3'), {
                                type: `audio/${file.audioFormat || 'mp3'}`
                              });
                              setTranscriptionAudioFile({
                                file: audioFile,
                                url: file.audioUrl!,
                                name: file.name
                              });
                              setCurrentPage('transcription');
                            })
                            .catch(error => {
                              console.error('Failed to create audio file:', error);
                              toast.error('无法加载音频文件');
                            });
                        } else {
                          toast.error('音频文件不可用');
                        }
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-colors flex items-center"
                      title="转录为文本"
                    >
                      <FileText className="w-5 h-5 mr-2" />
                      转录
                    </button>
                    
                    {/* Download Button */}
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={isConverting[file.id]}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center"
                    >
                      {isConverting[file.id] ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          转换中...
                        </>
                      ) : (
                        <>
                          <DownloadIcon className="w-5 h-5 mr-2" />
                          下载
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Audio Player */}
                {file.audioUrl && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center space-x-4">
                      <Volume2 className="w-5 h-5 text-gray-600" />
                      <div className="flex-1">
                        <audio
                          ref={(el) => {
                            if (el) audioRefs.current[file.id] = el;
                          }}
                          controls
                          className="w-full"
                          preload="metadata"
                        >
                          <source src={file.audioUrl} type={`audio/${file.audioFormat}`} />
                          您的浏览器不支持音频播放
                        </audio>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
};

export default Download;