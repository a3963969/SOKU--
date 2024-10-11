console.log('SOKU-AI content script loaded for Alibaba');

// 存储搜索结果
const searchResults = new Map();

// 添加新的按钮到指定的产品卡片，显示图片地址并进行图片搜索
function addHelperCard() {
  // 选择特定class内的图片元素
  const productImages = document.querySelectorAll('.S-product-card__img-container img, .product-intro-zoom__item img');
  
  for (const img of productImages) {
    if (!img.hasAttribute('data-soku-ai-processed')) {
      addButtonsToCard(img.parentElement, img);
      img.setAttribute('data-soku-ai-processed', 'true');
    }
  }
}

function addButtonsToCard(container, imgElement) {
  // 下载按钮代码
  const downloadButton = createDownloadButton(imgElement);
  
  // 搜索相似按钮代码
  const searchButton = createSearchButton(imgElement);

  container.style.position = 'relative';
  container.appendChild(downloadButton);
  container.appendChild(searchButton);
}

function createDownloadButton(imgElement) {
  const downloadButton = document.createElement('button');
  downloadButton.className = 'soku-ai-helper-button download-button';
  downloadButton.textContent = '下载图片';
  downloadButton.style = `
    position: absolute;
    bottom: 5px;
    right: 5px;
    z-index: 1001;
    padding: 3px 6px;
    background-color: rgba(33, 150, 243, 0.8);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
  `;

  // 下载按钮点击事件
  downloadButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgUrl = imgElement.src || imgElement.getAttribute('data-src');
    const imgAlt = imgElement.alt || 'shein_image';
    
    if (imgUrl) {
      chrome.runtime.sendMessage({
        action: 'downloadImage',
        url: imgUrl,
        filename: `${imgAlt}.jpg`
      }, (response) => {
        if (response && response.success) {
          downloadButton.textContent = '下载成功';
          downloadButton.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
        } else {
          downloadButton.textContent = '下载失败';
          downloadButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        }
        setTimeout(() => {
          downloadButton.textContent = '下载图片';
          downloadButton.style.backgroundColor = 'rgba(33, 150, 243, 0.8)';
        }, 3000);
      });
    } else {
      console.error('无法获取图片URL');
      downloadButton.textContent = '下载失败';
      downloadButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    }
  };

  return downloadButton;
}

function createSearchButton(imgElement) {
  const searchButton = document.createElement('button');
  searchButton.className = 'soku-ai-helper-button search-button';
  searchButton.textContent = '搜索相似';
  searchButton.style = `
    position: absolute;
    bottom: 5px;
    left: 5px;
    z-index: 1001;
    padding: 3px 6px;
    background-color: rgba(76, 175, 80, 0.8);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
  `;

  // 搜索相似按钮点击事件
  searchButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgUrl = imgElement.src || imgElement.getAttribute('data-src');
    if (imgUrl) {
      chrome.runtime.sendMessage({
        action: 'searchImage',
        url: imgUrl
      });
      searchButton.textContent = '搜索中...';
      searchButton.style.backgroundColor = 'rgba(255, 193, 7, 0.8)';
    } else {
      console.error('无法获取图片URL');
      searchButton.textContent = '搜索失败';
      searchButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    }
  };

  return searchButton;
}

// 使用防抖函数来控制消息处理频率
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

// 处理搜索结果的函数
function handleSearchResult(message) {
  if (message.action === 'imageSearchResult') {
    searchResults.set(message.url, message.result);
    updateHelperCards();
  } else if (message.action === 'imageSearchError') {
    console.error('搜索图片时出错:', message.error);
    updateHelperCards(message.url, `错误: ${message.error}`);
  }
}

// 使用防抖包装处理函数
const debouncedHandleSearchResult = debounce(handleSearchResult, 300);

// 监听来自后台脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('收到来自后台脚本的消息:', message);
  debouncedHandleSearchResult(message);
});

// 使用节流函数来控制 updateHelperCards 的调用频率
const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}

// 节流版的 updateHelperCards
const throttledUpdateHelperCards = throttle(updateHelperCards, 500);

// 更新所有 helper cards
function updateHelperCards(errorUrl, errorMessage) {
  const searchButtons = document.querySelectorAll('.soku-ai-helper-button.search-button');
  searchButtons.forEach(button => {
    // 首先尝试查找产品卡片容器
    let container = button.closest('.S-product-card__img-container');
    // 如果没有找到产品卡片容器，则查找产品详情页的容器
    if (!container) {
      container = button.closest('.product-intro-zoom__item');
    }
    
    if (container) {
      // 在容器中查找图片元素
      const imgElement = container.querySelector('.crop-image-container__img');
      if (imgElement && imgElement.src) {
        const imgUrl = imgElement.src;
        if (errorUrl && errorUrl === imgUrl) {
          button.textContent = '搜索失败';
          button.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        } else {
          const result = searchResults.get(imgUrl);
          if (result) {
            let bestMatch = null;
            let maxScore = 0;
            
            if (result.result && result.result.length > 0) {
              result.result.forEach(item => {
                if (item.score > 0.9 && item.score > maxScore) {
                  maxScore = item.score;
                  bestMatch = item;
                }
              });
              
              if (bestMatch) {
                button.textContent = `款号：${bestMatch.brief}`;
                button.style.backgroundColor = 'rgba(0, 128, 0, 0.8)';
              } else {
                button.textContent = '无同款';
                button.style.backgroundColor = 'rgba(128, 128, 128, 0.8)';
              }
            } else {
              button.textContent = '无同款';
              button.style.backgroundColor = 'rgba(128, 128, 128, 0.8)';
            }
          } else {
            button.textContent = '搜索相似';
            button.style.backgroundColor = 'rgba(76, 175, 80, 0.8)';
          }
        }
      }
    }
  });
}

// 初始化函数
function initialize() {
  console.log('初始化 SOKU-AI 助手');
  
  // 使用 setTimeout 来延迟执行 addHelperCard
  setTimeout(() => {
    addHelperCard();
    
    // 设置 MutationObserver 来监视 DOM 变化
    const observer = new MutationObserver((mutations) => {
      let shouldAddHelperCard = false;
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const addedNodes = mutation.addedNodes;
          for (const node of addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.classList.contains('S-product-card__img-container') || 
                  node.querySelector('.S-product-card__img-container:not([data-soku-ai-processed])')) {
                shouldAddHelperCard = true;
                break;
              }
            }
          }
        }
        if (shouldAddHelperCard) break;
      }
      if (shouldAddHelperCard) {
        addHelperCard();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }, 2000); // 延迟 2 秒执行
}

// 当页面加载完成后执行初始化函数
window.addEventListener('load', initialize);

// 在页面加载完成后调用
window.addEventListener('load', setupGlobalObserver);

function setupGlobalObserver() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
        const target = mutation.target;
        if (target.tagName === 'IMG' && !target.src.includes('...')) {
          console.log('捕获到完整图片URL:', target.src);
          // 在这里处理捕获到的URL
        }
      }
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['src'],
    subtree: true
  });
}
