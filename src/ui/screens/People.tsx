import type { ReactNode } from 'react'
import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { 子女月支出 } from '../../domain/economy'
import { 免费互动 } from '../../data/static'
import { fmt } from '../../utils/format'

const 约会花费: Record<string, string> = {
  '散步': '免费', '吃饭': '500元', '看电影': '200元', '短途旅行': '3000元', '看展': '100元', '一起运动': '免费',
}

interface NpcCardProps {
  face: string
  name: string
  age: number
  identity: string
  score: number
  trust?: number
  open?: number
  benefit?: number
  personality: string
  notes: string
  memory?: string[]
  extra?: string
  actions: ReactNode
  scoreLabel?: string
}

export function NpcCard(p: NpcCardProps) {
  return (
    <div className="npc">
      <div className="npc-top">
        <div className="npc-face">{p.face}</div>
        <div className="npc-main">
          <div className="npc-name">{p.name}<em>{p.age}岁</em></div>
          <div className="hint">{p.identity}</div>
        </div>
        <div className="npc-score"><b>{p.score}</b><span>{p.scoreLabel || '好感度'}</span></div>
      </div>
      <div className="bar"><i style={{ width: `${p.score}%` }} /></div>
      {p.trust != null ? (
        <div className="rel mt8">
          <span className={p.trust > 50 ? 'pos' : p.trust < 0 ? 'neg' : ''}>信任 {p.trust}</span>
          <span className={(p.open || 0) > 50 ? 'pos' : 'neg'}>公开支持 {p.open}</span>
          <span className={(p.benefit || 0) > 20 ? 'pos' : 'neg'}>利益关联 {p.benefit}</span>
        </div>
      ) : null}
      <div className="hint mb8">性格：{p.personality}<br />{p.notes}</div>
      {p.extra ? <div className="hint mb8">{p.extra}</div> : null}
      {p.memory && p.memory.length ? <div className="box sm mb9">对方记得：{p.memory[0]}</div> : null}
      <div className="npc-act">{p.actions}</div>
    </div>
  )
}

