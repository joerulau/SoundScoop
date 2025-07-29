export interface ElevenLabsTranscriptionResult {
  text: string;
  confidence: number;
  timestamp: number;
  format: 'text' | 'json';
}

export interface ElevenLabsTranscriptionOptions {
  modelId?: string;
  tagAudioEvents?: boolean;
  diarize?: boolean;
}

export class ElevenLabsTranscriptionService {
  private static readonly API_URL = 'https://api.elevenlabs.io/v1/speech-to-text?allow_unauthenticated=1';
  private static readonly DEFAULT_MODEL = 'scribe_v1';

  /**
   * 转录音频文件
   */
  static async transcribeAudioFile(
    audioFile: File,
    options: ElevenLabsTranscriptionOptions & {
      onProgress?: (progress: number) => void;
      onStatusUpdate?: (status: string) => void;
    } = {}
  ): Promise<{
    success: boolean;
    transcription: ElevenLabsTranscriptionResult | null;
    error: string | null;
  }> {
    // 更新状态
    if (options.onStatusUpdate) {
      options.onStatusUpdate('准备上传文件...');
    }
    
    if (options.onProgress) {
      options.onProgress(10);
    }

    try {
      // 创建 FormData
      const formData = new FormData();
      formData.append('file', audioFile);
      formData.append('model_id', options.modelId || ElevenLabsTranscriptionService.DEFAULT_MODEL);
      
      if (options.tagAudioEvents) {
        formData.append('tag_audio_events', 'true');
      }
      
      if (options.diarize) {
        formData.append('diarize', 'true');
      }
      
      if (options.onStatusUpdate) {
        options.onStatusUpdate('正在上传并转录...');
      }
      
      if (options.onProgress) {
        options.onProgress(30);
      }

      // 发送请求
      const response = await fetch(ElevenLabsTranscriptionService.API_URL, {
        method: 'POST',
        headers: {
          'accept': '*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
          'cache-control': 'no-cache',
          'dnt': '1',
          'origin': 'https://elevenlabs.io',
          'pragma': 'no-cache',
          'priority': 'u=1, i',
          'referer': 'https://elevenlabs.io/',
          'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Microsoft Edge";v="138"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"macOS"',
          'sec-fetch-dest': 'empty',
          'sec-fetch-mode': 'cors',
          'sec-fetch-site': 'same-site',
          'sec-gpc': '1',
          'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0'
        },
        body: formData
      });
      
      if (options.onProgress) {
        options.onProgress(70);
      }
      
      if (options.onStatusUpdate) {
        options.onStatusUpdate('处理转录结果...');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (options.onProgress) {
        options.onProgress(90);
      }
      
      if (options.onStatusUpdate) {
        options.onStatusUpdate('转录完成');
      }
      
      if (options.onProgress) {
        options.onProgress(100);
      }

      // 处理结果
      const processedResult = ElevenLabsTranscriptionService.processTranscriptionResult(result);
      
      return {
        success: true,
        transcription: processedResult,
        error: null
      };
      
    } catch (error) {
      console.error('转录失败:', error);
      
      if (options.onStatusUpdate) {
        options.onStatusUpdate('转录失败');
      }
      
      return {
        success: false,
        transcription: null,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 处理转录结果
   */
  private static processTranscriptionResult(data: any): any {
    return {
      text: data.text || '未能识别到语音内容',
      confidence: data.language_probability || 0.8,
      timestamp: Date.now(),
      format: 'text' as const
    };
  }



  /**
   * 检查服务可用性
   */
  static async checkServiceAvailability(): Promise<boolean> {
    try {
      const response = await fetch(ElevenLabsTranscriptionService.API_URL, {
        method: 'OPTIONS'
      });
      return response.ok || response.status === 405;
    } catch {
      return false;
    }
  }
}

// 兼容性类型定义
export type TranscriptionResult = ElevenLabsTranscriptionResult;
export type TranscriptionOptions = ElevenLabsTranscriptionOptions;