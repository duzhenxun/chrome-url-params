// 导入语言管理器和版本检查器
import languageManager from './languages/language-manager.js';
import versionChecker from './version-checker.js';

document.addEventListener('DOMContentLoaded', async function() {
  // 初始化语言管理器和版本检查器
  await languageManager.init();
  await versionChecker.init();
  
  // 应用当前语言
  applyLanguage();
  
  // 从manifest.json获取版本号并显示在页面上
  const appVersion = document.getElementById('appVersion');
  if (appVersion) {
    const manifestVersion = chrome.runtime.getManifest().version;
    appVersion.textContent = 'v' + manifestVersion;
  }
  // 初始化批量参数区域的折叠状态
  const batchHeader = document.querySelector('.batch-header');
  const batchToggle = document.querySelector('.batch-toggle');
  const batchContent = document.querySelector('.batch-content');

  // 默认折叠
  batchToggle.classList.add('collapsed');
  batchContent.classList.add('collapsed');

  // 添加点击事件
  batchHeader.addEventListener('click', function() {
    batchToggle.classList.toggle('collapsed');
    batchContent.classList.toggle('collapsed');
  });

  // 历史记录功能
  const historySelect = document.getElementById('historySelect');
  const clearHistoryBtn = document.getElementById('clearHistory');

  // 显示历史记录
  function displayHistory(history) {
    // 清空当前选项
    historySelect.innerHTML = '<option value="" disabled selected>选择历史记录</option>';
    
    // 添加历史记录选项
    history.slice().reverse().forEach(item => {
      let displayUrl = '';
      try {
        const url = new URL(item.url);
        displayUrl = url.pathname + url.search + url.hash;
      } catch (e) {
        displayUrl = item.url;
      }

      const option = document.createElement('option');
      option.value = item.url;
      option.title = item.url;
      option.textContent = `${new Date(item.timestamp).toLocaleString('zh-CN')} - ${displayUrl}`;
      historySelect.appendChild(option);
    });

    // 显示或隐藏下拉框和清空按钮
    const hasHistory = history.length > 0;
    historySelect.style.display = hasHistory ? 'block' : 'none';
    clearHistoryBtn.style.display = hasHistory ? 'block' : 'none';
  }

  // 加载历史记录
  function loadHistory() {
    chrome.storage.local.get(['urlHistory'], function(result) {
      const history = result.urlHistory || [];
      displayHistory(history);
    });
  }

  // 添加到历史记录
  function addToHistory(url) {
    chrome.storage.local.get(['urlHistory'], function(result) {
      let history = result.urlHistory || [];
      // 检查是否已存在相同URL
      const exists = history.some(item => item.url === url);
      if (!exists) {
        history.push({
          url: url,
          timestamp: new Date().getTime()
        });
        // 限制历史记录数量
        if (history.length > 10) {
          history = history.slice(-10);
        }
        chrome.storage.local.set({ urlHistory: history }, function() {
          loadHistory();
        });
      }
    });
  }

  // 清空历史记录
  clearHistoryBtn.addEventListener('click', function() {
    chrome.storage.local.remove(['urlHistory'], function() {
      loadHistory();
    });
  });

  // 选择历史记录
  historySelect.addEventListener('change', function() {
    const selectedUrl = this.value;
    if (selectedUrl) {
      urlPatternInput.value = selectedUrl;
      displayUrlParams(selectedUrl);
      // 重置选择
      this.selectedIndex = 0;
    }
  });

  // 初始化加载历史记录
  loadHistory();

  // 时间显示功能
  function displayTime() {
    const date = new Date();
    const timeString = date.toLocaleString('zh-CN', { 
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
      timeElement.textContent = timeString;
    }
  }

  displayTime();
  setInterval(displayTime, 1000);

  // 获取所有需要的DOM元素
  const urlPatternInput = document.getElementById('urlPattern');
  const uidInput = document.getElementById('uidInput');
  const concurrencyInput = document.getElementById('concurrency');
  const getCurrentUrlButton = document.getElementById('getCurrentUrl');
  const pasteUrlButton = document.getElementById('pasteUrl');
  const resultsContainer = document.getElementById('results');
  const paramNameInput = document.getElementById('paramName');
  const themeSelect = document.getElementById('theme');
  const urlParamsContainer = document.getElementById('urlParams');

  // 主题切换功能
  function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    chrome.storage.local.set({ theme });
  }

  // 初始化主题
  chrome.storage.local.get(['theme'], function(result) {
    const savedTheme = result.theme || 'mint';
    themeSelect.value = savedTheme;
    setTheme(savedTheme);
  });
  
  // 语言选择器初始化
  const languageSelector = document.getElementById('languageSelector');
  if (languageSelector) {
    languageSelector.value = languageManager.currentLanguage;
    
    // 监听语言切换
    languageSelector.addEventListener('change', async function(e) {
      const newLanguage = e.target.value;
      await languageManager.switchLanguage(newLanguage);
      applyLanguage();
    });
  }
  
  // 初始化版本更新通知
  const updateNotification = document.getElementById('updateNotification');
  const updateMessage = document.getElementById('updateMessage');
  const updateNowBtn = document.getElementById('updateNow');
  const laterUpdateBtn = document.getElementById('laterUpdate');
  const closeUpdateBtn = document.getElementById('closeUpdate');
  
  // 监听版本更新事件
  document.addEventListener('versionUpdate', function(e) {
    const { newVersion, updateUrl, currentVersion, releaseNotes } = e.detail;
    
    // 更新通知消息
    updateMessage.innerHTML = `${languageManager.getText('newVersionAvailable')}: v${currentVersion} → v${newVersion}`;
    
    // 如果有发布说明，显示它
    if (releaseNotes) {
      const notesElement = document.createElement('div');
      notesElement.className = 'release-notes';
      // 将换行符替换为<br>标签
      const formattedNotes = releaseNotes.split('\n').join('<br>');
      notesElement.innerHTML = `<h4>更新内容:</h4><div>${formattedNotes}</div>`;
      updateMessage.appendChild(notesElement);
    }
    
    updateNotification.style.display = 'flex';
    
    // 点击立即更新
    updateNowBtn.textContent = languageManager.getText('updateNow');
    updateNowBtn.onclick = function() {
      chrome.tabs.create({ url: updateUrl || `https://github.com/${versionChecker.githubRepo}/releases/latest` });
      updateNotification.style.display = 'none';
    };
    
    // 点击稍后提醒
    laterUpdateBtn.textContent = languageManager.getText('laterUpdate');
    laterUpdateBtn.onclick = function() {
      updateNotification.style.display = 'none';
    };
    
    // 点击关闭
    closeUpdateBtn.onclick = function() {
      updateNotification.style.display = 'none';
    };
  });

  // 监听主题切换
  themeSelect.addEventListener('change', (e) => {
    setTheme(e.target.value);
  });

  // 显示URL参数
  function displayUrlParams(url) {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      urlParamsContainer.innerHTML = '';
      
      // 创建头部容器，包含搜索框和添加按钮
      const headerContainer = document.createElement('div');
      headerContainer.className = 'params-header';
      
      // 创建搜索容器
      const searchContainer = document.createElement('div');
      searchContainer.className = 'search-container';
      
      // 创建搜索框
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'param-search';
      searchInput.placeholder = '模糊搜索参数...';
      
      // 创建自定义下拉提示框
      const suggestionsDropdown = document.createElement('div');
      suggestionsDropdown.className = 'suggestions-dropdown';
      suggestionsDropdown.style.display = 'none';
      
      // 收集所有参数名用于自动提示
      const suggestionsList = [];
      params.forEach((value, key) => {
        if (!suggestionsList.includes(key)) {
          suggestionsList.push(key);
        }
      });
      
      // 添加搜索框的事件监听
      searchInput.addEventListener('input', debounce((e) => {
        const searchValue = e.target.value.trim().toLowerCase();
        searchParams(searchValue);
        
        // 如果搜索框为空，隐藏下拉框
        if (!searchValue) {
          suggestionsDropdown.style.display = 'none';
          searchContainer.classList.remove('active');
          return;
        }
        
        // 清空并填充下拉框
        suggestionsDropdown.innerHTML = '';
        let hasMatches = false;
        
        suggestionsList.forEach(suggestion => {
          if (suggestion.toLowerCase().includes(searchValue)) {
            hasMatches = true;
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            
            // 点击提示项时填充搜索框并触发搜索
            item.addEventListener('click', () => {
              searchInput.value = suggestion;
              searchParams(suggestion);
              suggestionsDropdown.style.display = 'none';
              searchContainer.classList.remove('active');
            });
            
            suggestionsDropdown.appendChild(item);
          }
        });
        
        // 根据是否有匹配项决定是否显示下拉框
        if (hasMatches) {
          suggestionsDropdown.style.display = 'block';
          searchContainer.classList.add('active');
        } else {
          suggestionsDropdown.style.display = 'none';
          searchContainer.classList.remove('active');
        }
      }, 300));
      
      // 当点击其他地方时隐藏下拉框
      document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
          suggestionsDropdown.style.display = 'none';
          searchContainer.classList.remove('active');
        }
      });
      
      // 将搜索框和下拉框添加到搜索容器
      searchContainer.appendChild(searchInput);
      searchContainer.appendChild(suggestionsDropdown);
      
      // 添加新增参数按钮
      const addParamButton = document.createElement('button');
      addParamButton.className = 'add-param-button';
      addParamButton.innerHTML = '添加参数';
      addParamButton.addEventListener('click', () => {
        const paramDiv = createParamItem('', '');
        urlParamsContainer.insertBefore(paramDiv, paramsContainer);
      });
      
      // 将搜索容器和按钮添加到头部容器
      headerContainer.appendChild(searchContainer);
      headerContainer.appendChild(addParamButton);
      urlParamsContainer.appendChild(headerContainer);
      
      // 创建参数列表容器
      const paramsContainer = document.createElement('div');
      paramsContainer.className = 'params-container';
      
      // 有参数或添加按钮时显示容器
      urlParamsContainer.style.display = 'block';
      
      // 保持原始参数顺序
      params.forEach((value, key) => {
        const paramDiv = createParamItem(key, value);
        paramsContainer.appendChild(paramDiv);
      });
      
      // 将参数列表容器添加到主容器
      urlParamsContainer.appendChild(paramsContainer);
    } catch (e) {
      console.error('解析URL参数失败:', e);
      // 当URL无效时，仍然显示搜索框和添加参数按钮
      urlParamsContainer.innerHTML = '';
      
      // 创建头部容器，包含搜索框和添加按钮
      const headerContainer = document.createElement('div');
      headerContainer.className = 'params-header';
      
      // 创建搜索容器
      const searchContainer = document.createElement('div');
      searchContainer.className = 'search-container';
      
      // 创建搜索框
      const searchInput = document.createElement('input');
      searchInput.type = 'text';
      searchInput.className = 'param-search';
      searchInput.placeholder = '搜索参数...';
      
      // 创建自定义下拉提示框
      const suggestionsDropdown = document.createElement('div');
      suggestionsDropdown.className = 'suggestions-dropdown';
      suggestionsDropdown.style.display = 'none';
      
      // 收集所有参数名用于自动提示
      const suggestionsList = [];
      params.forEach((value, key) => {
        if (!suggestionsList.includes(key)) {
          suggestionsList.push(key);
        }
      });
      
      // 添加搜索框的事件监听
      searchInput.addEventListener('input', debounce((e) => {
        const searchValue = e.target.value.trim().toLowerCase();
        searchParams(searchValue);
        
        // 如果搜索框为空，隐藏下拉框
        if (!searchValue) {
          suggestionsDropdown.style.display = 'none';
          searchContainer.classList.remove('active');
          return;
        }
        
        // 清空并填充下拉框
        suggestionsDropdown.innerHTML = '';
        let hasMatches = false;
        
        suggestionsList.forEach(suggestion => {
          if (suggestion.toLowerCase().includes(searchValue)) {
            hasMatches = true;
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            
            // 点击提示项时填充搜索框并触发搜索
            item.addEventListener('click', () => {
              searchInput.value = suggestion;
              searchParams(suggestion);
              suggestionsDropdown.style.display = 'none';
              searchContainer.classList.remove('active');
            });
            
            suggestionsDropdown.appendChild(item);
          }
        });
        
        // 根据是否有匹配项决定是否显示下拉框
        if (hasMatches) {
          suggestionsDropdown.style.display = 'block';
          searchContainer.classList.add('active');
        } else {
          suggestionsDropdown.style.display = 'none';
          searchContainer.classList.remove('active');
        }
      }, 300));
      
      // 当点击其他地方时隐藏下拉框
      document.addEventListener('click', (e) => {
        if (!searchContainer.contains(e.target)) {
          suggestionsDropdown.style.display = 'none';
          searchContainer.classList.remove('active');
        }
      });
      
      // 将搜索框和下拉框添加到搜索容器
      searchContainer.appendChild(searchInput);
      searchContainer.appendChild(suggestionsDropdown);
      
      // 添加新增参数按钮
      const addParamButton = document.createElement('button');
      addParamButton.className = 'add-param-button';
      addParamButton.innerHTML = '添加参数';
      addParamButton.addEventListener('click', () => {
        const paramDiv = createParamItem('', '');
        urlParamsContainer.insertBefore(paramDiv, paramsContainer);
      });
      
      // 将搜索容器和按钮添加到头部容器
      headerContainer.appendChild(searchContainer);
      headerContainer.appendChild(addParamButton);
      
      // 创建参数列表容器
      const paramsContainer = document.createElement('div');
      paramsContainer.className = 'params-container';
      
      // 将头部容器和参数列表容器添加到主容器
      urlParamsContainer.appendChild(headerContainer);
      urlParamsContainer.appendChild(paramsContainer);
      urlParamsContainer.style.display = 'block';
    }
  }

  // 搜索参数
  function searchParams(searchText) {
    const paramItems = urlParamsContainer.querySelectorAll('.param-item');
    let foundMatch = false;

    // 当搜索文本为空时，清除所有高亮和排序
    if (!searchText.trim()) {
      paramItems.forEach(item => {
        item.style.order = '';
        item.style.backgroundColor = '';
      });
      return false;
    }

    paramItems.forEach(item => {
      const keyInput = item.querySelector('.param-name-input');
      if (keyInput.value.toLowerCase().includes(searchText.toLowerCase())) {
        item.style.order = '0';
        item.style.backgroundColor = 'var(--highlight-bg)';
        foundMatch = true;
      } else {
        item.style.order = '1';
        item.style.backgroundColor = '';
      }
    });

    return foundMatch;
  }

  // 创建参数项
  function createParamItem(key, value) {
    const paramDiv = document.createElement('div');
    paramDiv.className = 'param-item';
    
    const keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.className = 'param-name-input';
    keyInput.value = key;
    keyInput.placeholder = '参数名';
    
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'param-value';
    valueInput.value = value;
    valueInput.placeholder = '参数值';
    
    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-param-button';
    deleteButton.innerHTML = '删除';
    
    paramDiv.appendChild(keyInput);
    paramDiv.appendChild(document.createTextNode(' = '));
    paramDiv.appendChild(valueInput);
    paramDiv.appendChild(deleteButton);
    
    // 监听输入变化
    const updateUrlWithDelay = debounce(updateUrl, 300);
    keyInput.addEventListener('input', updateUrlWithDelay);
    valueInput.addEventListener('input', updateUrlWithDelay);
    
    // 删除参数
    deleteButton.addEventListener('click', () => {
      paramDiv.remove();
      updateUrl();
    });
    
    return paramDiv;
  }
  
  // 防抖函数
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 更新URL
  function updateUrl() {
    try {
      let url = urlPatternInput.value;
      if (!url) return;
      
      const urlObj = new URL(url);
      // 清除所有现有参数
      urlObj.search = '';
      
      // 获取所有参数项
      const paramItems = urlParamsContainer.querySelectorAll('.param-item');
      paramItems.forEach(paramItem => {
        const keyInput = paramItem.querySelector('.param-name-input');
        const valueInput = paramItem.querySelector('.param-value');
        if (keyInput && valueInput && keyInput.value.trim()) {
          urlObj.searchParams.set(keyInput.value.trim(), valueInput.value);
        }
      });
      
      urlPatternInput.value = urlObj.toString();
    } catch (e) {
      console.error('更新URL失败:', e);
    }
  }

  // 监听URL输入变化
  urlPatternInput.addEventListener('input', () => {
    displayUrlParams(urlPatternInput.value);
  });

  // 监听参数输入区域的变化
  urlParamsContainer.addEventListener('change', (event) => {
    if (event.target.classList.contains('param-name-input') || 
        event.target.classList.contains('param-value-input')) {
      updateUrl();
    }
  }, true);

  // 监听回车键
  urlParamsContainer.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      updateUrl();
    }
  }, true);

  // 自动获取当前页面URL并设置为默认值
  try {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs && tabs[0] && tabs[0].url) {
        const currentUrl = tabs[0].url;
        urlPatternInput.value = currentUrl;
        displayUrlParams(currentUrl);
      }
    });
  } catch (e) {
    console.error('获取当前页面URL失败:', e);
  }

  // 获取当前页面URL
  getCurrentUrlButton.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (tab?.url) {
        urlPatternInput.value = tab.url;
        displayUrlParams(tab.url);
      }
    } catch (e) {
      console.error('获取当前页面URL失败:', e);
    }
  });

  // 粘贴URL
  pasteUrlButton.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      urlPatternInput.value = text;
      displayUrlParams(text);
    } catch (e) {
      console.error('粘贴URL失败:', e);
    }
  });

  // 解析UID输入
  function parseUidInput(input) {
    const uids = new Set();
    const lines = input.split(/[\n,]+/).map(line => line.trim()).filter(Boolean);

    lines.forEach(line => {
      if (line.includes('-')) {
        const [start, end] = line.split('-').map(num => parseInt(num.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            uids.add(i.toString());
          }
        }
      } else {
        const uid = line.trim();
        if (uid) uids.add(uid);
      }
    });

    return Array.from(uids);
  }

  // 发送请求
  async function sendRequest(url, paramInfo) {
    try {
      // 验证URL
      if (!url) {
        throw new Error('请输入URL');
      }

      // 验证URL格式，必须以http或https开头
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('请输入正确的URL地址，必须以http://或https://开头');
      }

      // 添加到历史记录
      addToHistory(url);

      // 发送请求
      const response = await fetch(url);
      const text = await response.text();
      let data;

      // 尝试解析JSON
      try {
        data = JSON.parse(text);
      } catch (e) {
        // 如果不是JSON，直接使用文本
        data = text;
      }

      // 处理响应
      if (!response.ok) {
        return { 
          success: false, 
          error: `请求失败: ${response.status} ${response.statusText}`, 
          paramInfo,
          data
        };
      }

      return { 
        success: true, 
        data, 
        paramInfo,
        status: response.status,
        statusText: response.statusText
      };
    } catch (error) {
      console.error('请求错误:', error);
      return { 
        success: false, 
        error: error.message, 
        paramInfo 
      };
    }
  }



  // 批量发送请求
  async function batchRequest(urlPattern, paramName, uids, concurrency) {
    if (!urlPattern) {
      throw new Error('请输入URL');
    }

    // 验证URL格式，必须以http或https开头
    if (!urlPattern.startsWith('http://') && !urlPattern.startsWith('https://')) {
      throw new Error('请输入正确的URL地址，必须以http://或https://开头');
    }

    const results = [];
    const queue = [];

    // 处理批量参数
    if (uids && uids.length > 0) {
      for (const uid of uids) {
        let finalUrl = urlPattern;
        try {
          const url = new URL(urlPattern);
          url.searchParams.set(paramName, uid);
          finalUrl = url.toString();
          

        } catch (e) {
          console.error('URL解析失败:', e);
          throw new Error('无效的URL格式');
        }
        
        queue.push({
          url: finalUrl,
          paramInfo: { name: paramName, value: uid }
        });
      }
    } else {
      // 如果没有批量参数，直接请求原始URL
      queue.push({
        url: urlPattern,
        paramInfo: { name: '', value: '' }
      });
    }
    
    // 只在请求地址只有一个且没有批量参数时才刷新浏览器
    if (queue.length === 1 && (!uids || uids.length === 0)) {
      const firstRequestUrl = queue[0].url;
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs[0] && tabs[0].id) {
          chrome.tabs.update(tabs[0].id, {url: firstRequestUrl}, function() {
            console.log('正在将浏览器URL更新为:', firstRequestUrl);
          });
        }
      });
    }


    const inProgress = new Set();

    try {
      while (queue.length > 0 || inProgress.size > 0) {
        while (inProgress.size < concurrency && queue.length > 0) {
          const { url, paramInfo } = queue.shift();
          const promise = sendRequest(url, paramInfo)
            .then(result => {
              inProgress.delete(promise);
              return { url, ...result };
            })
            .catch(error => {
              inProgress.delete(promise);
              return { 
                url, 
                success: false, 
                error: error.message,
                paramInfo 
              };
            });
          inProgress.add(promise);
          results.push(promise);
        }

        if (inProgress.size > 0) {
          await Promise.race(Array.from(inProgress));
        }
      }

      return Promise.all(results);
    } catch (error) {
      throw new Error(`批量请求失败: ${error.message}`);
    }
  }

  // 显示结果
  function formatJSON(jsonStr) {
    try {
      const obj = JSON.parse(jsonStr);
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return jsonStr;
    }
  }

  // 全局展开/收起函数
  function initializeJSONHandlers() {
    document.addEventListener('click', function(event) {
      const header = event.target.closest('.json-header');
      if (header) {
        const container = header.closest('.json-container');
        if (container) {
          const isCollapsed = container.classList.contains('json-collapsed');
          if (isCollapsed) {
            container.classList.remove('json-collapsed');
            header.classList.add('expanded');
          } else {
            container.classList.add('json-collapsed');
            header.classList.remove('expanded');
          }
        }
      }

      const expandAllBtn = event.target.closest('.json-expand-all');
      if (expandAllBtn) {
        const container = expandAllBtn.closest('.json-container');
        if (container) {
          container.classList.remove('json-collapsed');
          container.querySelector('.json-header')?.classList.add('expanded');
        }
      }

      const collapseAllBtn = event.target.closest('.json-collapse-all');
      if (collapseAllBtn) {
        const container = collapseAllBtn.closest('.json-container');
        if (container) {
          container.classList.add('json-collapsed');
          container.querySelector('.json-header')?.classList.remove('expanded');
        }
      }
    });
  }

  // 初始化事件处理程序
  initializeJSONHandlers();

  // 添加JSON交互事件
  function setupJSONInteraction(container) {
    // 折叠/展开切换
    container.querySelectorAll('.json-toggle').forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.stopPropagation();
        const block = e.target.closest('.json-block');
        if (block) {
          block.classList.toggle('collapsed');
        }
      });
    });
  }

  function displayResult(result) {
    if (!resultsContainer) return;

    if (resultsContainer.style.display === 'none' || !resultsContainer.style.display) {
      resultsContainer.style.display = 'block';
      resultsContainer.style.opacity = '0';
      setTimeout(() => {
        resultsContainer.style.opacity = '1';
      }, 10);
    }

    const item = document.createElement('div');
    item.className = `request-item ${result.success ? 'success' : 'error'}`;
    
    let resultContent = '';
    if (result.success) {
      try {
        let jsonData;
        if (typeof result.data === 'object') {
          jsonData = result.data;
        } else {
          jsonData = JSON.parse(result.data);
        }

        if ('dm_error' in jsonData) {
          let dataContent = '';
          if (jsonData.data) {
            let rawData;
            if (typeof jsonData.data === 'object') {
              rawData = JSON.stringify(jsonData.data, null, 2);
            } else {
              // 替换img标签为固定文本
              rawData = jsonData.data.replace(/<img[^>]*>/g, '图片地址');
            }
            
            // 检查数据长度
            if (rawData.length <= 250) {
              if (typeof jsonData.data === 'object') {
                dataContent = rawData;
              } else {
                // 转义HTML字符
                dataContent = rawData
                  .replace(/&/g, '&amp;')
                  .replace(/</g, '&lt;')
                  .replace(/>/g, '&gt;');
              }
            } else {
              dataContent = '[...]' + rawData.length + '字';
            }
          }
          resultContent = `<div class="json-info">
            <div>dm_error: ${jsonData.dm_error}</div>
            <div>error_msg: ${jsonData.error_msg || '-'}</div>
            <div class="data-field">data: ${dataContent || '-'}</div>
          </div>`;
        } else {
          resultContent = `<div class="json-info">
            <div>status: ${result.status}</div>
          </div>`;
        }
      } catch (e) {
        // 非JSON数据，显示状态码
        resultContent = `<div class="json-info">
          <div>status: ${result.status}</div>
        </div>`;
      }
    } else {
      resultContent = `<div class="error">${result.error}</div>`;
    }

    if (resultContent) {
      item.innerHTML = `
        <div class="result-url">${result.url}</div>
        ${result.paramInfo.name ? `<div class="result-param">${result.paramInfo.name}=${result.paramInfo.value}</div>` : ''}
        ${resultContent}
      `;
      resultsContainer.insertBefore(item, resultsContainer.firstChild);
    }
  }

  // 初始化开始请求按钮
  const startButton = document.getElementById('startRequest');
  
  // 开始请求处理函数
  async function startRequestProcess() {
    try {
      // 先更新URL，确保使用最新的参数
      updateUrl();
      
      // 获取输入值
      const urlPattern = urlPatternInput.value.trim();
      const paramName = paramNameInput.value.trim();
      const uids = parseUidInput(uidInput.value);
      const concurrency = parseInt(concurrencyInput.value) || 5;

      // 验证URL
      if (!urlPattern) {
        throw new Error('请输入URL');
      }

      // 验证URL格式，必须以http或https开头
      if (!urlPattern.startsWith('http://') && !urlPattern.startsWith('https://')) {
        throw new Error('请输入正确的URL地址，必须以http://或https://开头');
      }

      // 为了做额外的检查，获取URL参数中是否包含server_time
      let hasServerTimeParam = false;
      try {
        const urlObj = new URL(urlPattern);
        // 检查URL中是否有server_time参数
        if (urlObj.searchParams.has('server_time')) {
          hasServerTimeParam = true;
        }
        
        // 如果在URL参数编辑区中有server_time参数
        const paramItems = urlParamsContainer.querySelectorAll('.param-item');
        paramItems.forEach(paramItem => {
          const keyInput = paramItem.querySelector('.param-name-input');
          if (keyInput && keyInput.value.trim() === 'server_time') {
            hasServerTimeParam = true;
          }
        });
        
        // 我们不再在这里处理server_time参数，所有的URL更新和刷新页面都在batchRequest函数中进行
        // 但我们仍然检查参数以便记录日志
        if (hasServerTimeParam) {
          console.log('检测到server_time参数，刷新将在请求通过batchRequest函数完成');
        }
      } catch (e) {
        console.error('检查server_time参数失败:', e);
      }

      // 清空并显示结果容器
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'block';
      resultsContainer.style.opacity = '0';
      setTimeout(() => {
        resultsContainer.style.opacity = '1';
      }, 10);

      // 禁用按钮
      startButton.disabled = true;

      // 发送请求
      console.log('开始发送请求:', { urlPattern, paramName, uids, concurrency });
      const results = await batchRequest(urlPattern, paramName, uids, concurrency);
      
      // 显示结果
      console.log('请求结果:', results);
      results.forEach(displayResult);
    } catch (error) {
      console.error('请求错误:', error);
      const errorItem = document.createElement('div');
      errorItem.className = 'request-item error';
      errorItem.innerHTML = `<div><strong>错误:</strong> ${error.message}</div>`;
      resultsContainer.appendChild(errorItem);
    } finally {
      // 恢复按钮
      startButton.disabled = false;
    }
  }
  
  if (startButton) {
    // 监听点击事件
    startButton.addEventListener('click', startRequestProcess);
    
    // 监听Enter键触发请求
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
        startRequestProcess();
      }
    });
  } else {
    console.error('找不到开始请求按钮');
  }
  
  // 手动检查更新
  setTimeout(() => {
    versionChecker.manualCheck();
  }, 1000);
});

