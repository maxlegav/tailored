export type Mistake = {
  id: string; fen: string; san: string; uci: string; best: string; best_san: string; good: string[]
  loss: number; sev: string; phase: string; clk?: number; tags: string[]; text: string; url: string; date: number
  color: 'white' | 'black'; move_no: number; wp_before: number; wp_after: number; findable?: boolean
  p_best_human?: number; best_pv: string[]; refutation_san: string
  kind?: 'habitude' | 'comprehension' | 'accident' | 'zeitnot'; goal?: string
}
export type RepNode = { fen: string; total: number; moves: Record<string, { n: number; score: number; loss: number }>; main: string; engine?: string; verdict?: string }
export type Opening = { id: string; color: 'white' | 'black'; title: string; stats: string; yours: string; rec: string; why: string; plan: string[]; line: string; line_title: string; line_text: string; line_eval?: number
  ideas: { kind: string; title: string; line: string; text: string; eval?: number }[] }
export type Line = { fen: string; line: string; n: number; score: number }
export type Game = { url: string; date: number; color: string; score: number; opp: string; opp_elo: number; elo: number; opening: string; n_mistakes: number; worst?: string }
export type Lesson = { id: string; title: string; tag?: string; body: string; mistakes?: string[] }
export type Data = {
  generated: number; user: string; time_class: string; n_games: number
  color: Record<string, { n: number; score: number }>
  conversion: { winning: number; won: number }
  phase: Record<string, { moves: number; avg_loss: number; serious: number; per100: number }>
  clock: Record<string, { moves: number; avg_loss: number }>
  tags: { tag: string; label: string; n: number; loss: number; core_n?: number; core_loss?: number }[]
  kinds?: Record<string, { n: number; loss: number }>
  openings?: Opening[]
  habits?: { san: string; n: number; ids: string[] }[]
  findable: { serious: number; findable: number }
  repertoire: RepNode[]; trouble: Line[]; comfort: Line[]; mistakes: Mistake[]; games: Game[]
  lessons?: Lesson[]
}
