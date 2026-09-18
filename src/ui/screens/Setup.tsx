import { useMemo, useState } from 'react'
import { useGame } from '../../store/gameStore'
import { ALL_JOBS, EDU_BY_AGE, MAJORS, validateName } from '../../data/static'
import { fitOf } from '../../domain/selectors'
import { randomName } from '../../domain/newGame'
import type { Job, Sex } from '../../domain/types'
import styles from './Setup.module.css'

export function Setup() {
  const start = useGame((s) => s.start)
  const [name, setName] = useState('陆承宇')
  const [sex, setSex] = useState<Sex>('男')
  const [ageStr, setAgeStr] = useState('24')
  const [major, setMajor] = useState('法学')
  const [job, setJob] = useState<Job | ''>('')
  const [err, setErr] = useState('')

  const age = Math.max(18, Math.min(38, parseInt(ageStr || '24', 10) || 24))
  const edu = EDU_BY_AGE(age)
  const options = useMemo(
    () => ALL_JOBS.map((j) => ({ j, f: fitOf(major, j) })).filter((x) => x.f > 80),
    [major],
  )
  const curJob: Job = (job && options.some((o) => o.j === job) ? job : options[0]?.j) as Job
  const fit = fitOf(major, curJob)

  const groups = Object.entries(MAJORS)

  const onStart = () => {
    const e = validateName(name)
    if (e) { setErr(e); return }
    setErr('')
    start({ name: name.trim(), sex, age, major, job: curJob })
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.wrap}>
        <div className={styles.brand}>
          <div className={styles.emblem}>民</div>
          <div className={styles.title}>人民的名义</div>
          <div className={styles.sub}>高 自 由 度 人 生 模 拟 器 · 汉 东 省</div>
        </div>
        <div className={styles.setupCard}>
          <div className={styles.gridForm}>
            <div className={`${styles.field} ${styles.fieldName}`}>
              <label>姓名<span className={styles.subLabel}>2—4 个汉字，须为常见姓氏</span></label>
              <div className={styles.nameRow}>
                <input value={name} maxLength={4} placeholder="如：陆承宇" onChange={(e) => { setName(e.target.value); setErr('') }} />
                <button type="button" onClick={() => { setName(randomName(sex)); setErr('') }}>随机姓名</button>
              </div>
              <div className={styles.fieldErr}>{err}</div>
            </div>
            <div className={styles.field}>
              <label>性别</label>
              <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                <option>男</option><option>女</option>
              </select>
            </div>
            <div className={styles.field}>
              <label>年龄<span className={styles.subLabel}>限 18—38 周岁</span></label>
              <input
                type="number"
                value={ageStr}
                min={18}
                max={38}
                onChange={(e) => setAgeStr(e.target.value)}
                onBlur={() => setAgeStr(String(age))}
              />
            </div>
            <div className={styles.field}>
              <label>所学专业</label>
              <select value={major} onChange={(e) => setMajor(e.target.value)}>
                {groups.map(([grp, list]) => (
                  <optgroup label={grp} key={grp}>
                    {list.map((m) => <option key={m}>{m}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className={`${styles.field} ${styles.fieldJob}`}>
              <label>初始职业<span className={styles.subLabel}>仅显示专业匹配度高于 80% 的职业</span></label>
              <select value={curJob} onChange={(e) => setJob(e.target.value as Job)}>
                {options.map((o) => <option key={o.j} value={o.j}>{o.j}（匹配度 {o.f}%）</option>)}
              </select>
            </div>
          </div>
          <div className={styles.match}>
            <div className={styles.mt}>系 统 匹 配 结 果</div>
            <div className={styles.row}>
              <span>匹配学历 <b>{edu}</b></span>
              <span>专业—职业匹配度 <b>{fit}%</b></span>
              <span className={styles.ok}>应届 · 无工作经历</span>
            </div>
            <div className={styles.sm}>匹配度须高于 80%；学历按年龄自动匹配。</div>
          </div>
          <div className="hint">
            出生地、家庭背景随机；是否成为<span className="hl">选调生</span>（仅公务员）入职当天揭晓。
          </div>
          <button className="btn-main" onClick={onStart}>开 始 人 生</button>
          <div className={styles.author}>
            <span className={styles.rule} />
            <span>作者 <b>啊言</b></span>
            <span className={styles.dot}>·</span>
            <span>QQ <b>1461337</b></span>
            <span className={styles.rule} />
          </div>
        </div>
      </div>
    </div>
  )
}
