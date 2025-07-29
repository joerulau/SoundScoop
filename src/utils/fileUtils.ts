/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化时长
 * @param seconds 秒数
 * @returns 格式化后的时长字符串
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 检查文件类型是否为支持的视频格式
 * @param file 文件对象
 * @returns 是否为支持的视频格式
 */
export function isValidVideoFile(file: File): boolean {
  const supportedTypes = [
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/quicktime',
    'video/mkv',
    'video/x-msvideo',
    'video/webm',
    'video/ogg'
  ];
  
  return supportedTypes.includes(file.type) || 
         file.name.toLowerCase().match(/\.(mp4|avi|mov|mkv|webm|ogg|flv|wmv)$/) !== null;
}

/**
 * 检查文件大小是否在限制范围内
 * @param file 文件对象
 * @param maxSizeMB 最大文件大小（MB）
 * @returns 是否在限制范围内
 */
export function isValidFileSize(file: File, maxSizeMB: number = 500): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * 下载文件
 * @param blob 文件 Blob
 * @param filename 文件名
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 生成唯一文件名
 * @param originalName 原始文件名
 * @param format 新格式
 * @returns 新文件名
 */
export function generateUniqueFilename(originalName: string, format: string): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
  const timestamp = new Date().getTime();
  return `${nameWithoutExt}_audio_${timestamp}.${format}`;
}

/**
 * 模拟文件上传进度
 * @param onProgress 进度回调函数
 * @param duration 上传时长（毫秒）
 */
export function simulateUploadProgress(
  onProgress: (progress: number) => void,
  duration: number = 2000
): Promise<void> {
  return new Promise((resolve) => {
    let progress = 0;
    const interval = 50; // 50ms 更新一次
    const increment = 100 / (duration / interval);
    
    const timer = setInterval(() => {
      progress += increment;
      if (progress >= 100) {
        progress = 100;
        onProgress(progress);
        clearInterval(timer);
        resolve();
      } else {
        onProgress(Math.round(progress));
      }
    }, interval);
  });
}

/**
 * 获取视频缩略图
 * @param file 视频文件
 * @returns 缩略图 URL
 */
export function getVideoThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let videoUrl: string | null = null;
    
    if (!ctx) {
      reject(new Error('无法创建 canvas context'));
      return;
    }
    
    // 清理函数
    const cleanup = () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        videoUrl = null;
      }
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      video.src = '';
    };
    
    const onLoadedMetadata = () => {
      try {
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 240;
        
        // 设置到第1秒或视频开始位置
        video.currentTime = Math.min(1, video.duration || 0);
      } catch (error) {
        cleanup();
        reject(new Error('无法读取视频元数据'));
      }
    };
    
    const onSeeked = () => {
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        cleanup();
        resolve(thumbnailUrl);
      } catch (error) {
        cleanup();
        reject(new Error('无法生成缩略图'));
      }
    };
    
    const onError = (event: Event) => {
      cleanup();
      reject(new Error('无法加载视频文件'));
    };
    
    // 添加事件监听器
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    
    // 设置超时处理
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('缩略图生成超时'));
    }, 10000); // 10秒超时
    
    // 在resolve或reject时清除超时
    const originalResolve = resolve;
    const originalReject = reject;
    resolve = (value: string) => {
      clearTimeout(timeout);
      originalResolve(value);
    };
    reject = (reason?: any) => {
      clearTimeout(timeout);
      originalReject(reason);
    };
    
    try {
      videoUrl = URL.createObjectURL(file);
      video.src = videoUrl;
      video.load();
    } catch (error) {
      cleanup();
      reject(new Error('无法创建视频URL'));
    }
  });
}