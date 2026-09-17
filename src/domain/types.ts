export type Sex = '男' | '女'

export type Job = '公务员' | '事业单位' | '国企' | '企业' | '记者' | '教师' | '医生'

export type Edu = '高中/中专' | '大专' | '本科' | '硕士' | '博士'

export type PlatformName = '省级' | '市级' | '区级' | '县级' | '乡镇级'

export type JobStatus = '在职' | '退休' | '死亡'

export type MarriageState = '单身' | '恋爱中' | '已婚' | '离异' | '丧偶'

export type Judgment = '正确' | '模糊' | '错误'

export type EffectKey =
  | '政绩'
  | '能力'
  | '道德'
  | '健康'
  | '人脉'
  | '上司'
  | '声望'
  | '廉政风险'
  | 'cash'
  | '现金'
  | 'flag'

export interface RelationDelta {
  信任?: number
  利益?: number
  公开?: number
  好感度?: number
}

export interface Effect {
  政绩?: number
  能力?: number
  道德?: number
  健康?: number
  人脉?: number
  上司?: number
  声望?: number
  廉政风险?: number
  cash?: number
  现金?: number
  flag?: string
  rel?: Record<string, RelationDelta>
  mem?: Record<string, string>
}

export interface ShixiAnswer {
  判: Judgment
  文: string
  e: Effect
  fb: string
}

export interface ShixiQuestion {
  q: string
  a: ShixiAnswer[]
}

export interface ShixiItem {
  名: string
  desc: string
  e: Effect
  asks: ShixiQuestion[][]
}

export interface Npc {
  id: string
  姓名: string
  身份: string
  年龄: number
  面: string
  层级: string
  信任: number
  利益: number
  公开: number
  好感度: number
  性格: string
  memory: string[]
  notes: string
  非核心?: boolean
}

export interface Candidate {
  id: string
  姓名: string
  性别: Sex
  年龄: number
  职业: string
  身份: string
  类别: string
  月收入: number
  性格: string
  好感度: number
  面: string
  memory: string[]
  notes: string
}

export interface Spouse {
  id: string
  姓名: string
  年龄: number
  身份: string
  职业: string
  类别: string
  月收入: number
  养老金: number
  退休: boolean
  性格: string
  好感度: number
  面: string
  信任: number
  公开: number
  利益: number
  memory: string[]
  notes: string
  额外?: string
}

export interface Child {
  id: string
  姓名: string
  性别: Sex
  年龄: number
  好感度: number
  性格: string
  备注: string
  考上大学?: boolean
  独立?: boolean
}

export interface PositionRecord {
  年: number
  职级: string
  岗位: string
  条线?: string
  挂职?: boolean
}

export interface Threshold {
  政绩: number
  能力: number
  道德: number
  上司: number
}

export interface RankDef {
  名: string
  月薪: number
  最低年: number
  门槛: Threshold
  例?: string[]
}

export interface AdvicePosition {
  名: string
  sc: number
  高配: boolean
  党政: boolean
  二线: boolean
  实权: boolean
  平台: string
  级别: string
  条线: string
  理由: string[]
}

export interface HouseAsset {
  名: string
  面积?: number
  购入价?: number
  购入年?: number
  市值?: number
  自住?: boolean
  贷款?: boolean
}

export interface CarAsset {
  名: string
  总价?: number
  购入年?: number
  市值?: number
}

export interface Loan {
  名: string
  类型: '房' | '车'
  余额: number
  月供: number
  利率: number
  总月: number
  已还: number
  年: number
}

export interface StudyRecord {
  名: string
  至: Edu
  年: number
  剩: number
  已付: number
  总费: number
  效: Effect
}

export interface CaseRecord {
  年: number
  事由: string
  金额: number
}

export interface DisciplineState {
  risk: number
  level: string
  records: string[]
  案件: CaseRecord[]
  影响期?: number
  移送?: boolean
  已查金额?: number
}

export interface CityState {
  财政收入: number
  就业: number
  房地产: number
  产业: number
  公共服务: number
  交通: number
  舆论: number
  矛盾: number
}

export interface LogEntry {
  t: string
  h: string
  d: string
  kind?: string
}

export interface YearSummary {
  年: number
  年龄: number
  职务: string
  状态: JobStatus
  明细: string
  收入: number
  支出: number
  租金: number
  养车: number
  结余: number
  职务变化: string
  职级变化: string
  施政数: number
  记录: LogEntry[]
  事件: string[]
  施政评价: { 正确: number; 模糊: number; 失当: number }
  下一年: string
}

export interface QuizState {
  item: number
  tier: number
  variant: number
  order: number[]
}

export interface GameEventOption {
  text: string
  hint?: string
  kind?: string
  resolve: (g: GameState) => string
}

export interface GameEvent {
  类型: string
  标题: string
  描述: string
  背景?: string
  月?: number
  选项: GameEventOption[]
}

export interface Player {
  姓名: string
  性别: Sex
  年龄: number
  出生地: string
  城市: string
  家庭背景: string
  平台: PlatformName
  平台顶: number
  学历: Edu
  专业: string
  专业匹配度: number
  职业: Job
  单位: string
  选调生: boolean
  政治面貌: string
  目标: string
  能力: number
  道德: number
  健康: number
  人脉: number
  上司: number
  声望: number
  挂职?: { 层级: string; 单位: string; 结束年: number } | null
  上调次数?: number
}

export interface CareerState {
  处分: number
  嘉奖: number
  任职年: number
  职级年: number
  初次晋升: boolean
  连续模糊: number
  累计模糊: number
}

export interface FamilyState {
  婚姻: MarriageState
  配偶: Spouse | null
  子女: Child[]
  上次生育年?: number
}

export interface Snapshot {
  政绩: number
  能力: number
  道德: number
  健康: number
  人脉: number
  上司: number
  声望: number
  现金: number
  风险: number
  职级: number
  职务: number
}

export interface GameState {
  version: number
  p: Player
  p2: CareerState
  status: JobStatus
  rankIdx: number
  zhijiIdx: number
  positions: PositionRecord[]
  zhengji: number
  cash: number
  housing: string
  assets: { 房产: HouseAsset[]; 车辆: CarAsset[]; 投资: string[] }
  market: { 房价: number }
  loans: Loan[]
  负债: number
  fund: number
  edu: { 在读: StudyRecord | null; 证书: string[] }
  income: { 月工资: number; 其他: number }
  date: { y: number }
  beginYear: number
  endYear: number
  actions: number
  actionsMax: number
  usedThisYear: number[]
  shixiOrder: number[]
  quiz: QuizState | null
  family: FamilyState
  candidates: Candidate[]
  discipline: DisciplineState
  riskSnapshot: number
  city: CityState
  npcs: Npc[]
  log: LogEntry[]
  flags: Record<string, boolean>
  over: boolean
  pension?: number
  yearSummary?: YearSummary | null
  _年初快照?: Snapshot | null
  _晋升消耗?: number
  _本年事件?: string[]
  _候选年数?: number
  pendingEvent: GameEvent | null
  pendingPositions: AdvicePosition[] | null
  pendingPosTitle: string
  yearLog: LogEntry[]
}

export type TabId = '事件' | '施政' | '城建' | '人脉' | '进修' | '资产' | '廉政' | '档案' | '健康'
