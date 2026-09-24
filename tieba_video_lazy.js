// ==UserScript==
// @name         贴吧信息流视频懒加载(不自动拉流)
// @namespace    tieba.video.lazy
// @version      1.0
// @description   贴吧首页/动态：video默认不加载，点击播放区才拉mp4
// @match        *://tieba.baidu.com/*
// @match        *://*.tieba.baidu.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict'

  const VSEL = 'video.art-video, video'
  // 可放行的视频域名白名单（点了才允许请求）；不在此列表也按点击恢复，只是用于请求拦截时参考
  // const VHOSTS = ['tb-video.bdstatic.com']

  function realSrc(v) {
    if (v.currentSrc && /^https?:/.test(v.currentSrc)) return v.currentSrc
    if (v.src && /^https?:/.test(v.src)) return v.src
    const s = v.querySelector('source')
    if (s && s.src) return s.src
    return ''
  }

  function strip(v) {
    if (!v || v._tbStripped) return
    const src = realSrc(v)
    // 也看看 source 子元素
    const sources = Array.from(v.querySelectorAll('source'))

    if (src) v.dataset.tbSrc = src
    sources.forEach((s) => {
      if (s.src) { s.dataset.tbSrc = s.src; s.removeAttribute('src') }
    })

    // 清空一切可能触发下载的东西
    try { v.removeAttribute('src') } catch (e) {}
    try { v.srcObject = null } catch (e) {}
    // 如果有 <source> 且没法整体删，至少清 src；更狠直接移除 source 节点
    sources.forEach((s) => s.remove())

    v.removeAttribute('autoplay')
    v.removeAttribute('loop')
    v.preload = 'none'
    // 防止页面后面再设 autoplay/src
    new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (m.attributeName === 'autoplay') v.removeAttribute('autoplay')
        if (m.attributeName === 'src' && !v._tbManual) {
          const ns = v.getAttribute('src')
          if (ns) { v.dataset.tbSrc = v.dataset.tbSrc || ns; v.removeAttribute('src') }
        }
      })
    }).observe(v, { attributes: true, attributeFilter: ['autoplay', 'src'] })

    v._tbStripped = true
  }

  function restore(v) {
    if (!v || v._tbManual) return
    v._tbManual = true
    if (v.dataset.tbSrc) {
      v.preload = 'metadata'
      v.src = v.dataset.tbSrc
    } else {
      // 之前是 source 节点被删了，尝试从记录恢复（简单起见只恢复第一个）
      const first = v.dataset.tbSource0
      if (first) { const s = document.createElement('source'); s.src = first; v.appendChild(s) }
    }
    try { v.load() } catch (e) {}
    const p = v.play()
    if (p && p.catch) p.catch(() => {})
  }

  function handleRoot(root) {
    if (!root) return
    const list = root.nodeType === 1
      ? (root.matches(VSEL) ? [root] : Array.from(root.querySelectorAll(VSEL)))
      : []
    list.forEach(strip)
  }

  // 动态插入
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      if (m.type !== 'childList') return
      m.addedNodes.forEach((n) => {
        if (n.nodeType !== 1) return
        if (n.tagName === 'VIDEO') strip(n)
        else if (n.querySelector) n.querySelectorAll(VSEL).forEach(strip)
      })
    })
  })

  function boot() {
    handleRoot(document)
    const el = document.documentElement || document
    if (el) mo.observe(el, { childList: true, subtree: true })

    // 点击播放区再恢复：覆盖 video 本身和 art 播放器外壳
    document.addEventListener('click', (e) => {
      if (!e.isTrusted) return
      const v = e.target.closest && e.target.closest('video')
      if (v) { restore(v); return }
      const wrap = e.target.closest && e.target.closest('.art-video-player, [class*="art-video"], [class*="player"]')
      if (wrap) { const iv = wrap.querySelector('video'); if (iv) restore(iv) }
    }, true)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, false)
  else boot()
})()