export function People() {
  const game = useGame((s) => s.game)!
  const spouseFn = useGame((s) => s.spouse)
  const childFn = useGame((s) => s.child)
  const birth = useGame((s) => s.birth)
  const date = useGame((s) => s.date)
  const marry = useGame((s) => s.marry)
  const meetMore = useGame((s) => s.meetMore)
  const rel = useGame((s) => s.rel)
  const 向上社交 = useGame((s) => s.向上社交)

  return (
    <Card icon="🕸️" title="人脉 · 感情 · 家庭">
      <div className="sec-title">家庭</div>
      {game.family.配偶 ? (
        <NpcCard
          face={game.family.配偶.面}
          name={game.family.配偶.姓名}
          age={game.family.配偶.年龄}
          identity={game.family.配偶.身份}
          score={game.family.配偶.好感度}
          trust={game.family.配偶.信任}
          open={game.family.配偶.公开}
          benefit={game.family.配偶.利益}
          personality={game.family.配偶.性格}
          notes={game.family.配偶.notes}
          memory={game.family.配偶.memory}
          extra={`月收入：${fmt(game.family.配偶.退休 ? (game.family.配偶.养老金 || 0) : (game.family.配偶.月收入 || 0))} 元${game.family.配偶.退休 ? '（养老金）' : '　职业：' + game.family.配偶.职业}`}
          actions={
            <>
              <button onClick={() => spouseFn('陪伴')}>陪伴家人<br /><small>1 行动</small></button>
              <button onClick={() => spouseFn('吃饭')}>一起吃饭<br /><small>1 行动</small></button>
              <button onClick={() => spouseFn('礼物')}>送礼物<br /><small>1 行动</small></button>
              <button onClick={() => spouseFn('家务')}>分担家务<br /><small>1 行动</small></button>
            </>
          }
        />
      ) : (
        <div className="box">
          婚姻状况：<b>{game.family.婚姻}</b>{game.candidates.length ? '　城市里有几位可以认识的人，见下方「感情」。' : '　这个年纪，已经很少有人再给你介绍对象了。'}
        </div>
      )}

      {game.family.子女.length ? game.family.子女.map((c) => (
        <NpcCard
          key={c.id}
          face={c.性别 === '男' ? '👦' : '👧'}
          name={c.姓名}
          age={c.年龄}
          identity="子女"
          score={c.好感度}
          personality={c.性格}
          notes={c.备注}
          extra={`养育支出：${c.独立 ? '已独立，会补贴家里' : fmt(子女月支出(c) * 12) + ' 元 / 年'}`}
          actions={
            <>
              <button onClick={() => childFn(c.id, '陪伴')}>陪伴孩子<br /><small>1 行动</small></button>
              <button onClick={() => childFn(c.id, '教育')}>过问学业<br /><small>1 行动</small></button>
            </>
          }
        />
      )) : game.family.配偶 ? (
        <>
          {game.family.配偶.好感度 >= 80 ? (
            <button className="btn-line" disabled={game.actions <= 0} onClick={birth}>
              计划要一个孩子<span className="cost">-1 行动</span>
              <small>需配偶未满 42 岁，最多 3 个孩子且间隔 2 年以上</small>
            </button>
          ) : (
            <div className="hint">好感度需 ≥ 80（当前 {game.family.配偶.好感度}）。</div>
          )}
        </>
      ) : null}

      {!game.family.配偶 ? (
        <>
          <div className="sec-title mt14">感情 · 认识与相处</div>
          <div className="hint mb12">约会不耗行动、每项每年一次；表白/结婚各耗 1 行动；好感 ≥ 80 可结婚。</div>
          {game.candidates.map((c) => (
            <NpcCard
              key={c.id}
              face={c.面}
              name={c.姓名}
              age={c.年龄}
              identity={c.身份}
              score={c.好感度}
              personality={c.性格}
              notes={c.notes}
              memory={c.memory}
              extra={c.好感度 >= 80 ? '对方已经在等你开口了。' : undefined}
              actions={
                <>
                  {(game.浪漫方式 && game.浪漫方式.length ? game.浪漫方式 : ['散步', '吃饭', '看电影', '短途旅行']).map((m) => (
                    <button key={m} disabled={c.本年约会?.includes(m)} onClick={() => date(c.id, m)}>
                      {m}<br /><small>{c.本年约会?.includes(m) ? '本年已约' : (约会花费[m] || '')}</small>
                    </button>
                  ))}
                  {c.恋爱中 ? 免费互动.map((f) => (
                    <button key={f.名} disabled={c.本年约会?.includes(f.名)} onClick={() => date(c.id, f.名)}>
                      {f.名}<br /><small>{c.本年约会?.includes(f.名) ? '本年已做' : '不耗行动'}</small>
                    </button>
                  )) : null}
                  <button onClick={() => date(c.id, '表白')}>坦诚表白<br /><small>1 行动 · 好感 ≥ 60</small></button>
                  <button onClick={() => marry(c.id)}>登记结婚<br /><small>1 行动 · 好感 ≥ 80</small></button>
                </>
              }
            />
          ))}
          <button className="btn-line" disabled={game.actions <= 0 || game.candidates.length >= 6} onClick={meetMore}>
            请朋友再介绍两位<span className="cost">-1 行动</span>
            <small>当前 {game.candidates.length} / 6 位可发展对象</small>
          </button>
        </>
      ) : null}

      <div className="sec-title mt14">工作与社会关系</div>
      <div className="hint mb12">每次互动消耗 1 次行动；人脉影响晋升。</div>
      {game.flags['首升换圈'] ? (
        <button className="btn-line" disabled={game.actions <= 0} onClick={向上社交}>
          向上社交 · 结识更高层级的人<span className="cost">-1 行动</span>
          <small>替换掉好感度最低的两位人脉</small>
        </button>
      ) : null}
      {game.npcs.map((n) => (
        <NpcCard
          key={n.id}
          face={n.面}
          name={n.姓名}
          age={n.年龄}
          identity={n.身份}
          score={n.好感度}
          trust={n.信任}
          open={n.公开}
          benefit={n.利益}
          personality={n.性格}
          notes={n.notes}
          memory={n.memory}
          actions={
            <>
              <button onClick={() => rel(n.id, '吃饭')}>私下聚餐<br /><small>1 行动</small></button>
              <button onClick={() => rel(n.id, '汇报')}>汇报工作<br /><small>1 行动</small></button>
              <button onClick={() => rel(n.id, '帮忙')}>请托帮忙<br /><small>1 行动</small></button>
              <button onClick={() => rel(n.id, '送礼')}>送礼走动<br /><small>1 行动</small></button>
            </>
          }
        />
      ))}
    </Card>
  )
}
