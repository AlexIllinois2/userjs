// ==UserScript==
// @name         贴吧 art-video 禁止进入视口自动播放
// @namespace    tieba.autoplay.block
// @version      1.0
// @description   禁止贴吧首页/帖子页 video.art-video 等进入屏幕自动播，点击后正常播放
// @match        *://tieba.baidu.com/*
// @match        *://*.tieba.baidu.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict'

  // 1) 记录“用户主动操作过视频/播放器”的时间，用于放行真正的手动播放
  let lastUserGesture = 0
  const GESTURE_WINDOW = 1000 // ms，点击后 1 秒内调用 play 视为手动

  function markGesture(e) {
    // 只认真实用户事件
    if (!e.isTrusted) return
    const t = e.target
    if (t && t.closest && t.closest('video, .art-video-player, .art-video, [class*="player"]')) {
      lastUserGesture = Date.now()
    }
  }
  ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach((ev) =>
    document.addEventListener(ev, markGesture, true)
  )

  // 2) 对一个 video 做“去自动播”处理
  function neutralize(v) {
    if (!v || v._tbNeutralized) return
    v._tbNeutralized = true

    // 去掉 HTML 属性层面的自动播/循环/静音强制
    v.removeAttribute('autoplay')
    v.removeAttribute('loop')
    // 不要强制 muted=true，否则手动播也没声；如只想拦静音自动播可保留 muted 逻辑
    v.autoplay = false
    v.loop = false
    // 减少预加载，进视口就不会急着拉流
    if (v.preload && v.preload !== 'none') {
      try { v.preload = 'metadata' } catch (_) {}
    }
    // 立即暂停（对已经开播的生效）
    try { v.pause() } catch (_) {}

    // 防止后面又被设 autoplay 属性
    const obs = new MutationObserver((muts) => {
      muts.forEach((m) => {
        if (m.attributeName === 'autoplay') v.removeAttribute('autoplay')
        if (m.attributeName === 'loop') v.removeAttribute('loop')
      })
    })
    obs.observe(v, { attributes: true, attributeFilter: ['autoplay', 'loop'] })

    // play 事件再兜底：非用户手势就暂停
    v.addEventListener('play', function () {
      const byGesture = Date.now() - lastUserGesture < GESTURE_WINDOW
      const ua = navigator.userActivation && navigator.userActivation.isActive
      if (!byGesture && !ua) {
        try { v.pause() } catch (_) {}
      }
    }, true)
  }

  function neutralizeAll(root) {
    if (!root) return
    const list = root.nodeType === 1
      ? root.matches('video') ? [root] : Array.from(root.querySelectorAll('video'))
      : []
    list.forEach(neutralize)
  }

  // 3) 动态 DOM 观察：贴吧视频大多是滚动后插入的
  const mo = new MutationObserver((muts) => {
    muts.forEach((m) => {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => {
          if (n.nodeType !== 1) return
          if (n.tagName === 'VIDEO') neutralize(n)
          else if (n.querySelector) {
            n.querySelectorAll('video').forEach(neutralize)
          }
        })
      }
    })
  })

  function start() {
    neutralizeAll(document)
    const docEl = document.documentElement || document
    if (docEl) mo.observe(docEl, { childList: true, subtree: true })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, false)
  } else {
    start()
  }

  // 4) 更硬的一层：hook 原生 play()，非手势直接不播
  //    有些站不靠 autoplay 属性，直接调 video.play()，这层能拦住
  const origPlay = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function (...args) {
    const v = this
    const isVideo = v.tagName && v.tagName.toLowerCase() === 'video'
    // 只管视频；音频可按需去掉这层
    if (isVideo) {
      const byGesture = Date.now() - lastUserGesture < GESTURE_WINDOW
      const ua = navigator.userActivation && navigator.userActivation.isActive
      const inTiebaPlayer = v.closest && v.closest('.art-video-player, .art-video, [class*="player"]')
      // 没用户手势、又不是刚点过播放器 → 判定自动播，直接返回 resolved，不调原生 play
      if (!byGesture && !ua && inTiebaPlayer) {
        // 顺手再 pause，防止属性/其它逻辑已经让它处于 playing
        try { v.pause() } catch (_) {}
        return Promise.resolve()
      }
    }
    return origPlay.apply(this, args)
  }
})()
