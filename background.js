// 后台脚本，处理版本检查和徽章显示

// GitHub仓库信息
const githubRepo = 'duzhenxun/chrome-url-params';

// 版本检查函数
async function checkForUpdates() {
  try {
    // 获取当前版本
    const currentVersion = chrome.runtime.getManifest().version;
    
    // 首先尝试获取最新release
    let githubApiUrl = `https://api.github.com/repos/${githubRepo}/releases/latest`;
    let response = await fetch(githubApiUrl);
    
    // 如果没有latest release，尝试获取所有releases
    if (!response.ok) {
      console.log(`No latest release found, trying to get all releases...`);
      githubApiUrl = `https://api.github.com/repos/${githubRepo}/releases`;
      response = await fetch(githubApiUrl);
      
      // 如果仍然失败，返回失败
      if (!response.ok) {
        console.log(`Failed to fetch releases: ${response.status}`);
        return false;
      }
      
      // 获取所有releases并找到最新的
      const releases = await response.json();
      if (!releases || releases.length === 0) {
        console.log('No releases found');
        return false;
      }
      
      // 使用第一个release（最新的）
      const releaseInfo = releases[0];
      if (!releaseInfo.tag_name) {
        console.log('Release has no tag name');
        return false;
      }
      
      const latestVersion = releaseInfo.tag_name.replace(/^v/, '');
      
      // 比较版本
      if (compareVersions(latestVersion, currentVersion) > 0) {
        // 存储新版本状态，但不显示徽章
        
        // 存储新版本信息
        chrome.storage.local.set({
          newVersionAvailable: true,
          latestVersion: latestVersion,
          updateUrl: releaseInfo.html_url,
          releaseNotes: releaseInfo.body || ''
        });
        
        return true;
      }
      return false;
    }
    
    // 如果有latest release，处理它
    const releaseInfo = await response.json();
    if (!releaseInfo.tag_name) {
      console.log('Release has no tag name');
      return false;
    }
    
    const latestVersion = releaseInfo.tag_name.replace(/^v/, '');
    
    // 比较版本
    if (compareVersions(latestVersion, currentVersion) > 0) {
      // 存储新版本状态，但不显示徽章
      
      // 存储新版本信息
      chrome.storage.local.set({
        newVersionAvailable: true,
        latestVersion: latestVersion,
        updateUrl: releaseInfo.html_url,
        releaseNotes: releaseInfo.body || ''
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return false;
  }
}

// 简化的版本比较函数 (返回 1 如果 a > b, 0 如果 a == b, -1 如果 a < b)
function compareVersions(a, b) {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  const len = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < len; i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;
    
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  
  return 0;
}

// 初始化：检查是否需要显示徽章
chrome.runtime.onInstalled.addListener(() => {
  // 检查是否已经有新版本通知
  chrome.storage.local.get(['newVersionAvailable'], (result) => {
    if (result.newVersionAvailable) {
      // 已经有新版本通知，但不显示徽章
    }
  });
  
  // 立即检查更新
  checkForUpdates();
});

// 监听消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'clearBadge') {
    // 清除徽章的代码已移除
    sendResponse({ success: true });
  }
});
