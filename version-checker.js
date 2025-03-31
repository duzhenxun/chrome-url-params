// 版本检查器
class VersionChecker {
  constructor() {
    this.currentVersion = chrome.runtime.getManifest().version;
    this.lastCheckTime = 0;
    this.checkInterval = 24 * 60 * 60 * 1000; // 24小时检查一次
    this.githubRepo = 'duzhenxun/chrome-url-params'; // 替换为您的GitHub用户名和仓库名
    this.githubApiUrl = `https://api.github.com/repos/${this.githubRepo}/releases/latest`; // GitHub API接口
  }

  // 初始化版本检查器
  async init() {
    try {
      const result = await new Promise(resolve => {
        chrome.storage.local.get(['lastVersionCheck'], resolve);
      });
      
      if (result.lastVersionCheck) {
        this.lastCheckTime = result.lastVersionCheck;
      }
      
      // 如果距离上次检查超过检查间隔，则检查更新
      const now = Date.now();
      if (now - this.lastCheckTime > this.checkInterval) {
        this.checkForUpdates();
      }
    } catch (error) {
      console.error('Failed to initialize version checker:', error);
    }
  }

  // 检查更新
  async checkForUpdates() {
    try {
      // 更新最后检查时间
      const now = Date.now();
      this.lastCheckTime = now;
      await new Promise(resolve => {
        chrome.storage.local.set({ lastVersionCheck: now }, resolve);
      });
      
      // 从GitHub API获取最新版本信息
      const response = await fetch(this.githubApiUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch version info: ${response.status}`);
      }
      
      const releaseInfo = await response.json();
      
      // 获取最新版本号（去掉'v'前缀）
      const latestVersion = releaseInfo.tag_name.replace(/^v/, '');
      const updateUrl = releaseInfo.html_url;
      const releaseNotes = releaseInfo.body || ''; // 发布说明
      
      // 比较版本
      if (this.isNewerVersion(latestVersion, this.currentVersion)) {
        // 如果有新版本，触发更新通知
        this.notifyUpdate(latestVersion, updateUrl, releaseNotes);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }

  // 比较版本号
  isNewerVersion(remote, current) {
    const remoteParts = remote.split('.').map(Number);
    const currentParts = current.split('.').map(Number);
    
    for (let i = 0; i < remoteParts.length; i++) {
      // 如果当前版本没有这么多部分，远程版本更新
      if (currentParts[i] === undefined) {
        return true;
      }
      
      // 如果远程版本部分大于当前版本部分，远程版本更新
      if (remoteParts[i] > currentParts[i]) {
        return true;
      }
      
      // 如果远程版本部分小于当前版本部分，当前版本更新
      if (remoteParts[i] < currentParts[i]) {
        return false;
      }
    }
    
    // 如果所有部分都相等，版本相同
    return false;
  }

  // 通知更新
  notifyUpdate(newVersion, updateUrl, releaseNotes = '') {
    // 触发自定义事件，通知UI有新版本
    const updateEvent = new CustomEvent('versionUpdate', { 
      detail: { 
        newVersion, 
        updateUrl,
        releaseNotes,
        currentVersion: this.currentVersion 
      } 
    });
    document.dispatchEvent(updateEvent);
  }

  // 手动检查更新
  manualCheck() {
    return this.checkForUpdates();
  }
}

// 创建单例
const versionChecker = new VersionChecker();
export default versionChecker;
