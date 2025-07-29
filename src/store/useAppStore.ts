import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface VideoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  duration?: number;
  resolution?: string;
  uploadProgress: number;
  processingProgress: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'error';
  audioUrl?: string;
  audioBlob?: Blob;
  audioFormat?: 'mp3' | 'wav' | 'aac';
  audioQuality?: 'high' | 'medium' | 'low';
  error?: string;
  createdAt: Date;
}

export interface TranscriptionData {
  id: string;
  text: string;
  confidence: number;
  timestamp: number;
  format: 'txt' | 'json';
  transcribedAt: Date;
}

export interface ProcessingHistory {
  id: string;
  originalFileName: string;
  audioFileName?: string;
  audioUrl?: string;
  audioBlob?: Blob;
  audioFormat?: string;
  audioQuality?: string;
  fileSize: number;
  duration?: number;
  processedAt: Date;
  // 转录相关字段
  transcriptionData?: TranscriptionData;
  hasTranscription: boolean;
  // 操作类型
  operationType: 'audio_extraction' | 'transcription' | 'both';
}

interface AppState {
  // 当前处理的文件列表
  files: VideoFile[];
  // 处理历史记录
  history: ProcessingHistory[];
  // 当前页面
  currentPage: 'home' | 'upload' | 'processing' | 'download' | 'history' | 'transcription';
  // FFmpeg 加载状态
  ffmpegLoaded: boolean;
  // 要转录的音频文件
  transcriptionAudioFile: {
    file: File | null;
    url: string;
    name: string;
  } | null;
  
  // Actions
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  updateFileProgress: (id: string, progress: number, type: 'upload' | 'processing') => void;
  updateFileStatus: (id: string, status: VideoFile['status']) => void;
  updateFileInfo: (id: string, info: Partial<VideoFile>) => void;
  setCurrentPage: (page: AppState['currentPage']) => void;
  // 转录相关方法
  addTranscriptionToHistory: (historyId: string, transcription: TranscriptionData) => void;
  updateHistoryTranscription: (historyId: string, transcription: Partial<TranscriptionData>) => void;
  setTranscriptionAudioFile: (audioFile: { file: File | null; url: string; name: string } | null) => void;
  setFFmpegLoaded: (loaded: boolean) => void;
  addToHistory: (item: ProcessingHistory) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  clearFiles: () => void;
}

