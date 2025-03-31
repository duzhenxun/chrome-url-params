// 语言管理器
import zh_CN from './zh-CN.js';
import en_US from './en-US.js';

class LanguageManager {
  constructor() {
    this.languages = {
      'zh-CN': zh_CN,
      'en-US': en_US
    };
    this.currentLanguage = 'zh-CN'; // 默认语言
  }

  // 初始化语言设置
  async init() {
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['language'], resolve);
      });
      
      if (result.language && this.languages[result.language]) {
        this.currentLanguage = result.language;
      } else {
        // 如果没有设置语言，尝试使用浏览器语言
        const browserLang = navigator.language;
        if (this.languages[browserLang]) {
          this.currentLanguage = browserLang;
        } else if (browserLang.startsWith('zh')) {
          this.currentLanguage = 'zh-CN';
        } else {
          this.currentLanguage = 'en-US';
        }
        
        // 保存语言设置
        chrome.storage.local.set({ language: this.currentLanguage });
      }
    } catch (error) {
      console.error('Failed to initialize language:', error);
    }
  }

  // 获取当前语言包
  getCurrentLanguage() {
    return this.languages[this.currentLanguage];
  }

  // 获取翻译文本
  getText(key) {
    const lang = this.getCurrentLanguage();
    return lang[key] || key;
  }

  // 切换语言
  async switchLanguage(langCode) {
    if (this.languages[langCode]) {
      this.currentLanguage = langCode;
      await new Promise(resolve => {
        chrome.storage.local.set({ language: langCode }, resolve);
      });
      return true;
    }
    return false;
  }

  // 获取所有可用语言
  getAvailableLanguages() {
    return Object.keys(this.languages);
  }
}

// 创建单例
const languageManager = new LanguageManager();
export default languageManager;
