import type { ReactNode } from 'react'
import { useGame } from '../../store/gameStore'
import { Card } from '../components/Card'
import { 子女月支出 } from '../../domain/economy'
import { fmt } from '../../utils/format'

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
          <div className="box">你们还没有孩子。生育会增加家庭开支，而养育成本会随孩子长大逐年上升。</div>
          <button className="btn-line" disabled={game.actions <= 0} onClick={birth}>
            计划要一个孩子<span className="cost">-1 行动</span>
            <small>需配偶好感度 ≥ 50、配偶未满 42 岁，最多 3 个孩子且间隔 2 年以上</small>
          </button>
        </>
      ) : null}

      {!game.family.配偶 ? (
        <>
          <div className="sec-title mt14">感情 · 认识与相处</div>
          <div className="hint mb12">好感度达到 80 即可登记结婚。婚后若长期疏于陪伴，关系同样会变冷。</div>
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
                  <button onClick={() => date(c.id, '逛街')}>逛街散步<br /><small>1 行动·300元</small></button>
                  <button onClick={() => date(c.id, '电影')}>看电影<br /><small>1 行动·200元</small></button>
                  <button onClick={() => date(c.id, '吃饭')}>一起吃饭<br /><small>1 行动·500元</small></button>
                  <button onClick={() => date(c.id, '旅行')}>短途旅行<br /><small>1 行动·3000元</small></button>
                  <button onClick={() => date(c.id, '礼物')}>送礼物<br /><small>1 行动·1000元起</small></button>
                  <button onClick={() => date(c.id, '表白')}>坦诚表白<br /><small>需好感度 ≥ 60</small></button>
                  <button onClick={() => marry(c.id)}>登记结婚<br /><small>需好感度 ≥ 80</small></button>
                </>
              }
            />
          ))}
          <button className="btn-line" disabled={game.actions <= 0} onClick={meetMore}>
            请朋友再介绍几位<span className="cost">-1 行动</span>
            <small>重新认识 3 位可以相处的人，原有关系会保留</small>
          </button>
        </>
      ) : null}

      <div className="sec-title mt14">工作与社会关系</div>
      <div className="hint mb12">人脉是晋升中分量最重的一项。每次互动消耗 1 次行动。</div>
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
