import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

class FFmpegProcessor {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async load(onProgress?: (progress: number) => void): Promise<void> {
    if (this.loaded && this.ffmpeg) {
      console.log('FFmpeg already loaded');
      return;
    }

    console.log('开始加载FFmpeg...');
    this.ffmpeg = new FFmpeg();
    
    // 设置日志回调
    this.ffmpeg.on('log', ({ message }) => {
      // console.log('FFmpeg Log:', message);
    });

    // 设置进度回调（仅用于FFmpeg加载进度）
    this.ffmpeg.on('progress', ({ progress }) => {
      const progressPercent = Math.round(progress * 100);
      // console.log('FFmpeg Load Progress:', progressPercent + '%');
      if (onProgress) {
        onProgress(progressPercent);
      }
    });

    // 尝试多个CDN源和加载策略
    const cdnSources = [
      'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
      'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
      'https://fastly.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm'
    ];

    let lastError: Error | null = null;
    
    for (const baseURL of cdnSources) {
      try {
        console.log(`尝试从 ${baseURL} 加载 FFmpeg...`);
        
        // 尝试直接加载（不使用blob URL）
        try {
          await this.ffmpeg.load({
            coreURL: `${baseURL}/ffmpeg-core.js`,
            wasmURL: `${baseURL}/ffmpeg-core.wasm`
          });
          
          // 验证FFmpeg是否真正可用
          await this.validateFFmpeg();
          
          this.loaded = true;
          console.log('FFmpeg loaded and validated successfully (direct) from:', baseURL);
          return;
        } catch (directError) {
          console.warn('直接加载失败，尝试blob URL方式:', directError);
          
          // 如果直接加载失败，尝试blob URL方式
          const coreURL = await this.loadWithRetry(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
          const wasmURL = await this.loadWithRetry(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
          
          await this.ffmpeg.load({ coreURL, wasmURL });
          
          // 验证FFmpeg是否真正可用
          await this.validateFFmpeg();
          
          this.loaded = true;
          console.log('FFmpeg loaded and validated successfully (blob) from:', baseURL);
          return;
        }
      } catch (error) {
        console.warn(`从 ${baseURL} 加载失败:`, error);
        lastError = error as Error;
        
        // 重置FFmpeg实例
        this.ffmpeg = null;
        this.loaded = false;
        continue;
      }
    }
    
    console.error('所有CDN源都加载失败:', lastError);
    this.ffmpeg = null;
    this.loaded = false;
    throw new Error('无法加载音频处理引擎，请检查网络连接或稍后重试');
  }

  private async validateFFmpeg(): Promise<void> {
    if (!this.ffmpeg) {
      throw new Error('FFmpeg instance is null');
    }

    try {
      // 执行一个简单的命令来验证FFmpeg是否工作
      await this.ffmpeg.exec(['-version']);
      console.log('FFmpeg validation successful');
    } catch (error) {
      console.error('FFmpeg validation failed:', error);
      throw new Error('FFmpeg加载后验证失败');
    }
  }

  private parseTimeToSeconds(timeString: string): number {
    const parts = timeString.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]);
    return hours * 3600 + minutes * 60 + seconds;
  }

