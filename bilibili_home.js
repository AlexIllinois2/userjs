// ==UserScript==
// @name         bilibili-哔哩哔哩禁止首页视频自动预览
// @namespace    http://tampermonkey.net/
// @version      2024-06-27
// @description  哔哩哔哩禁止首页鼠标悬停时自动预览视频
// @author       v
// @match        https://www.bilibili.com/*
// @match        https://search.bilibili.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bilibili.com
// @grant        none
// ==/UserScript==
 
(function() {
  'use strict'
  document.addEventListener('mouseenter', function(event) {
    // div class="bili-video-card__image--wrap" mouseenter
    if (event.target.classList.contains('bili-video-card__image--wrap')) {
      event.stopPropagation()
      event.stopImmediatePropagation()
      return
    }
  }, true)
})()
