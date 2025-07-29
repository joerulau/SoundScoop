import React, { useEffect, useState, useRef } from 'react';
import { Play, Pause, RotateCcw, CheckCircle, AlertCircle, Loader2, Music } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { ffmpegProcessor } from '../utils/ffmpeg';
import { formatFileSize, generateUniqueFilename } from '../utils/fileUtils';
import { toast } from 'sonner';

const Processing: React.FC = () => {
  const { 
    files, 
    updateFileProgress, 
    updateFileStatus, 
    updateFileInfo, 
    setCurrentPage, 
    ffmpegLoaded, 
    setFFmpegLoaded,
    addToHistory 
  } = useAppStore();
  
  const { getState } = useAppStore;
  
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);

  // 使用ref来跟踪处理状态，避免因状态更新导致重复触发
  const hasStartedProcessingRef = useRef(false);
  const filesHashRef = useRef('');

  // 生成文件列表的哈希值，用于检测文件列表是否真正发生变化
  // 只基于文件ID和数量，不包含状态，避免状态变化导致重复处理
  const generateFilesHash = (fileList: typeof files) => {
    return fileList.map(f => f.id).sort().join('|');
  };

  useEffect(() => {
    const currentFilesHash = generateFilesHash(files);
    
    // 只有当文件列表真正发生变化时才重置处理状态
    if (filesHashRef.current !== currentFilesHash) {
      filesHashRef.current = currentFilesHash;
      // 文件列表发生变化，重置处理状态
      hasStartedProcessingRef.current = false;
    }
    
    if (ffmpegLoaded && !isProcessing && files.length > 0 && !hasStartedProcessingRef.current) {
      // 检查是否有待处理的文件
      const hasPendingFiles = files.some(file => file.status === 'pending');
      if (hasPendingFiles) {
        console.log('检测到待处理文件，准备开始处理...');
        hasStartedProcessingRef.current = true;
        // 直接调用，不使用setTimeout避免重复触发
        startProcessing();
      }
    }
  }, [ffmpegLoaded, isProcessing]);

  // 移除了initializeFFmpeg函数，避免重复加载
  // FFmpeg的加载现在完全由App.tsx中的预加载逻辑处理

  const startProcessing = async () => {
    if (isProcessing || files.length === 0) {
      console.log('跳过处理:', { isProcessing, filesLength: files.length });
      return;
    }
    
    // 检查是否有待处理的文件
    const pendingFiles = files.filter(file => file.status === 'pending');
    if (pendingFiles.length === 0) {
      console.log('没有待处理的文件，跳过处理');
      return;
    }
    
    console.log(`准备处理 ${pendingFiles.length} 个待处理文件`);
    
    // 检查FFmpeg是否已加载（由App.tsx预加载）
    if (!ffmpegLoaded || !ffmpegProcessor.isLoaded()) {
      console.log('FFmpeg未就绪，请等待加载完成或刷新页面');
      toast.error('音频处理引擎未就绪，请稍等片刻或刷新页面重试');
      return;
    }
    
    console.log('开始处理文件...');
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    
    // 用于收集成功处理的文件信息，统一添加到历史记录
    const processedFiles: Array<{
      id: string;
      originalFileName: string;
      audioFileName: string;
      audioUrl: string;
      audioBlob: Blob;
      audioFormat: string;
      audioQuality: string;
      fileSize: number;
      duration: number;
      processedAt: Date;
    }> = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // 跳过已处理或正在处理的文件
      if (file.status !== 'pending') {
        console.log(`跳过文件 ${file.name}，状态: ${file.status}`);
        continue;
      }
      
      // 再次检查当前文件状态（防止并发处理）
      const currentFileState = files.find(f => f.id === file.id);
      if (!currentFileState || currentFileState.status !== 'pending') {
        console.log(`文件状态已变更，跳过处理: ${file.name}，当前状态: ${currentFileState?.status}`);
        continue;
      }
      
      console.log(`开始处理文件 ${i + 1}/${files.length}: ${file.name}`);
      setCurrentProcessingIndex(i);
      
      try {
        // 更新状态为处理中
        updateFileStatus(file.id, 'processing');
        updateFileProgress(file.id, 0, 'processing');
        
        // 再次检查FFmpeg是否仍然加载
        if (!ffmpegProcessor.isLoaded()) {
          console.error('FFmpeg在处理过程中失效');
          throw new Error('音频处理引擎异常，请重新加载页面');
        }
        
        console.log(`开始提取音频: ${file.name}`);
        
        // 提取音频
        const audioBlob = await ffmpegProcessor.extractAudio(
          file.file,
          'mp3', // 默认格式
          'high', // 默认质量
          (progress) => {
            // console.log(`文件 ${file.name} 处理进度: ${progress}%`);
            updateFileProgress(file.id, progress, 'processing');
          }
        );
        
        console.log(`音频提取成功: ${file.name}, Blob大小: ${audioBlob.size}`);
        
        // 创建音频 URL
        const audioUrl = URL.createObjectURL(audioBlob);
        const audioFileName = generateUniqueFilename(file.name, 'mp3');
        
        // 更新文件信息
        updateFileInfo(file.id, {
          audioUrl,
          audioBlob, // 保存blob对象以便后续使用
          audioFormat: 'mp3',
          audioQuality: 'high',
          status: 'completed'
        });
        
        // 收集成功处理的文件信息，稍后统一添加到历史记录
        processedFiles.push({
          id: Math.random().toString(36).substr(2, 9),
          originalFileName: file.name,
          audioFileName,
          audioUrl,
          audioBlob, // 保存blob对象
          audioFormat: 'mp3',
          audioQuality: 'high',
          fileSize: audioBlob.size,
          duration: file.duration || 0,
          processedAt: new Date()
        });
        
        console.log(`文件处理完成: ${file.name}`);
        // 不在这里显示单个文件完成的toast，避免多个提示
      } catch (error) {
        console.error(`文件处理失败: ${file.name}`, {
          error,
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          fileName: file.name,
          fileSize: file.file.size,
          fileType: file.file.type
        });
        
        updateFileStatus(file.id, 'error');
        const errorMessage = error instanceof Error ? error.message : '处理失败';
        updateFileInfo(file.id, {
          error: errorMessage
        });
        toast.error(`"${file.name}" 处理失败: ${errorMessage}`);
      }
    }
    
    setIsProcessing(false);
    hasStartedProcessingRef.current = false; // 重置处理标志，允许下次处理
    console.log('所有文件处理完成');
    
    // 统一添加所有成功处理的文件到历史记录
    if (processedFiles.length > 0) {
      console.log(`统一添加 ${processedFiles.length} 个文件到历史记录`);
      processedFiles.forEach(fileInfo => {
        addToHistory({
          ...fileInfo,
          hasTranscription: false,
          operationType: 'audio_extraction' as const
        });
      });
    }
    
    // 重新获取最新的文件状态
    const currentFiles = getState().files;
    const completedFiles = currentFiles.filter(f => f.status === 'completed');
    const errorFiles = currentFiles.filter(f => f.status === 'error');
    
    console.log('处理完成状态检查:', {
      totalFiles: currentFiles.length,
      completedFiles: completedFiles.length,
      errorFiles: errorFiles.length,
      fileStatuses: currentFiles.map(f => ({ name: f.name, status: f.status })),
      addedToHistory: processedFiles.length
    });
    
    if (completedFiles.length > 0) {
      console.log(`${completedFiles.length} 个文件处理成功，跳转到下载页面`);
      
      // 显示处理结果总结
      if (errorFiles.length > 0) {
        toast.success(`处理完成！${completedFiles.length} 个文件成功，${errorFiles.length} 个文件失败`);
      } else {
        toast.success(`所有文件处理完成！共 ${completedFiles.length} 个文件`);
      }
      
      setTimeout(() => {
        setCurrentPage('download');
      }, 1000);
    } else {
      console.log('没有文件处理成功');
      toast.error('没有文件处理成功，请检查文件格式或重试');
    }
  };

  const retryProcessing = async () => {
    console.log('重试处理...');
    
    // 检查FFmpeg状态
    if (!ffmpegLoaded || !ffmpegProcessor.isLoaded()) {
      toast.error('音频处理引擎未就绪，请刷新页面重试');
      return;
    }
    
    // 重置失败的文件状态
    files.forEach(file => {
      if (file.status === 'error') {
        console.log(`重置文件状态: ${file.name}`);
        updateFileStatus(file.id, 'pending');
        updateFileProgress(file.id, 0, 'processing');
        updateFileInfo(file.id, { error: undefined });
      }
    });
    
    // 重置处理状态
    setCurrentProcessingIndex(0);
    setIsProcessing(false);
    hasStartedProcessingRef.current = false; // 重置ref标志
    
    // 开始处理
    setTimeout(() => {
      startProcessing();
    }, 500);
  };

  const getOverallProgress = () => {
    if (files.length === 0) return 0;
    
    // 计算总体进度：基于已完成文件数量
    const completedFiles = files.filter(f => f.status === 'completed').length;
    const processingFiles = files.filter(f => f.status === 'processing');
    
    // 基础进度：已完成文件的进度
    let baseProgress = (completedFiles / files.length) * 100;
    
    // 如果有正在处理的文件，添加当前处理文件的部分进度
    if (processingFiles.length > 0 && processingFiles[0]) {
      const currentProcessingProgress = processingFiles[0].processingProgress || 0;
      const currentFileWeight = (1 / files.length) * 100;
      // 只有当单个文件进度大于0时才计算贡献
      if (currentProcessingProgress > 0) {
        const currentFileContribution = (currentProcessingProgress / 100) * currentFileWeight;
        baseProgress += currentFileContribution;
      }
    }
    
    return Math.round(Math.min(100, Math.max(0, baseProgress)));
  };



  const getStatusText = () => {
    if (!ffmpegLoaded) {
      return '正在加载音频处理引擎...';
    }
    
    if (!isProcessing) {
      const completedCount = files.filter(f => f.status === 'completed').length;
      const errorCount = files.filter(f => f.status === 'error').length;
      const pendingCount = files.filter(f => f.status === 'pending').length;
      
      if (completedCount === files.length) {
        return '所有文件处理完成！';
      } else if (errorCount > 0 && pendingCount === 0) {
        return `处理完成，${completedCount} 个成功，${errorCount} 个失败`;
      } else if (pendingCount > 0) {
        return `准备处理 ${pendingCount} 个文件...`;
      }
      return '准备开始处理...';
    }
    
    const currentFile = files[currentProcessingIndex];
    const progress = currentFile?.processingProgress || 0;
    return `正在处理: ${currentFile?.name || ''} (${progress}%)`;
  };

  const getEstimatedTime = () => {
    if (!processingStartTime || !isProcessing) return null;
    
    const elapsed = Date.now() - processingStartTime.getTime();
    const progress = getOverallProgress();
    
    if (progress === 0) return null;
    
    const estimated = (elapsed / progress) * (100 - progress);
    const minutes = Math.floor(estimated / 60000);
    const seconds = Math.floor((estimated % 60000) / 1000);
    
    return `预计剩余: ${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 如果没有文件，显示空状态
  if (files.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">处理进度</h1>
            <p className="text-lg text-gray-600">暂无文件需要处理</p>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Music className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">没有要处理的文件</h3>
            <p className="text-gray-600 mb-6">请先上传视频文件，然后再进行音频提取处理。</p>
            <button
              onClick={() => setCurrentPage('upload')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
            >
              前往上传页面
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">处理进度</h1>
          <p className="text-lg text-gray-600">正在从视频中提取音频，请稍候...</p>
          
          {/* FFmpeg状态指示器 */}
          <div className="mt-4 flex items-center justify-center space-x-2">
            {ffmpegLoaded ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">音频处理引擎已就绪</span>
              </div>
            ) : (
              <div className="flex items-center text-gray-500">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">音频处理引擎准备中...</span>
              </div>
            )}
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="text-center mb-6">
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={ffmpegLoaded ? "#3b82f6" : "#10b981"}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - getOverallProgress() / 100)}`}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {getOverallProgress()}%
                </span>
              </div>
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {getStatusText()}
            </h3>
            
            {getEstimatedTime() && (
              <p className="text-gray-600">{getEstimatedTime()}</p>
            )}
          </div>
          
          {/* Overall Progress Bar - 总进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-3 mb-4 overflow-hidden">
            <div 
              className="h-3 rounded-full transition-all duration-500 max-w-full bg-blue-600"
              style={{ 
                width: `${Math.min(100, Math.max(0, getOverallProgress()))}%` 
              }}
            />
          </div>
          
          {/* 进度说明 */}
          <div className="text-center text-sm text-gray-600 mb-4">
            {!ffmpegLoaded ? (
              <span>正在加载音频处理引擎...</span>
            ) : (
              <span>
                总进度: {files.filter(f => f.status === 'completed').length} / {files.length} 个文件已完成
              </span>
            )}
          </div>
          
          <div className="flex justify-center space-x-4">
            {!ffmpegLoaded && (
              <div className="flex items-center text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span>加载处理引擎中...</span>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center text-green-600">
                <Play className="w-5 h-5 mr-2" />
                <span>处理中...</span>
              </div>
            )}
            
            {!isProcessing && ffmpegLoaded && files.some(f => f.status === 'error') && (
              <button
                onClick={retryProcessing}
                className="flex items-center bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                重试失败的文件
              </button>
            )}
            
            {!isProcessing && ffmpegLoaded && files.length === 0 && (
              <div className="text-center">
                <p className="text-gray-600 mb-4">没有要处理的文件</p>
                <button
                  onClick={() => setCurrentPage('upload')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  返回上传页面
                </button>
              </div>
            )}
          </div>
        </div>

        {/* File List */}
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">文件处理状态</h2>
          
          <div className="space-y-4">
            {files.map((file, index) => (
              <div key={file.id} className="flex items-center p-4 border border-gray-200 rounded-lg overflow-hidden">
                {/* Status Icon */}
                <div className="flex-shrink-0 mr-4">
                  {file.status === 'processing' && (
                    <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                  )}
                  {file.status === 'completed' && (
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  )}
                  {file.status === 'pending' && (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate pr-2">
                      {file.name}
                    </h3>
                    <span className="text-sm text-gray-500 flex-shrink-0">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                  
                  {/* Individual File Progress Bar - 单个文件进度条 */}
                  {file.status === 'processing' && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2 overflow-hidden">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, Math.max(0, file.processingProgress || 0))}%`,
                          maxWidth: '100%'
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Status Text */}
                  <div className="text-sm text-gray-600 truncate">
                    {file.status === 'pending' && '等待处理'}
                    {file.status === 'processing' && `处理中... ${Math.round(file.processingProgress || 0)}%`}
                    {file.status === 'completed' && '处理完成'}
                    {file.status === 'error' && (
                      <span className="truncate" title={`处理失败: ${file.error || '未知错误'}`}>
                        处理失败: {file.error || '未知错误'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Current Processing Indicator */}
                {index === currentProcessingIndex && isProcessing && (
                  <div className="flex-shrink-0 ml-4">
                    <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap">
                      当前处理
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

export default Processing;