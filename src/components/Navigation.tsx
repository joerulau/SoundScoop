import React from 'react';
import { Home, Upload, Download, History, Zap, FileText, Settings, AudioWaveform } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const Navigation: React.FC = () => {
  const { currentPage, setCurrentPage, files } = useAppStore();
  
  const completedFiles = files.filter(file => file.status === 'completed');
  const processingFiles = files.filter(file => file.status === 'processing');
  
  const navItems = [
    {
      id: 'home',
      label: '首页',
      icon: Home,
      path: 'home'
    },
    {
      id: 'upload',
      label: '上传',
      icon: Upload,
      path: 'upload'
    },
    {
      id: 'processing',
      label: '处理',
      icon: Zap,
      path: 'processing',
      badge: processingFiles.length > 0 ? processingFiles.length : undefined
    },
    {
      id: 'download',
      label: '下载',
      icon: Download,
      path: 'download',
      badge: completedFiles.length > 0 ? completedFiles.length : undefined
    },
    {
      id: 'transcription',
      label: '转录',
      icon: FileText,
      path: 'transcription'
    },
    {
      id: 'history',
      label: '历史',
      icon: History,
      path: 'history'
    }
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <AudioWaveform className="w-8 h-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">
                Sound<span className="text-blue-600">Scoop</span>
              </span>
            </div>
          </div>
          
          {/* Navigation Items */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.path;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentPage(item.path as any)}
                    className={`
                      relative px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center
                      ${
                        isActive
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.label}
                    {item.badge && (
                      <span className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="bg-gray-100 inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">打开主菜单</span>
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="md:hidden" id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.path;
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.path as any)}
                className={`
                  w-full text-left relative px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 flex items-center
                  ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }
                `}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;