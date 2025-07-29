import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Download, Play, Pause, Trash2, Search, Filter, Calendar, FileAudio, RotateCcw, FileText, Music, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore, ProcessingHistory } from '../store/useAppStore';
import { formatFileSize, formatDuration, downloadFile } from '../utils/fileUtils';
import { toast } from 'sonner';
import ConfirmDialog from '../components/ConfirmDialog';
import CustomSelect from '../components/CustomSelect';

type HistoryItem = ProcessingHistory;

const History: React.FC = () => {
  const { setCurrentPage, history, removeFromHistory, clearHistory } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'transcription' | 'audio_extraction'>('all');
  const [filterFormat, setFilterFormat] = useState<string>('all');
  const [filterQuality, setFilterQuality] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioRefs] = useState<Record<string, HTMLAudioElement>>({});
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [expandedTranscriptions, setExpandedTranscriptions] = useState<Set<string>>(new Set());

  // 直接使用store中的历史数据
  const historyItems = React.useMemo(() => {
    return history.map(item => ({
      ...item,
      // 确保processedAt是Date对象（从localStorage恢复时可能是字符串）
      processedAt: item.processedAt instanceof Date ? item.processedAt : new Date(item.processedAt)
    }));
  }, [history]);

  // 过滤和排序历史记录
  const filteredAndSortedItems = React.useMemo(() => {
    let filtered = historyItems.filter(item => {
      const searchLower = searchTerm.toLowerCase();
      const matchesFileName = item.originalFileName.toLowerCase().includes(searchLower);
      const matchesTranscription = item.transcriptionData?.text?.toLowerCase().includes(searchLower) || false;
      
      let matchesSearch = true;
      if (searchTerm.trim()) {
        switch (searchType) {
          case 'transcription':
            matchesSearch = matchesTranscription;
            break;
          case 'audio_extraction':
            matchesSearch = matchesFileName;
            break;
          case 'all':
          default:
            matchesSearch = matchesFileName || matchesTranscription;
            break;
        }
      }
      
      // 根据操作类型筛选
      let matchesOperationType = true;
      if (searchType === 'transcription') {
        matchesOperationType = item.operationType === 'transcription' || item.operationType === 'both';
      } else if (searchType === 'audio_extraction') {
        matchesOperationType = item.operationType === 'audio_extraction' || item.operationType === 'both';
      }
      
      const matchesFormat = filterFormat === 'all' || !item.audioFormat || item.audioFormat === filterFormat;
      const matchesQuality = filterQuality === 'all' || !item.audioQuality || item.audioQuality === filterQuality;
      return matchesSearch && matchesOperationType && matchesFormat && matchesQuality;
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = a.processedAt.getTime() - b.processedAt.getTime();
          break;
        case 'name':
          comparison = a.originalFileName.localeCompare(b.originalFileName);
          break;
        case 'size':
          comparison = a.fileSize - b.fileSize;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [historyItems, searchTerm, searchType, filterFormat, filterQuality, sortBy, sortOrder]);

  // 搜索统计信息
  const searchStats = React.useMemo(() => {
    if (!searchTerm.trim()) return null;
    
    const searchLower = searchTerm.toLowerCase();
    let audioExtractionMatches = 0;
    let transcriptionMatches = 0;
    
    historyItems.forEach(item => {
      if (item.originalFileName.toLowerCase().includes(searchLower) && 
          (item.operationType === 'audio_extraction' || item.operationType === 'both')) {
        audioExtractionMatches++;
      }
      if (item.transcriptionData?.text?.toLowerCase().includes(searchLower) && 
          (item.operationType === 'transcription' || item.operationType === 'both')) {
        transcriptionMatches++;
      }
    });
    
    return { audioExtractionMatches, transcriptionMatches };
  }, [historyItems, searchTerm]);

  const handlePlayPause = (itemId: string, audioUrl: string) => {
    const historyItem = history.find(item => item.id === itemId);
    const audio = audioRefs[itemId];
    
    if (!audio) {
      // 创建新的音频元素
      let finalAudioUrl = audioUrl;
      
      // 如果有audioBlob且当前URL可能失效，重新创建URL
      if (historyItem?.audioBlob) {
        try {
          // 测试当前URL是否有效
          const testAudio = new Audio();
          testAudio.src = audioUrl;
          testAudio.onerror = () => {
            // URL失效，使用blob重新创建
            finalAudioUrl = URL.createObjectURL(historyItem.audioBlob!);
          };
        } catch {
          // 如果出错，使用blob重新创建URL
          finalAudioUrl = URL.createObjectURL(historyItem.audioBlob);
        }
      }
      
      const newAudio = new Audio(finalAudioUrl);
      audioRefs[itemId] = newAudio;
      
      newAudio.addEventListener('ended', () => {
        setPlayingAudio(null);
      });
      
      newAudio.addEventListener('error', () => {
        // 如果播放出错且有blob，尝试重新创建URL
        if (historyItem?.audioBlob) {
          const newUrl = URL.createObjectURL(historyItem.audioBlob);
          newAudio.src = newUrl;
          newAudio.play().catch(() => {
            toast.error('音频播放失败');
            setPlayingAudio(null);
          });
        } else {
          toast.error('音频文件已失效');
          setPlayingAudio(null);
        }
      });
      
      newAudio.play().catch(() => {
        toast.error('音频播放失败');
      });
      setPlayingAudio(itemId);
    } else {
      if (playingAudio === itemId) {
        audio.pause();
        setPlayingAudio(null);
      } else {
        // 停止其他音频
        Object.values(audioRefs).forEach(a => a.pause());
        audio.currentTime = 0;
        audio.play().catch(() => {
          // 如果播放失败，尝试重新创建
          if (historyItem?.audioBlob) {
            const newUrl = URL.createObjectURL(historyItem.audioBlob);
            audio.src = newUrl;
            audio.play().catch(() => {
              toast.error('音频播放失败');
              setPlayingAudio(null);
            });
          } else {
            toast.error('音频文件已失效');
            setPlayingAudio(null);
          }
        });
        setPlayingAudio(itemId);
      }
    }
  };

  const handleDownload = async (item: HistoryItem) => {
    try {
      let blob: Blob;
      
      // 优先使用保存的audioBlob
      if (item.audioBlob) {
        blob = item.audioBlob;
      } else if (item.audioUrl) {
        // 如果没有audioBlob，尝试从URL获取
        const response = await fetch(item.audioUrl);
        if (!response.ok) {
          throw new Error('音频文件已失效');
        }
        blob = await response.blob();
      } else {
        toast.error('音频文件不可用');
        return;
      }
      
      const filename = `${item.originalFileName.split('.')[0]}.${item.audioFormat}`;
      downloadFile(blob, filename);
      toast.success('下载开始');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('下载失败，音频文件可能已失效');
    }
  };

  const handleDownloadTranscription = (item: HistoryItem) => {
    if (!item.transcriptionData) {
      toast.error('转录数据不可用');
      return;
    }

    try {
      const transcriptionText = item.transcriptionData.text;
      const fileName = `${item.originalFileName.replace(/\.[^/.]+$/, '')}_transcription.txt`;
      
      // 创建文本文件并下载
      const blob = new Blob([transcriptionText], { type: 'text/plain;charset=utf-8' });
      downloadFile(blob, fileName);
      
      toast.success('转录文本下载开始');
    } catch (error) {
      console.error('下载转录失败:', error);
      toast.error('下载转录失败，请重试');
    }
  };

  const handleDelete = (itemId: string) => {
    removeFromHistory(itemId);
    
    // 清理音频引用
    if (audioRefs[itemId]) {
      audioRefs[itemId].pause();
      delete audioRefs[itemId];
    }
    
    if (playingAudio === itemId) {
      setPlayingAudio(null);
    }
    
    toast.success('记录已删除');
  };

  const handleClearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    try {
      clearHistory();
      
      // 清理所有音频引用
      Object.values(audioRefs).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      
      setPlayingAudio(null);
      setShowClearConfirm(false);
      toast.success('历史记录已清空');
    } catch (error) {
      console.error('清空历史记录失败:', error);
      toast.error('清空失败，请重试');
    }
  };

  const cancelClearAll = () => {
    setShowClearConfirm(false);
  };

  const getQualityLabel = (quality: string) => {
    switch (quality) {
      case 'high': return '高质量';
      case 'medium': return '中等质量';
      case 'low': return '低质量';
      default: return quality;
    }
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffHours < 1) {
      return '刚刚';
    } else if (diffHours < 24) {
      return `${diffHours}小时前`;
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const getValidAudioUrl = (item: HistoryItem): string | null => {
    // 如果有audioBlob，优先使用它创建新的URL
    if (item.audioBlob) {
      return URL.createObjectURL(item.audioBlob);
    }
    // 否则返回原始URL（可能已失效）
    return item.audioUrl || null;
  };

  // 高亮搜索词的函数
  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return (
          <span key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <HistoryIcon className="w-12 h-12 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">处理历史</h1>
          </div>
          <p className="text-lg text-gray-600">
            查看和管理您的音频提取历史记录
          </p>
        </div>

        {historyItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileAudio className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">暂无历史记录</h2>
            <p className="text-gray-600 mb-6">开始处理视频文件来创建历史记录</p>
            <button
              onClick={() => setCurrentPage('upload')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              上传视频文件
            </button>
          </div>
        ) : (
          <>
            {/* Filters and Search */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                  {/* Search */}
                  <div className="relative md:col-span-2 lg:col-span-2">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder={searchType === 'all' ? '搜索文件名或转录内容...' : searchType === 'transcription' ? '搜索转录内容...' : '搜索文件名...'}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 shadow-sm"
                    />
                  </div>
                  
                  {/* Search Type */}
                  <div>
                    <CustomSelect
                      value={searchType}
                      onChange={(value) => setSearchType(value as any)}
                      options={[
                        { value: 'all', label: '全部类型' },
                        { value: 'transcription', label: '文本转录' },
                        { value: 'audio_extraction', label: '音频提取' }
                      ]}
                    />
                  </div>
                
                  {/* Format Filter */}
                  <div>
                    <CustomSelect
                      value={filterFormat}
                      onChange={setFilterFormat}
                      options={[
                        { value: 'all', label: '所有格式' },
                        { value: 'mp3', label: 'MP3' },
                        { value: 'wav', label: 'WAV' },
                        { value: 'aac', label: 'AAC' }
                      ]}
                    />
                  </div>
                  
                  {/* Quality Filter */}
                  <div>
                    <CustomSelect
                      value={filterQuality}
                      onChange={setFilterQuality}
                      options={[
                        { value: 'all', label: '所有质量' },
                        { value: 'high', label: '高质量' },
                        { value: 'medium', label: '中等质量' },
                        { value: 'low', label: '低质量' }
                      ]}
                    />
                  </div>
                  
                  {/* Sort */}
                  <div>
                    <div className="flex space-x-2">
                      <CustomSelect
                        value={sortBy}
                        onChange={(value) => setSortBy(value as any)}
                        options={[
                          { value: 'date', label: '按日期' },
                          { value: 'name', label: '按名称' },
                          { value: 'size', label: '按大小' }
                        ]}
                        className="flex-1"
                      />
                      <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 shadow-sm bg-white"
                        title={sortOrder === 'asc' ? '升序' : '降序'}
                      >
                        {sortOrder === 'asc' ? '↑' : '↓'}
                      </button>
                    </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-6">
                <div className="text-sm text-gray-600">
                  <p>显示 {filteredAndSortedItems.length} / {historyItems.length} 条记录</p>
                  {searchStats && (
                    <p className="mt-1 text-xs">
                      搜索结果: {searchStats.audioExtractionMatches} 个音频提取匹配, {searchStats.transcriptionMatches} 个文本转录匹配
                    </p>
                  )}
                </div>
                {historyItems.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors flex items-center"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    清空全部
                  </button>
                )}
              </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="space-y-4">
                {filteredAndSortedItems.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 mb-4">
                      <Search className="w-16 h-16 mx-auto mb-4" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2 text-center">
                      {searchTerm ? `没有找到包含 "${searchTerm}" 的记录` : '暂无历史记录'}
                    </h3>
                    {searchTerm && (
                      <p className="text-sm text-gray-400 mt-2 text-center">
                        尝试调整搜索关键词或筛选条件
                      </p>
                    )}
                  </div>
                ) : (
                  filteredAndSortedItems.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {searchTerm ? highlightSearchTerm(item.originalFileName, searchTerm) : item.originalFileName}
                        </h3>
                        <div className="flex items-center text-sm text-gray-600 space-x-4 mb-2">
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {getRelativeTime(item.processedAt)}
                          </span>
                          {item.audioFormat && <span>格式: {item.audioFormat.toUpperCase()}</span>}
                          {item.audioQuality && <span>质量: {getQualityLabel(item.audioQuality)}</span>}
                          <span>大小: {formatFileSize(item.fileSize)}</span>
                          {item.duration && (
                            <span>时长: {formatDuration(item.duration)}</span>
                          )}
                        </div>
                        
                        {/* Operation Status */}
                        <div className="flex items-center space-x-3">
                          {(item.operationType === 'audio_extraction' || item.operationType === 'both') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Music className="w-3 h-3 mr-1" />
                              音频提取
                            </span>
                          )}
                          {(item.operationType === 'transcription' || item.operationType === 'both') && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <FileText className="w-3 h-3 mr-1" />
                              文本转录
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {/* Play/Pause Button */}
                        {(item.audioUrl || item.audioBlob) && (
                          <button
                            onClick={() => {
                              const validUrl = getValidAudioUrl(item);
                              if (validUrl) {
                                handlePlayPause(item.id, validUrl);
                              }
                            }}
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 p-3 rounded-full transition-colors"
                            title={playingAudio === item.id ? '暂停' : '播放'}
                          >
                            {playingAudio === item.id ? (
                              <Pause className="w-5 h-5" />
                            ) : (
                              <Play className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        
                        {/* Download Audio Button */}
                        {(item.audioUrl || item.audioBlob) && (
                          <button
                            onClick={() => handleDownload(item)}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            下载音频
                          </button>
                        )}
                        
                        {/* Download Transcription Button */}
                        {item.hasTranscription && item.transcriptionData && (
                          <button
                            onClick={() => handleDownloadTranscription(item)}
                            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            下载转录
                          </button>
                        )}
                        
                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                          title="删除记录"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Audio Player */}
                    {(item.audioUrl || item.audioBlob) && (() => {
                      const validUrl = getValidAudioUrl(item);
                      return validUrl ? (
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                          <audio
                            ref={(el) => {
                              if (el) {
                                audioRefs[item.id] = el;
                                // 添加错误处理
                                el.onerror = () => {
                                  if (item.audioBlob) {
                                    // 如果有blob，重新创建URL
                                    const newUrl = URL.createObjectURL(item.audioBlob);
                                    el.src = newUrl;
                                  }
                                };
                              }
                            }}
                            controls
                            className="w-full"
                            preload="metadata"
                            src={validUrl}
                          >
                            您的浏览器不支持音频播放
                          </audio>
                        </div>
                      ) : null;
                    })()}
                    
                    {/* Transcription Content */}
                    {item.hasTranscription && item.transcriptionData && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium text-gray-900 flex items-center">
                            <FileText className="w-4 h-4 mr-2" />
                            转录文本
                          </h4>
                          <div className="flex items-center space-x-2">
                            <div className="text-xs text-gray-500">
                              转录时间: {new Date(item.transcriptionData.timestamp).toLocaleString('zh-CN')}
                            </div>
                            {item.transcriptionData.text && item.transcriptionData.text.length > 200 && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedTranscriptions);
                                  if (expandedTranscriptions.has(item.id)) {
                                    newExpanded.delete(item.id);
                                  } else {
                                    newExpanded.add(item.id);
                                  }
                                  setExpandedTranscriptions(newExpanded);
                                }}
                                className="text-blue-600 hover:text-blue-700 p-1 rounded transition-colors"
                                title={expandedTranscriptions.has(item.id) ? '收起' : '展开'}
                              >
                                {expandedTranscriptions.has(item.id) ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="bg-white rounded-md p-3 border border-blue-200">
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {item.transcriptionData.text ? (
                              (() => {
                                const text = searchTerm ? highlightSearchTerm(item.transcriptionData.text, searchTerm) : item.transcriptionData.text;
                                const isLongText = item.transcriptionData.text.length > 200;
                                const isExpanded = expandedTranscriptions.has(item.id);
                                
                                if (isLongText && !isExpanded) {
                                  const truncatedText = typeof text === 'string' ? text.slice(0, 200) + '...' : text;
                                  return (
                                    <span>
                                      {truncatedText}
                                      <button
                                        onClick={() => {
                                          const newExpanded = new Set(expandedTranscriptions);
                                          newExpanded.add(item.id);
                                          setExpandedTranscriptions(newExpanded);
                                        }}
                                        className="ml-2 text-blue-600 hover:text-blue-700 text-xs font-medium"
                                      >
                                        展开全文
                                      </button>
                                    </span>
                                  );
                                }
                                return text;
                              })()
                            ) : '暂无转录内容'}
                          </p>
                        </div>
                        {item.transcriptionData.confidence && (
                          <div className="mt-2 text-xs text-gray-600">
                            置信度: {Math.round(item.transcriptionData.confidence * 100)}%
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  ))
                )}
              </div>
            </div>


          </>
        )}
        {/* Clear Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showClearConfirm}
          title="清空历史记录"
          message="确定要清空所有历史记录吗？此操作不可撤销。"
          confirmText="清空"
          cancelText="取消"
          onConfirm={confirmClearAll}
          onCancel={cancelClearAll}
          type="danger"
        />
      </div>
    </div>
  );
};

export default History;