  private async loadWithRetry(url: string, type: string, maxRetries = 3): Promise<string> {
    let lastError: Error | null = null;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        // 添加缓存破坏参数以避免缓存问题
        const urlWithCacheBuster = `${url}?t=${Date.now()}&retry=${i}`;
        
        // 尝试使用fetch预检查文件是否可访问
        const response = await fetch(urlWithCacheBuster, { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // 如果预检查成功，使用toBlobURL加载
        return await toBlobURL(urlWithCacheBuster, type);
      } catch (error) {
        lastError = error as Error;
        console.warn(`加载 ${url} 失败 (尝试 ${i + 1}/${maxRetries}):`, error);
        
        if (i < maxRetries - 1) {
          // 指数退避策略
          const delay = Math.min(1000 * Math.pow(2, i), 5000);
          console.log(`等待 ${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed to load ${url} after ${maxRetries} attempts`);
  }

  async extractAudio(
    videoFile: File,
    outputFormat: 'mp3' | 'wav' | 'aac' = 'mp3',
    quality: 'high' | 'medium' | 'low' = 'medium',
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      console.error('FFmpeg not loaded:', { ffmpeg: !!this.ffmpeg, loaded: this.loaded });
      throw new Error('音频处理引擎未加载，请刷新页面重试');
    }

    // 生成唯一的文件名以避免多文件处理时的冲突
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const uniqueId = `${timestamp}_${randomId}`;
    const inputFileName = `input_${uniqueId}.` + (videoFile.name.split('.').pop() || 'mp4');
    const outputFileName = `output_${uniqueId}.${outputFormat}`;
    
    console.log('=== 开始音频提取 ===', {
      fileName: videoFile.name,
      fileSize: videoFile.size,
      fileType: videoFile.type,
      inputFileName,
      outputFileName,
      outputFormat,
      quality,
      ffmpegLoaded: this.loaded,
      timestamp: new Date().toISOString()
    });

    // 检查FFmpeg文件系统状态
    try {
      const existingFiles = await this.ffmpeg.listDir('/');
      console.log('FFmpeg文件系统当前文件:', existingFiles);
    } catch (listError) {
      console.warn('无法列出FFmpeg文件系统:', listError);
    }

    try {
      // 检查文件大小限制（100MB）
      if (videoFile.size > 100 * 1024 * 1024) {
        throw new Error('文件过大，请选择小于100MB的视频文件');
      }

      // 检查文件类型和扩展名
      const supportedTypes = [
        'video/mp4', 'video/avi', 'video/mov', 'video/mkv', 'video/webm',
        'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
        'video/mp2t', 'video/3gpp', 'video/x-flv', 'video/x-ms-wmv'
      ];
      
      const fileExtension = videoFile.name.split('.').pop()?.toLowerCase();
      const supportedExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv', '3gp', 'wmv', 'ts', 'm4v'];
      
      // 如果MIME类型不准确或为空，使用文件扩展名进行检测
      const isTypeSupported = videoFile.type ? supportedTypes.includes(videoFile.type) : false;
      const isExtensionSupported = fileExtension ? supportedExtensions.includes(fileExtension) : false;
      
      if (!isTypeSupported && !isExtensionSupported) {
        console.error('不支持的文件格式:', { type: videoFile.type, extension: fileExtension });
        throw new Error(`不支持的视频格式。支持的格式：${supportedExtensions.join(', ')}`);
      }
      
      if (!isTypeSupported && isExtensionSupported) {
        console.warn('MIME类型不准确，但文件扩展名受支持:', { type: videoFile.type, extension: fileExtension });
      }

      console.log('=== 写入文件到FFmpeg文件系统 ===');
      // 将文件写入 FFmpeg 文件系统
      const fileData = await fetchFile(videoFile);
      const originalSize = fileData.byteLength;
      console.log('文件数据获取成功，大小:', originalSize);
      
      await this.ffmpeg.writeFile(inputFileName, fileData);
      console.log('文件写入FFmpeg成功，文件名:', inputFileName);
      
      // 验证文件是否真正写入
      try {
        const writtenFileData = await this.ffmpeg.readFile(inputFileName);
        const writtenSize = writtenFileData instanceof Uint8Array ? writtenFileData.byteLength : (writtenFileData as any).length;
        console.log('验证写入文件成功，读取大小:', writtenSize);
        if (writtenSize !== originalSize) {
          console.error('文件大小不匹配!', { written: writtenSize, original: originalSize });
        }
      } catch (verifyError) {
        console.error('验证写入文件失败:', verifyError);
        throw new Error('文件写入验证失败');
      }

      // 根据质量设置音频参数
      const qualityParams = this.getQualityParams(outputFormat, quality);
      const command = ['-i', inputFileName, '-vn', ...qualityParams, outputFileName];
      
      console.log('=== 执行FFmpeg命令 ===', {
        command: command.join(' '),
        inputFile: inputFileName,
        outputFile: outputFileName,
        qualityParams
      });

      // 设置进度跟踪变量
      let progressInterval: NodeJS.Timeout | null = null;
      let lastProgress = 0;
      let isCompleted = false;
      let videoDuration = 0;
      let progressCallback: ((event: { progress: number }) => void) | null = null;

      // 创建专用的进度回调处理器
      if (onProgress) {
        progressCallback = ({ progress }) => {
          if (!isCompleted) {
            const progressPercent = Math.round(progress * 100);
            // 确保进度只能递增，不能倒退
            if (progressPercent > lastProgress) {
              lastProgress = progressPercent;
              // console.log('文件处理进度:', progressPercent + '%');
              onProgress(progressPercent);
            }
          }
        };
        
        // 添加专用的进度监听器
        this.ffmpeg.on('progress', progressCallback);
        
        // 创建平滑进度更新机制（作为备用）
        progressInterval = setInterval(() => {
          if (!isCompleted && lastProgress < 95) {
            // 缓慢递增进度，确保用户看到进度变化
            const increment = Math.random() * 2 + 0.5; // 0.5-2.5%的随机增量
            const newProgress = Math.min(lastProgress + increment, 95);
            if (newProgress > lastProgress) {
              lastProgress = newProgress;
              onProgress(Math.round(lastProgress));
            }
          }
        }, 300); // 每300ms更新一次
      }

      // 执行音频提取命令
      try {
        await this.ffmpeg.exec(command);
        
        // 命令执行完成，清理资源
        isCompleted = true;
        
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        if (progressCallback) {
          this.ffmpeg.off('progress', progressCallback);
          progressCallback = null;
        }
        
        // 确保进度达到100%
        if (onProgress) {
          onProgress(100);
        }
        
        console.log('=== FFmpeg命令执行完成 ===');
      } catch (execError) {
        // 清理资源
        isCompleted = true;
        
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        if (progressCallback) {
          this.ffmpeg.off('progress', progressCallback);
          progressCallback = null;
        }
        
        console.error('=== FFmpeg命令执行失败 ===', {
          error: execError,
          command: command.join(' '),
          inputFile: inputFileName,
          outputFile: outputFileName
        });
        throw execError;
      }

      // 检查输出文件是否存在
      console.log('=== 检查输出文件 ===');
      let data: Uint8Array;
      try {
        // 先检查文件是否存在于文件系统中
        const filesAfterExec = await this.ffmpeg.listDir('/');
        console.log('命令执行后的文件列表:', filesAfterExec);
        
        data = await this.ffmpeg.readFile(outputFileName) as Uint8Array;
        console.log('=== 读取输出文件成功 ===', {
          fileName: outputFileName,
          size: data.byteLength,
          type: 'Uint8Array'
        });
      } catch (readError) {
        console.error('=== 读取输出文件失败 ===', {
          error: readError,
          fileName: outputFileName,
          message: readError instanceof Error ? readError.message : String(readError)
        });
        
        // 尝试列出当前文件以调试
        try {
          const currentFiles = await this.ffmpeg.listDir('/');
          console.error('当前FFmpeg文件系统文件:', currentFiles);
        } catch (listError) {
          console.error('无法列出文件系统:', listError);
        }
        
        throw new Error('音频提取失败：无法读取输出文件');
      }

      if (data.byteLength === 0) {
        console.error('=== 输出文件为空 ===', { fileName: outputFileName });
        throw new Error('音频提取失败：输出文件为空');
      }
      
      // 清理临时文件
      console.log('=== 清理临时文件 ===');
      try {
        await this.ffmpeg.deleteFile(inputFileName);
        console.log('删除输入文件成功:', inputFileName);
        await this.ffmpeg.deleteFile(outputFileName);
        console.log('删除输出文件成功:', outputFileName);
        console.log('=== 临时文件清理完成 ===');
      } catch (cleanupError) {
        console.warn('清理临时文件失败:', cleanupError);
      }

      // 返回音频 Blob
      const blob = new Blob([data], { type: this.getMimeType(outputFormat) });
      console.log('=== 音频提取成功 ===', {
        originalFile: videoFile.name,
        outputFormat,
        blobSize: blob.size,
        mimeType: this.getMimeType(outputFormat)
      });
      return blob;
    } catch (error) {
      console.error('=== 音频提取过程中发生错误 ===', {
        error,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        fileName: videoFile.name,
        fileSize: videoFile.size,
        fileType: videoFile.type,
        inputFileName,
        outputFileName,
        ffmpegLoaded: this.loaded,
        timestamp: new Date().toISOString()
      });
      
      // 检查FFmpeg状态
      try {
        const finalFiles = await this.ffmpeg?.listDir('/');
        console.error('错误时FFmpeg文件系统状态:', finalFiles);
      } catch (statusError) {
        console.error('无法检查FFmpeg状态:', statusError);
      }
      
      // 尝试清理可能残留的文件
      console.log('=== 尝试清理残留文件 ===');
      try {
        if (this.ffmpeg) {
          await this.ffmpeg.deleteFile(inputFileName);
          console.log('清理残留输入文件成功:', inputFileName);
        }
      } catch (cleanupError) {
        console.warn('清理残留输入文件失败:', cleanupError);
      }
      
      try {
        if (this.ffmpeg) {
          await this.ffmpeg.deleteFile(outputFileName);
          console.log('清理残留输出文件成功:', outputFileName);
        }
      } catch (cleanupError) {
        console.warn('清理残留输出文件失败:', cleanupError);
      }
      
      // 根据错误类型提供更具体的错误信息
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        
        if (errorMessage.includes('invalid data found') || errorMessage.includes('invalid argument')) {
          throw new Error('视频文件格式不支持或文件已损坏，请尝试其他格式的视频文件');
        } else if (errorMessage.includes('no such file') || errorMessage.includes('file not found')) {
          throw new Error('文件读取失败，请重新选择文件');
        } else if (errorMessage.includes('permission denied')) {
          throw new Error('文件访问权限不足');
        } else if (errorMessage.includes('out of memory') || errorMessage.includes('memory')) {
          throw new Error('内存不足，请尝试较小的文件');
        } else if (errorMessage.includes('codec') || errorMessage.includes('format')) {
          throw new Error('视频编码格式不支持，请尝试转换为常见格式（如MP4）后重试');
        } else if (errorMessage.includes('corrupted') || errorMessage.includes('damaged')) {
          throw new Error('视频文件已损坏，请检查文件完整性');
        }
      }
      
      // 如果是已知的格式检查错误，直接抛出
      if (error instanceof Error && error.message.includes('不支持的视频格式')) {
        throw error;
      }
      
      throw new Error('音频提取失败，请检查视频文件格式是否支持或尝试其他视频文件');
    }
  }

  private getQualityParams(format: string, quality: string): string[] {
    const params: string[] = [];

    switch (format) {
      case 'mp3':
        params.push('-acodec', 'libmp3lame');
        switch (quality) {
          case 'high':
            params.push('-b:a', '320k');
            break;
          case 'medium':
            params.push('-b:a', '192k');
            break;
          case 'low':
            params.push('-b:a', '128k');
            break;
        }
        break;
      
      case 'wav':
        params.push('-acodec', 'pcm_s16le');
        switch (quality) {
          case 'high':
            params.push('-ar', '48000');
            break;
          case 'medium':
            params.push('-ar', '44100');
            break;
          case 'low':
            params.push('-ar', '22050');
            break;
        }
        break;
      
      case 'aac':
        params.push('-acodec', 'aac');
        switch (quality) {
          case 'high':
            params.push('-b:a', '256k');
            break;
          case 'medium':
            params.push('-b:a', '128k');
            break;
          case 'low':
            params.push('-b:a', '96k');
            break;
        }
        break;
    }

    return params;
  }

  private getMimeType(format: string): string {
    switch (format) {
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'aac':
        return 'audio/aac';
      default:
        return 'audio/mpeg';
    }
  }

  async getVideoInfo(videoFile: File): Promise<{
    duration: number;
    resolution: string;
    format: string;
  }> {
    if (!this.ffmpeg || !this.loaded) {
      throw new Error('FFmpeg 未加载');
    }

    try {
      const inputFileName = 'probe.' + videoFile.name.split('.').pop();
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(videoFile));

      // 使用 ffprobe 获取视频信息
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-f', 'null', '-'
      ]);

      // 清理文件
      await this.ffmpeg.deleteFile(inputFileName);

      // 这里简化处理，实际应用中需要解析 FFmpeg 输出
      return {
        duration: 0, // 需要从 FFmpeg 输出中解析
        resolution: '未知',
        format: videoFile.type
      };
    } catch (error) {
      console.error('Failed to get video info:', error);
      return {
        duration: 0,
        resolution: '未知',
        format: videoFile.type
      };
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }
}

// 导出单例实例
export const ffmpegProcessor = new FFmpegProcessor();