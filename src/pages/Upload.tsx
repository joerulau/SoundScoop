import React, { useCallback, useState, useEffect, useRef } from 'react';
import { Upload as UploadIcon, FileVideo, X, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { isValidVideoFile, isValidFileSize, formatFileSize, getVideoThumbnail } from '../utils/fileUtils';
import { toast } from 'sonner';

const Upload: React.FC = () => {
  const { files, addFiles, removeFile, clearFiles, setCurrentPage } = useAppStore();
  const [dragActive, setDragActive] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const thumbnailUrlsRef = useRef<Set<string>>(new Set());
  
  // 清理缩略图URL的函数
  const cleanupThumbnail = useCallback((url: string) => {
    if (url.startsWith('data:')) return; // data URL不需要清理
    if (thumbnailUrlsRef.current.has(url)) {
      URL.revokeObjectURL(url);
      thumbnailUrlsRef.current.delete(url);
    }
  }, []);
  
  // 组件卸载时清理所有缩略图URL
  useEffect(() => {
    return () => {
      thumbnailUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      thumbnailUrlsRef.current.clear();
    };
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
      // 重置input的value，确保可以重复选择相同文件
      e.target.value = '';
    }
  }, []);

  const handleFiles = useCallback(async (newFiles: File[]) => {
    const validFiles: File[] = [];
    
    for (const file of newFiles) {
      if (!isValidVideoFile(file)) {
        toast.error(`文件 "${file.name}" 不是支持的视频格式`);
        continue;
      }
      
      if (!isValidFileSize(file)) {
        toast.error(`文件 "${file.name}" 超过 500MB 大小限制`);
        continue;
      }
      
      validFiles.push(file);
    }
    
    if (validFiles.length > 0) {
      const beforeCount = files.length;
      addFiles(validFiles);
      
      // 使用setTimeout确保状态更新后再检查
      setTimeout(() => {
        const afterCount = files.length;
        const actuallyAdded = afterCount - beforeCount;
        const duplicateCount = validFiles.length - actuallyAdded;
        
        if (actuallyAdded > 0) {
          if (duplicateCount > 0) {
            toast.success(`成功添加 ${actuallyAdded} 个文件，${duplicateCount} 个重复文件已跳过`);
          } else {
            toast.success(`成功添加 ${actuallyAdded} 个文件`);
          }
        } else if (duplicateCount > 0) {
          toast.warning(`所有 ${duplicateCount} 个文件都已存在，已跳过`);
        }
      }, 100);
      
      // 生成缩略图
      for (const file of validFiles) {
        try {
          const thumbnail = await getVideoThumbnail(file);
          
          // 如果是blob URL，记录以便后续清理
          if (thumbnail.startsWith('blob:')) {
            thumbnailUrlsRef.current.add(thumbnail);
          }
          
          setThumbnails(prev => ({ ...prev, [file.name]: thumbnail }));
        } catch (error) {
          console.warn('Failed to generate thumbnail for', file.name, error);
          // 缩略图生成失败时不影响文件上传
        }
      }
    }
  }, [addFiles, files.length]);

  const handleRemoveFile = (id: string) => {
    // 找到要删除的文件
    const fileToRemove = files.find(f => f.id === id);
    if (fileToRemove) {
      // 清理对应的缩略图
      const thumbnail = thumbnails[fileToRemove.name];
      if (thumbnail) {
        cleanupThumbnail(thumbnail);
        setThumbnails(prev => {
          const newThumbnails = { ...prev };
          delete newThumbnails[fileToRemove.name];
          return newThumbnails;
        });
      }
    }
    
    removeFile(id);
    toast.success('文件已移除');
  };

  const handleStartProcessing = () => {
    if (files.length === 0) {
      toast.error('请先选择要处理的视频文件');
      return;
    }
    setCurrentPage('processing');
  };

  const handleRemoveAll = () => {
    // 清理所有缩略图
    Object.values(thumbnails).forEach(thumbnail => {
      cleanupThumbnail(thumbnail);
    });
    setThumbnails({});
    
    clearFiles();
    toast.success('已移除所有文件');
  };

  const getFileIcon = (file: File) => {
    return <FileVideo className="w-8 h-8 text-blue-600" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">上传视频文件</h1>
          <p className="text-lg text-gray-600">选择要提取音频的视频文件，支持多种格式</p>
        </div>

        {/* Upload Area */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <UploadIcon className={`w-16 h-16 mx-auto mb-4 ${
              dragActive ? 'text-blue-500' : 'text-gray-400'
            }`} />
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              {dragActive ? '释放文件到这里' : '拖拽视频文件到这里'}
            </h3>
            <p className="text-gray-600 mb-6">
              或者点击下方按钮选择文件
            </p>
            <label className="inline-block">
              <input
                type="file"
                multiple
                accept="video/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <span className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium cursor-pointer transition-colors">
                选择视频文件
              </span>
            </label>
            <div className="mt-4 text-sm text-gray-500">
              支持格式：MP4, AVI, MOV, MKV, WMV, FLV, WebM, OGG
              <br />
              最大文件大小：500MB
            </div>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                已选择的文件 ({files.length})
              </h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRemoveAll}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  移除全部
                </button>
                <button
                  onClick={handleStartProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  开始处理
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {files.map((file) => (
                <div key={file.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 mr-4">
                    {thumbnails[file.name] ? (
                      <img
                        src={thumbnails[file.name]}
                        alt={file.name}
                        className="w-16 h-12 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center">
                        {getFileIcon(file.file)}
                      </div>
                    )}
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate mr-2">
                        {file.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {/* 移除状态标签，避免在文件名后显示额外内容 */}
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-500 space-x-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        file.status === 'completed' ? 'bg-green-100 text-green-700' :
                        file.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        file.status === 'error' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {file.status === 'completed' ? '已完成' :
                         file.status === 'processing' ? '处理中' :
                         file.status === 'error' ? '错误' : '等待中'}
                      </span>
                      <span>大小: {formatFileSize(file.size)}</span>
                      <span>格式: {file.type}</span>
                      {file.duration && <span>时长: {Math.round(file.duration)}s</span>}
                      {file.resolution && <span>分辨率: {file.resolution}</span>}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex-shrink-0 ml-4">
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                      title="移除文件"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使用提示</h3>
          <ul className="text-blue-800 space-y-2">
            <li>• 支持同时上传多个视频文件进行批量处理</li>
            <li>• 建议使用较新的浏览器以获得最佳性能</li>
            <li>• 处理大文件时请保持页面开启，避免中断</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Upload;