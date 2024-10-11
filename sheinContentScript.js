console.log('SOKU-AI content script loaded for Alibaba');

// 存储搜索结果
const searchResults = new Map();

// 添加新的按钮到指定的产品卡片，显示图片地址并进行图片搜索
function addHelperCard() {
  const productCards = document.querySelectorAll('.S-product-card__img-container:not([data-soku-ai-processed])');
  
	for (const card of productCards) {
			const imgContainer = card.querySelector('.crop-image-container');
			if (imgContainer) {
			const imgContainerimg = imgContainer.querySelector('.crop-image-container__img');
			if (imgContainerimg) {
				addButtonToCard(card, imgContainerimg);
				card.setAttribute('data-soku-ai-processed', 'true');
			}  
			} 
		}
    const productMain = document.querySelectorAll('.product-intro-zoom__item');
	for (const mainproduct of productMain) {
			const imgContainerimg = mainproduct.querySelector('.crop-image-container__img');
				if (imgContainerimg) {
					addButtonToCard(mainproduct, imgContainerimg);
				}
			mainproduct.setAttribute('data-soku-ai-processed', 'true');
		}
	const buyerShows = document.querySelectorAll('.s-swiper-slide customerreviews-details__image-slide-item');
	console.log('buyerShows:', buyerShows);
	for (const Show of buyerShows) {
		console.log('buyerShows:', buyerShows);
		const imgContainerimg = Show.querySelector('img');
			if (imgContainerimg) {
				addButtonToCard(Show, imgContainerimg);
			}
			Show.setAttribute('data-soku-ai-processed', 'true');
    }
}


function addButtonToCard(card, imgElement) {
  // 搜索相似按钮
  const searchButton = document.createElement('button');
  searchButton.className = 'soku-ai-helper-button search-button';
  searchButton.textContent = '搜索相似';
  searchButton.style = `
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1001;
    padding: 5px 10px;
    background-color: rgba(76, 175, 80, 0.8);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  // 创建1688和AMZ按钮的容器
  const extraButtonsContainer = document.createElement('div');
  extraButtonsContainer.style = `
    position: absolute;
    top: 40px;
    right: 10px;
    z-index: 1001;
    display: flex;
    gap: 5px;
  `;

  // 1688按钮
  const button1688 = createExtraButton('1688', 'https://s.1688.com/youyuan/index.htm?imageAddress=');
  
  // AMZ按钮
  const buttonAMZ = createExtraButton('AMZ', 'https://www.amazon.com/stylesnap?q=');

  extraButtonsContainer.appendChild(button1688);
  extraButtonsContainer.appendChild(buttonAMZ);

  // 下载主图按钮
  const downloadButton = document.createElement('button');
  downloadButton.className = 'soku-ai-helper-button download-button';
  downloadButton.textContent = '下载主图';
  downloadButton.style = `
    position: absolute;
    bottom: 10px;
    right: 10px;
    z-index: 1001;
    padding: 5px 10px;
    background-color: rgba(33, 150, 243, 0.8);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  `;
  
  // 添加搜索相似按钮的点击事件
  searchButton.onclick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 获取按钮的父元素
    const cardContainer = searchButton.closest('.S-product-card__img-container');
    const productContainer = searchButton.closest('.product-intro-zoom__item');
    let cropImageContainer;

    if (cardContainer) {
      cropImageContainer = cardContainer.querySelector('.crop-image-container');
    } else if (productContainer) {
      cropImageContainer = productContainer.querySelector('.crop-image-container');
    }

    if (cropImageContainer) {
      // 在 crop-image-container 中查找 img 元素
      const imgElement = cropImageContainer.querySelector('img');
      
      if (imgElement) {
        // 尝试获取完整图片URL
        const fullImageUrl = imgElement.src || imgElement.getAttribute('data-src');
        
        if (fullImageUrl && !fullImageUrl.includes('...')) {
          console.log('获取到完整URL:', fullImageUrl);
          chrome.runtime.sendMessage({action: 'getImageSearchResult', url: fullImageUrl});
          searchButton.textContent = '搜索中...';
          searchButton.style.backgroundColor = 'rgba(255, 165, 0, 0.8)';
        } else {
          console.error('无法获取完整URL:', fullImageUrl);
          searchButton.textContent = '获取URL失败';
          searchButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
        }
      } else {
        console.error('未找到图片元素');
        searchButton.textContent = '未找到图片';
        searchButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
      }
    } else {
      console.error('未找到 crop-image-container');
      searchButton.textContent = '未找到图片容器';
      searchButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    }
  };
  
  // 添加下载主图按钮的点击事件
  downloadButton.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // 获取图片URL
    const imgUrl = imgElement.src || imgElement.getAttribute('data-src');
	const imgAlt = imgElement.alt || 'shein_image';
    
    if (imgUrl) {
      // 使用 chrome.downloads API 下载图片。
      chrome.runtime.sendMessage({
        action: 'downloadImage',
        url: imgUrl,
		filename: `${imgAlt}.jpg`
      }, (response) => {
        if (response && response.success) {
          console.log('下载成功:', response.success);
          downloadButton.textContent = '下载成功';
          downloadButton.style.backgroundColor = 'rgba(76, 175, 80, 0.8)'; // 绿色
        } else {
          downloadButton.textContent = '下载失败';
          downloadButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)'; // 红色
        }
        // 3秒后恢复按钮原状
        setTimeout(() => {
          downloadButton.textContent = '下载主图';
          downloadButton.style.backgroundColor = 'rgba(33, 150, 243, 0.8)'; // 蓝色
        }, 3000);
      });
    } else {
      console.error('无法获取图片URL');
      downloadButton.textContent = '下载失败';
      downloadButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    }
  };
  
  card.style.position = 'relative';
  card.prepend(searchButton);
  card.appendChild(extraButtonsContainer);
  card.appendChild(downloadButton);
}

// 创建额外按钮的辅助函数
function createExtraButton(text, baseUrl) {
  const button = document.createElement('button');
  button.textContent = text;
  button.style = `
    padding: 3px 6px;
    background-color: rgba(33, 150, 243, 0.8);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 10px;
  `;
  
  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const imgElement = e.target.closest('.S-product-card__img-container, .product-intro-zoom__item').querySelector('.crop-image-container__img');
    if (imgElement) {
      const imgUrl = imgElement.src || imgElement.getAttribute('data-src');
      if (imgUrl) {
        if (text === '1688') {
          const stylesnap_url = `https://s.1688.com/youyuan/index.htm?imageAddress=${encodeURIComponent(imgUrl)}`;
          window.open(stylesnap_url, '_blank');
        } else if (text === 'AMZ') {
          // 保持原有的Amazon StyleSnap逻辑
          chrome.runtime.sendMessage({action: "fetchImage", url: imgUrl}, response => {
            if (response.error) {
              console.error('处理图片时出错:', response.error);
              alert('无法处理图片,请稍后再试。');
            } else {
              const imageDataUrl = response.data;
              simulateAmazonStyleSnap(imageDataUrl);
            }
          });
        }
      } else {
        console.error('无法获取图片URL');
        alert('无法获取图片URL,请稍后再试。');
      }
    } else {
      console.error('未找到图片元素');
      alert('未找到图片元素,请稍后再试。');
    }
  };

  return button;
}