// 应用当前语言
function applyLanguage() {
  const lang = languageManager.getCurrentLanguage();
  
  // 更新所有需要翻译的元素
  document.getElementById('currentTime').textContent = lang.currentTime || '当前时间';
  document.getElementById('urlPattern').placeholder = lang.urlPlaceholder || '请输入您要测试的Api地址';
  document.getElementById('getCurrentUrl').title = lang.getCurrentUrl || '获取当前页面URL';
  document.getElementById('pasteUrl').title = lang.pasteUrl || '粘贴URL';
  
  const historySelect = document.getElementById('historySelect');
  if (historySelect && historySelect.options[0]) {
    historySelect.options[0].textContent = lang.historySelect || '选择历史记录';
  }
  
  document.getElementById('clearHistory').textContent = lang.clearHistory || '清空';
  document.querySelector('.batch-title').textContent = lang.moreSettings || '更多功能设置';
  
  const paramLabels = document.querySelectorAll('label[for="paramName"]');
  paramLabels.forEach(label => {
    label.textContent = lang.paramLabel || '参数';
  });
  
  const concurrencyLabels = document.querySelectorAll('label[for="concurrency"]');
  concurrencyLabels.forEach(label => {
    label.textContent = lang.concurrencyLabel || '并发';
  });
  
  const themeLabels = document.querySelectorAll('label[for="theme-selector"]');
  themeLabels.forEach(label => {
    label.textContent = lang.themeLabel || '主题';
  });
  
  // 更新主题选项
  const themeSelect = document.getElementById('theme');
  if (themeSelect) {
    Array.from(themeSelect.options).forEach(option => {
      const themeKey = `theme${option.value.charAt(0).toUpperCase() + option.value.slice(1)}`;
      option.textContent = lang[themeKey] || option.textContent;
    });
  }
  
  // 更新批量参数标签
  const batchLabel = document.querySelector('label[for="uidInput"]');
  if (batchLabel) {
    batchLabel.textContent = lang.batchParamsLabel || '批量参数值 (支持逗号分隔、换行符或范围格式如10000-10010)';
  }
  
  // 更新批量参数输入框占位符
  const uidInput = document.getElementById('uidInput');
  if (uidInput) {
    uidInput.placeholder = lang.batchParamsPlaceholder || '例如:10001,10002,10003或10000-10010';
  }
  
  // 更新开始请求按钮
  document.getElementById('startRequest').textContent = lang.startRequest || '开始请求';
}