export const useAppStore = create<AppState>()(persist(
  (set, get) => ({
    files: [],
    history: [],
    currentPage: 'home',
    ffmpegLoaded: false,
    transcriptionAudioFile: null,

  addFiles: (newFiles: File[]) => {
    const state = get();
    const existingFileNames = new Set(state.files.map(f => f.name));
    
    // 过滤掉重复的文件名
    const uniqueFiles = newFiles.filter(file => {
      if (existingFileNames.has(file.name)) {
        console.warn(`文件 "${file.name}" 已存在，跳过添加`);
        return false;
      }
      existingFileNames.add(file.name);
      return true;
    });
    
    const files = uniqueFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      uploadProgress: 0,
      processingProgress: 0,
      status: 'pending' as const,
      createdAt: new Date(),
    }));
    
    set(state => ({
      files: [...state.files, ...files]
    }));
  },

  removeFile: (id: string) => {
    set(state => ({
      files: state.files.filter(file => file.id !== id)
    }));
  },

  updateFileProgress: (id: string, progress: number, type: 'upload' | 'processing') => {
    set(state => ({
      files: state.files.map(file => {
        if (file.id === id) {
          const progressKey = type === 'upload' ? 'uploadProgress' : 'processingProgress';
          const currentProgress = file[progressKey];
          // 确保进度只能递增，不能倒退
          const newProgress = Math.max(currentProgress, Math.min(100, Math.max(0, progress)));
          return {
            ...file,
            [progressKey]: newProgress
          };
        }
        return file;
      })
    }));
  },

  updateFileStatus: (id: string, status: VideoFile['status']) => {
    set(state => ({
      files: state.files.map(file => 
        file.id === id ? { ...file, status } : file
      )
    }));
  },

  updateFileInfo: (id: string, info: Partial<VideoFile>) => {
    set(state => ({
      files: state.files.map(file => 
        file.id === id ? { ...file, ...info } : file
      )
    }));
  },

  setCurrentPage: (page: AppState['currentPage']) => {
    set({ currentPage: page });
  },

  setFFmpegLoaded: (loaded: boolean) => {
    set({ ffmpegLoaded: loaded });
  },

  addToHistory: (item: ProcessingHistory) => {
    set((state) => {
      console.log('添加历史记录:', item.originalFileName);
      return {
        ...state,
        history: [item, ...state.history]
      };
    });
  },

  removeFromHistory: (id: string) => {
    set(state => ({
      history: state.history.filter(item => item.id !== id)
    }));
  },

  clearHistory: () => {
    set({ history: [] });
    // 强制清空localStorage中的历史记录
    const storageKey = 'soundscoop-storage';
    try {
      const existingData = localStorage.getItem(storageKey);
      if (existingData) {
        const parsedData = JSON.parse(existingData);
        // 确保state对象存在
        if (!parsedData.state) {
          parsedData.state = {};
        }
        // 清空history字段
        parsedData.state.history = [];
        localStorage.setItem(storageKey, JSON.stringify(parsedData));
        console.log('History cleared from localStorage');
      } else {
        // 如果localStorage中没有数据，创建一个空的存储结构
        const emptyData = {
          state: { history: [] },
          version: 0
        };
        localStorage.setItem(storageKey, JSON.stringify(emptyData));
        console.log('Created empty localStorage structure');
      }
    } catch (error) {
      console.error('Failed to update localStorage:', error);
      // 如果出错，尝试直接删除并重新创建
      try {
        localStorage.removeItem(storageKey);
        const emptyData = {
          state: { history: [] },
          version: 0
        };
        localStorage.setItem(storageKey, JSON.stringify(emptyData));
        console.log('Recreated localStorage after error');
      } catch (retryError) {
        console.error('Failed to recreate localStorage:', retryError);
      }
    }
  },

  clearFiles: () => {
    set({ files: [] });
  },

  addTranscriptionToHistory: (historyId: string, transcription: TranscriptionData) => {
    set(state => ({
      history: state.history.map(item => 
        item.id === historyId 
          ? { 
              ...item, 
              transcriptionData: transcription,
              hasTranscription: true,
              operationType: item.operationType === 'audio_extraction' ? 'both' : 'transcription'
            }
          : item
      )
    }));
  },

  updateHistoryTranscription: (historyId: string, transcription: Partial<TranscriptionData>) => {
    set(state => ({
      history: state.history.map(item => 
        item.id === historyId && item.transcriptionData
          ? { 
              ...item, 
              transcriptionData: { ...item.transcriptionData, ...transcription }
            }
          : item
      )
    }));
  },

  setTranscriptionAudioFile: (audioFile: { file: File | null; url: string; name: string } | null) => {
    set({ transcriptionAudioFile: audioFile });
  },
}),
{
  name: 'soundscoop-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({
    history: state.history.map(item => ({
      ...item,
      // 不持久化audioBlob，因为Blob对象无法序列化
      audioBlob: undefined
    })),
    // 确保其他状态不被持久化，避免干扰
    currentPage: 'home',
    ffmpegLoaded: false
  }),
  // 在恢复状态时处理audioBlob
  onRehydrateStorage: () => (state) => {
    if (state?.history) {
      state.history = state.history.map(item => {
        // 清理失效的blob URL，避免尝试获取已失效的资源
        if (item.audioUrl && item.audioUrl.startsWith('blob:')) {
          console.warn(`Removing invalid blob URL for ${item.audioFileName}`);
          return {
            ...item,
            audioUrl: '', // 清空失效的blob URL
            audioBlob: undefined
          };
        }
        return item;
      });
    }
  }
}
));