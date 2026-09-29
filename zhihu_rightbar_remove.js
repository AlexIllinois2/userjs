// ==UserScript==
// @name         知乎 - 移除右侧栏
// @namespace    https://tampermonkey.net/
// @version      1.1
// @description  移除知乎右侧边栏（RightSideBar），让内容区占满，阅读更清爽
// @author       you
// @match        *://*.zhihu.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 右侧栏选择器：第一个是你提供的通用标识，其余是各页面/历史版本的兜底
    const SIDEBAR_SELECTORS = [
    '[data-za-detail-view-path-module="RightSideBar"]',
    '.css-bkewaf',
    '.Question-sideColumn',
    '.TopstorySideBar',
    '.SearchSideBar',
    'div:has(> a[aria-label="边栏锚点"])'
];

   const EXTRA_CSS = `
    :root {
        --container-width: 90% !important;
        --container-main-column-width: auto !important;
    }
    .Question-mainColumn,
    .Topstory-mainColumn,
    .Post-Main {
        width: auto !important;
        max-width: none !important;
        flex: 1 1 auto !important;
    }
`;

    function removeSidebars() {
        for (const sel of SIDEBAR_SELECTORS) {
            document.querySelectorAll(sel).forEach(el => el.remove());
        }
    }

    function injectStyle() {
        if (document.getElementById('zh-remove-sidebar-style')) return;
        const style = document.createElement('style');
        style.id = 'zh-remove-sidebar-style';
        style.textContent = EXTRA_CSS;
        (document.head || document.documentElement).appendChild(style);
    }

    // 用 rAF 节流，避免 SPA 频繁 DOM 变动导致性能问题
    let scheduled = false;
    function scheduleClean() {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            removeSidebars();
        });
    }

    // document-start 时 documentElement 已存在，可以直接监听
    const observer = new MutationObserver(scheduleClean);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 首次执行 + 插入样式
    scheduleClean();
    if (document.head) injectStyle();
    else document.addEventListener('DOMContentLoaded', injectStyle, { once: true });
})();
