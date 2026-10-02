import { useEffect, useState } from 'react'
import { useTranslator } from './store/useTranslator'
import {
  exportTxt,
  exportWord,
  exportSrt,
  exportCsv,
  type ExportContent,
} from './export/exporters'
import type { Direction, EngineId } from './types'

type ExportFormat = 'txt' | 'word' | 'srt' | 'csv'
type MicState = 'unknown' | 'granted' | 'denied' | 'prompt'

const PERM_SEEN_KEY = 'kt_perm_seen_v1'

const DIRECTION_LABELS: Record<Direction, string> = {
  ko2zh: '韩语 → 中文',
  zh2ko: '中文 → 韩语',
}

export default function App() {
  const t = useTranslator()
  const [exportFormat, setExportFormat] = useState<ExportFormat>('txt')
  const [exportContent, setExportContent] = useState<ExportContent>('both')
  const [permOpen, setPermOpen] = useState(false)
  const [permSeen, setPermSeen] = useState(() => {
    try {
      return localStorage.getItem(PERM_SEEN_KEY) === '1'
    } catch {
      return false
    }
  })
  const [micState, setMicState] = useState<MicState>('unknown')

  useEffect(() => {
    let cancelled = false
    const query = (navigator.permissions?.query as unknown as
      | undefined
      | ((d: { name: string }) => Promise<{ state: string }>))
    if (!query) return
    query({ name: 'microphone' })
      .then((s) => {
        if (!cancelled) setMicState(s.state as MicState)
      })
      .catch(() => {
        /* ignore */
      })
    return () => {
      cancelled = true
    }
  }, [])

  const directionLabel = DIRECTION_LABELS[t.settings.direction]

  const setDirection = (direction: Direction) =>
    t.setSettings({ ...t.settings, direction })
  const setEngineId = (engineId: EngineId) =>
    t.setSettings({ ...t.settings, engineId })

  const markPermSeen = () => {
    try {
      localStorage.setItem(PERM_SEEN_KEY, '1')
    } catch {
      /* ignore */
    }
    setPermSeen(true)
  }

  const onStartClick = () => {
    if (permSeen) void t.start()
    else setPermOpen(true)
  }

  const confirmPerm = () => {
    markPermSeen()
    setPermOpen(false)
    void t.start()
  }

  const handleExport = (content: ExportContent = exportContent) => {
    if (t.segments.length === 0) {
      t.setError('暂无记录可导出，请先开始听写')
      return
    }
    const direction = t.settings.direction
    switch (exportFormat) {
      case 'txt':
        exportTxt(t.segments, direction, content)
        break
      case 'word':
        exportWord(t.segments, direction, content)
        break
      case 'srt':
        exportSrt(t.segments, direction, content)
        break
      case 'csv':
        exportCsv(t.segments, direction, content)
        break
    }
  }

  const handleExportSplit = () => {
    if (t.segments.length === 0) {
      t.setError('暂无记录可导出，请先开始听写')
      return
    }
    handleExport('ko')
    handleExport('zh')
  }

  const translatedCount = t.segments.filter(
    (s) => s.translation && !s.translation.startsWith('（翻译失败）'),
  ).length

  return (
    <div className="app">
      <header className="header">
        <h1>韩语实时同声翻译</h1>
        <p className="subtitle">课堂听讲 · 逐句转写 · 双语对照 · 可导出复习</p>
      </header>

      <section className="panel">
        <div className="row">
          <span className="label">翻译方向</span>
          <div className="seg">
            <button
              type="button"
              className={t.settings.direction === 'ko2zh' ? 'active' : ''}
              onClick={() => setDirection('ko2zh')}
            >
              韩语 → 中文
            </button>
            <button
              type="button"
              className={t.settings.direction === 'zh2ko' ? 'active' : ''}
              onClick={() => setDirection('zh2ko')}
            >
              中文 → 韩语
            </button>
          </div>
        </div>

        <div className="row">
          <span className="label">识别引擎</span>
          <div className="seg">
            <button
              type="button"
              className={t.settings.engineId === 'free' ? 'active' : ''}
              onClick={() => setEngineId('free')}
            >
              免费（浏览器语音）
            </button>
            <button
              type="button"
              className={t.settings.engineId === 'openai' ? 'active' : ''}
              onClick={() => setEngineId('openai')}
            >
              API（Whisper + GPT）
            </button>
          </div>
        </div>

        {t.settings.engineId === 'openai' && (
          <div className="row">
            <span className="label">OpenAI Key</span>
            <input
              type="password"
              className="input"
              placeholder="sk-…（仅保存在本机浏览器）"
              value={t.settings.apiKey}
              onChange={(e) => t.setSettings({ ...t.settings, apiKey: e.target.value })}
            />
          </div>
        )}

        <div className="row">
          <span className="label">收音增益</span>
          <input
            type="range"
            className="gain-slider"
            min="1"
            max="10"
            step="0.5"
            value={t.settings.gain}
            onChange={(e) => t.setGain(Number(e.target.value))}
          />
          <span className="gain-value">{t.settings.gain}x</span>
        </div>

        <p className="hint">
          {t.settings.engineId === 'free'
            ? '免费模式：浏览器语音识别 + MyMemory 免费翻译，无需密钥，识别需 Chrome/Edge 并联网；收音增益仅 API 模式有效。'
            : 'API 模式：OpenAI Whisper 识别 + GPT 翻译，质量更佳，按量计费，需自备 API Key；收音增益可实时调整（越大越响，过高会破音）。'}
        </p>
        <p className="mic-status">
          麦克风：
          {micState === 'granted'
            ? '已允许'
            : micState === 'denied'
              ? '已拒绝（请在浏览器设置中允许）'
              : micState === 'prompt'
                ? '待授权'
                : '未知'}
        </p>
      </section>

      {t.error && (
        <div className="banner error">
          <span>{t.error}</span>
          <button type="button" onClick={() => t.setError('')}>
            关闭
          </button>
        </div>
      )}

      <section className="controls">
        <button
          type="button"
          className={`btn-start ${t.listening ? 'stopping' : ''}`}
          onClick={t.listening ? t.stop : onStartClick}
          disabled={t.starting}
        >
          {t.starting ? '启动中…' : t.listening ? '■ 停止' : '● 开始'}
        </button>
        <button type="button" className="btn-ghost" onClick={t.clear}>
          清空记录
        </button>
        <div className="export-group">
          <select
            value={exportContent}
            onChange={(e) => setExportContent(e.target.value as ExportContent)}
          >
            <option value="both">双语对照</option>
            <option value="ko">仅韩文</option>
            <option value="zh">仅中文</option>
          </select>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
          >
            <option value="txt">TXT 文本</option>
            <option value="word">Word 文档</option>
            <option value="srt">SRT 字幕</option>
            <option value="csv">CSV 表格</option>
          </select>
          <button type="button" className="btn-export" onClick={() => handleExport()}>
            导出
          </button>
          <button type="button" className="btn-ghost" onClick={handleExportSplit}>
            分别导出韩/中
          </button>
        </div>
      </section>

      <section className="live">
        <div className="live-head">
          <span className="live-title">
            {t.listening ? (
              <>
                <span className="dot" /> 正在识别 · {directionLabel}
              </>
            ) : (
              `就绪 · ${directionLabel}`
            )}
          </span>
          <span className="count">已记录 {t.segments.length} 句</span>
        </div>
        <div className="live-original">
          <span className="tag">原文</span>
          <p>{t.interim || (t.listening ? '正在聆听…' : '点击「开始」即可实时转写')}</p>
        </div>
        <div className="live-translation">
          <span className="tag">译文</span>
          <p>{t.latest || '—'}</p>
        </div>
      </section>

      <section className="panel log">
        <div className="log-head">
          <h2>课堂记录</h2>
          <span className="count">已翻译 {translatedCount}/{t.segments.length} 句</span>
        </div>
        {t.segments.length === 0 ? (
          <p className="empty">暂无记录，课堂内容会按句显示在这里，结束后可一键导出。</p>
        ) : (
          <ul className="log-list">
            {t.segments.map((s) => (
              <li key={s.id} className="log-item">
                <div className="log-meta">
                  <span className="log-time">
                    {new Date(s.timestampMs).toLocaleTimeString('zh-CN', {
                      hour12: false,
                    })}
                  </span>
                  <button
                    type="button"
                    className="log-del"
                    onClick={() => t.removeSegment(s.id)}
                    title="删除此句"
                  >
                    ✕
                  </button>
                </div>
                <div className="log-original">{s.original}</div>
                <div className="log-translation">
                  {s.translation || <em>翻译中…</em>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="footer">
        说明：免费模式依赖浏览器语音识别与 MyMemory，网络与浏览器支持会影响识别质量；API
        密钥仅保存在本机浏览器 localStorage，不经过任何第三方服务器。
      </footer>

      {permOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>需要麦克风权限</h3>
            <p>
              本工具通过麦克风进行语音识别。点击「允许并开始」后，浏览器会弹出授权提示，请点击
              <strong>「允许」</strong>。
            </p>
            <ul className="modal-steps">
              <li>误点「拒绝」：手机 Chrome 点地址栏锁图标 → 网站设置 → 麦克风 → 允许。</li>
              <li>iPhone Safari：系统「设置 → Safari → 相机与麦克风」中允许。</li>
              <li>桌面 Chrome/Edge：点地址栏左侧的锁/相机图标 → 麦克风 → 允许。</li>
            </ul>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setPermOpen(false)}>
                取消
              </button>
              <button type="button" className="btn-export" onClick={confirmPerm}>
                允许并开始
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