function simulateAmazonStyleSnap(imageDataUrl) {
  chrome.runtime.sendMessage({
    action: 'openAmazonStyleSnap',
    imageDataUrl: imageDataUrl
  }, (response) => {
    if (chrome.runtime.lastError) {
      //console.error('发送消息时出错:', chrome.runtime.lastError);
      console.log('发送消息时出错:', chrome.runtime.lastError);
    } else {
      console.log('消息发送成功,响应:', response);
    }
  });
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
      // 在器中查找图片元素
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
                // 将概率转换为百分比并保留两位小数
                const probability = (maxScore * 100).toFixed(2);
                button.textContent = `款号：${bestMatch.brief} 概率:${probability}%`;
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
  const swiperButtonNext = document.querySelector('.swiper-button-next');
  if (swiperButtonNext) {
    swiperButtonNext.style.height = '70%';
  }
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

function observeBuyerShows() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        const buyerShows = document.querySelectorAll('.s-swiper-slide.customerreviews-details__image-slide-item:not([data-soku-ai-processed])');
        if (buyerShows.length > 0) {
          processBuyerShows(buyerShows);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 60秒后断开观察器
  setTimeout(() => observer.disconnect(), 60000);
}

function processBuyerShows(buyerShows) {
  for (const show of buyerShows) {
    if (show.getAttribute('data-soku-ai-processed') === 'true') {
      continue;
    }
    const imgElement = show.querySelector('img');
    if (imgElement && !show.querySelector('.soku-ai-download-button')) {
      addDownloadButtonToShow(show, imgElement);
      show.setAttribute('data-soku-ai-processed', 'true');
    }
  }
}

function addDownloadButtonToShow(show, imgElement) {
	const downloadButton = document.createElement('button');
	downloadButton.className = 'soku-ai-download-button';
	downloadButton.textContent = '下载';
	downloadButton.style.cssText = `
	  position: absolute;
	  bottom: 5px;
	  right: 5px;
	  z-index: 10000;
	  background-color: rgba(33, 150, 243, 0.8);
	  color: white;
	  border: none;
	  border-radius: 4px;
	  padding: 5px 10px;
	  cursor: pointer;
	  font-size: 12px;
	  font-weight: bold;
	  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
	  line-height: normal;

	`;
  
	downloadButton.onclick = (e) => {
	  e.preventDefault();
	  e.stopPropagation();
	  
	  const imgUrl = imgElement.src;
	  const imgAlt = imgElement.alt || 'shein_buyer_show';
	  
	  if (imgUrl) {
      console.log('Received iamge request for:', imgUrl);
		chrome.runtime.sendMessage({
		  action: 'downloadImage',
		  url: imgUrl,
		  filename: `${imgAlt}.jpg`
		}, (response) => {
		  if (response && response.success) {
			downloadButton.textContent = '下载成功';
			downloadButton.style.backgroundColor = 'rgba(76, 175, 80, 0.8)'; // 绿色
		  } else {
			downloadButton.textContent = '下载失败';
			downloadButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)'; // 红色
		  }
		  // 3秒后恢复按钮原状
		  setTimeout(() => {
			downloadButton.textContent = '下载';
			downloadButton.style.backgroundColor = 'rgba(33, 150, 243, 0.8)'; // 蓝色
		  }, 3000);
		});
	  } else {
		console.error('无法获取图片URL');
		downloadButton.textContent = '下载失败';
		downloadButton.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
	  }
	};
  
	show.style.position = 'relative';
	show.appendChild(downloadButton);
  
	function ensureButtonVisibility() {
	  downloadButton.style.zIndex = '10000';
	  downloadButton.style.pointerEvents = 'auto';
	  show.style.overflow = 'visible';
	}
  
	ensureButtonVisibility();
	setInterval(ensureButtonVisibility, 1000);
  }



// 在页面加载完成后调用
window.addEventListener('load', observeBuyerShows);
