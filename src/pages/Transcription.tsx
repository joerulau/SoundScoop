import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, Play, Pause, Download, FileText, Trash2, Edit3, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAppStore } from '../store/useAppStore';
import { ElevenLabsTranscriptionService } from '../utils/elevenLabsTranscription';

interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
  isEditing?: boolean;
}

const Transcription: React.FC = () => {
  const { setCurrentPage, transcriptionAudioFile, setTranscriptionAudioFile, addToHistory, updateHistoryTranscription, history } = useAppStore();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcriptionResults, setTranscriptionResults] = useState<TranscriptionResult[]>([]);
  const [editingText, setEditingText] = useState('');
  const [whisperProgress, setWhisperProgress] = useState(0);
  const [whisperStatus, setWhisperStatus] = useState('');
  const [isModelReady, setIsModelReady] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // 在组件加载时检查是否有传递过来的音频文件
  useEffect(() => {
    if (transcriptionAudioFile) {
      setAudioFile(transcriptionAudioFile.file);
      setAudioUrl(transcriptionAudioFile.url);
      toast.success(`已加载音频文件: ${transcriptionAudioFile.name}`);
      // 清除store中的音频文件，避免重复加载
      setTranscriptionAudioFile(null);
    }
  }, [transcriptionAudioFile, setTranscriptionAudioFile]);

  // 检查转录服务可用性
  useEffect(() => {
    const checkService = async () => {
      try {
        const isAvailable = await ElevenLabsTranscriptionService.checkServiceAvailability();
        if (isAvailable) {
          setWhisperStatus('转录服务已就绪');
          setIsModelReady(true);
        } else {
          setWhisperStatus('转录服务暂时不可用');
          setIsModelReady(false);
        }
      } catch (error) {
        setWhisperStatus('转录服务检查失败');
        setIsModelReady(false);
      }
    };
    
    checkService();
  }, []);



  // 处理文件上传
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 检查文件类型
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      toast.error('请选择音频或视频文件');
      return;
    }
    
    setAudioFile(file);
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    
    toast.success(`已加载文件: ${file.name}`);
  };



  // 开始文件转录
  const startFileTranscription = async () => {
    if (!audioFile) {
      toast.error('请先选择音频文件');
      return;
    }

    if (!isModelReady) {
      toast.error('转录服务暂时不可用，请稍后再试');
      return;
    }

    setIsTranscribing(true);
    setWhisperProgress(0);
    setWhisperStatus('正在转录中...');
    setTranscriptionResults([]);

    try {
      const result = await ElevenLabsTranscriptionService.transcribeAudioFile(
        audioFile,
        {
          modelId: 'scribe_v1',
          tagAudioEvents: true,
          diarize: true,
          onProgress: (progress) => {
            setWhisperProgress(progress);
          },
          onStatusUpdate: (status) => {
            setWhisperStatus(status);
          }
        }
      );

      if (result.success && result.transcription) {
        const transcriptionResult: TranscriptionResult = {
          id: Date.now().toString(),
          text: result.transcription.text,
          confidence: result.transcription.confidence || 0.9,
          timestamp: Date.now()
        };
        
        setTranscriptionResults([transcriptionResult]);
        setWhisperStatus('转录完成');
        setWhisperProgress(100);
        
        // 自动保存到历史记录
        const historyItem = {
          id: Date.now().toString(),
          originalFileName: audioFile.name,
          audioFileName: audioFile.name,
          audioUrl: audioUrl,
          audioBlob: audioFile,
          audioFormat: 'original',
          audioQuality: 'original',
          fileSize: audioFile.size,
          processedAt: new Date(),
          transcriptionData: {
            id: transcriptionResult.id,
            text: transcriptionResult.text,
            confidence: transcriptionResult.confidence,
            timestamp: transcriptionResult.timestamp,
            format: 'txt' as const,
            transcribedAt: new Date()
          },
          hasTranscription: true,
          operationType: 'transcription' as const
        };
        
        addToHistory(historyItem);
        toast.success('转录完成！已自动保存到历史记录');
      } else {
        throw new Error(result.error || '转录失败');
      }
    } catch (error) {
      console.error('转录失败:', error);
      setWhisperStatus('转录失败');
      setWhisperProgress(0);
      toast.error(`转录失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
       setIsTranscribing(false);
     }
   };
  


  // 播放/暂停音频
  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 编辑转录结果
  const startEditing = (id: string, text: string) => {
    setTranscriptionResults(prev => 
      prev.map(result => 
        result.id === id 
          ? { ...result, isEditing: true }
          : { ...result, isEditing: false }
      )
    );
    setEditingText(text);
  };

  // 保存编辑
  const saveEdit = (id: string) => {
    setTranscriptionResults(prev => 
      prev.map(result => 
        result.id === id 
          ? { ...result, text: editingText, isEditing: false }
          : result
      )
    );
    
    // 同时更新历史记录中的转录数据
    const historyItem = history.find(item => 
      item.transcriptionData?.id === id
    );
    
    if (historyItem) {
      updateHistoryTranscription(historyItem.id, {
        text: editingText
      });
    }
    
    setEditingText('');
    toast.success('修改已保存');
  };

  // 取消编辑
  const cancelEdit = (id: string) => {
    setTranscriptionResults(prev => 
      prev.map(result => 
        result.id === id 
          ? { ...result, isEditing: false }
          : result
      )
    );
    setEditingText('');
  };

  // 删除转录结果
  const deleteResult = (id: string) => {
    setTranscriptionResults(prev => prev.filter(result => result.id !== id));
    toast.success('已删除');
  };

  // 导出转录结果
  const exportTranscription = (format: 'txt' | 'json') => {
    if (transcriptionResults.length === 0) {
      toast.error('没有转录结果可导出');
      return;
    }
    
    let content: string;
    let filename: string;
    let mimeType: string;
    
    if (format === 'txt') {
      content = transcriptionResults.map(result => result.text).join('\n\n');
      filename = `transcription_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
      mimeType = 'text/plain';
    } else {
      content = JSON.stringify(transcriptionResults, null, 2);
      filename = `transcription_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      mimeType = 'application/json';
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`已导出为 ${format.toUpperCase()} 格式`);
  };

  // 获取完整转录文本
  const getFullTranscription = () => {
    return transcriptionResults.map(result => result.text).join(' ');
  };

  // 手动保存转录结果到历史记录
  const saveToHistory = () => {
    if (!audioFile || transcriptionResults.length === 0) {
      toast.error('没有转录结果可保存');
      return;
    }

    const fullText = getFullTranscription();
    const historyItem = {
      id: Date.now().toString(),
      originalFileName: audioFile.name,
      audioFileName: audioFile.name,
      audioUrl: audioUrl,
      audioBlob: audioFile,
      audioFormat: 'original',
      audioQuality: 'original',
      fileSize: audioFile.size,
      processedAt: new Date(),
      transcriptionData: {
        id: Date.now().toString(),
        text: fullText,
        confidence: transcriptionResults.reduce((sum, r) => sum + r.confidence, 0) / transcriptionResults.length,
        timestamp: Date.now(),
        format: 'txt' as const,
        transcribedAt: new Date()
      },
      hasTranscription: true,
      operationType: 'transcription' as const
    };
    
    addToHistory(historyItem);
    toast.success('转录结果已保存到历史记录');
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">音频转文本</h1>
          </div>
          <button
            onClick={() => setCurrentPage('download')}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            返回下载页面
          </button>
        </div>

        {/* Whisper状态区域 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">转录引擎状态</h2>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-3">

              
              {/* 状态显示 */}
              <div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    isModelReady ? 'bg-green-500' : 
                    whisperStatus.includes('失败') || whisperStatus.includes('不支持') ? 'bg-red-500' : 
                    'bg-yellow-500'
                  }`}></div>
                  <span className="text-sm text-gray-600">{whisperStatus}</span>
                </div>
                {(whisperProgress > 0 && whisperProgress < 100 && !isModelReady) || isTranscribing ? (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${whisperProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{Math.round(whisperProgress)}%</p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* 音频输入区域 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">音频输入</h2>
          
          {/* 文件上传 */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors max-w-md mx-auto">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">上传音频或视频文件</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              选择文件
            </button>
            {audioFile && (
              <p className="mt-2 text-sm text-green-600">已选择: {audioFile.name}</p>
            )}
          </div>
        </div>

        {/* 音频播放控制 */}
        {audioUrl && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">音频播放</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <audio
                ref={audioRef}
                src={audioUrl}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
                className="w-full mb-4"
                controls
              />
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={toggleAudioPlayback}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      暂停
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      播放
                    </>
                  )}
                </button>
                
                {audioFile && (
                  <button
                    onClick={startFileTranscription}
                    disabled={isTranscribing || !isModelReady}
                    className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                      isTranscribing || !isModelReady
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    title={isTranscribing ? '正在转录中...' : !isModelReady ? '转录服务暂时不可用' : '开始转录'}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {isTranscribing ? '转录中...' : '开始转录'}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 转录结果 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">转录结果</h2>
            {transcriptionResults.length > 0 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => exportTranscription('txt')}
                  className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  导出TXT
                </button>
                <button
                  onClick={() => exportTranscription('json')}
                  className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  <Download className="w-4 h-4 mr-1" />
                  导出JSON
                </button>
              </div>
            )}
          </div>
          
          {isTranscribing && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-blue-800 text-center animate-pulse">正在转录中...</p>
            </div>
          )}
          
          {transcriptionResults.length === 0 && !isTranscribing ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">暂无转录结果</p>
              <p className="text-sm text-gray-500 mt-2">上传音频文件进行转录，或使用实时语音转录功能</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 完整转录文本 */}
              {transcriptionResults.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">完整文本</h3>
                  <p className="text-gray-900 leading-relaxed">{getFullTranscription()}</p>
                </div>
              )}
              
              {/* 分段转录结果 */}
              {transcriptionResults.map((result, index) => (
                <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      段落 {index + 1} • 置信度: {(result.confidence * 100).toFixed(1)}%
                    </span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => startEditing(result.id, result.text)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="编辑"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteResult(result.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {result.isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                      />
                      <div className="flex space-x-2">
                        <button
                          onClick={() => saveEdit(result.id)}
                          className="flex items-center px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          保存
                        </button>
                        <button
                          onClick={() => cancelEdit(result.id)}
                          className="flex items-center px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                        >
                          <X className="w-4 h-4 mr-1" />
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-900 leading-relaxed">{result.text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transcription;