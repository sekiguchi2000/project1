// ============================================================
// フリック入力データ & 入力判定ロジック
// ============================================================

// 12キーのフリック配列（スマホ標準のテンキー準拠）
// isModifier: 直前の文字を 濁点→半濁点→小書き と変換する特殊キー
const FLICK_KEYS = [
  { id: 'a',  center: 'あ', flicks: { left: 'い', up: 'う', right: 'え', down: 'お' } },
  { id: 'ka', center: 'か', flicks: { left: 'き', up: 'く', right: 'け', down: 'こ' } },
  { id: 'sa', center: 'さ', flicks: { left: 'し', up: 'す', right: 'せ', down: 'そ' } },
  { id: 'ta', center: 'た', flicks: { left: 'ち', up: 'つ', right: 'て', down: 'と' } },
  { id: 'na', center: 'な', flicks: { left: 'に', up: 'ぬ', right: 'ね', down: 'の' } },
  { id: 'ha', center: 'は', flicks: { left: 'ひ', up: 'ふ', right: 'へ', down: 'ほ' } },
  { id: 'ma', center: 'ま', flicks: { left: 'み', up: 'む', right: 'め', down: 'も' } },
  { id: 'ya', center: 'や', flicks: { up: 'ゆ', down: 'よ' } },
  { id: 'ra', center: 'ら', flicks: { left: 'り', up: 'る', right: 'れ', down: 'ろ' } },
  { id: 'mod', center: '小゛゜', flicks: {}, isModifier: true },
  { id: 'wa', center: 'わ', flicks: { left: 'を', up: 'ん', right: 'ー' } },
  { id: 'mark', center: '、', flicks: { left: '。', up: '？', right: '！' } },
];

// 「小゛゜」キーで巡回する変換列。base -> [変換1, 変換2, ...]
// （baseを含めて先頭に戻るループ。例: は→ば→ぱ→は）
const FLICK_CYCLE = {
  'あ': ['ぁ'], 'い': ['ぃ'], 'う': ['ぅ'], 'え': ['ぇ'], 'お': ['ぉ'],
  'か': ['が'], 'き': ['ぎ'], 'く': ['ぐ'], 'け': ['げ'], 'こ': ['ご'],
  'さ': ['ざ'], 'し': ['じ'], 'す': ['ず'], 'せ': ['ぜ'], 'そ': ['ぞ'],
  'た': ['だ'], 'ち': ['ぢ'], 'つ': ['づ', 'っ'], 'て': ['で'], 'と': ['ど'],
  'は': ['ば', 'ぱ'], 'ひ': ['び', 'ぴ'], 'ふ': ['ぶ', 'ぷ'], 'へ': ['べ', 'ぺ'], 'ほ': ['ぼ', 'ぽ'],
  'や': ['ゃ'], 'ゆ': ['ゅ'], 'よ': ['ょ'],
  'わ': ['ゎ'],
};

// base -> [base, ...変換列] の完全な巡回シーケンス
const FLICK_SEQ = {};
// 任意の文字 -> そのbase
const FORM_TO_BASE = {};
for (const [base, forms] of Object.entries(FLICK_CYCLE)) {
  FLICK_SEQ[base] = [base, ...forms];
  for (const ch of FLICK_SEQ[base]) FORM_TO_BASE[ch] = base;
}

// 「小゛゜」キーを押したときの次の形。変換できない文字はそのまま返す。
function nextForm(ch) {
  const base = FORM_TO_BASE[ch];
  if (!base) return ch;
  const seq = FLICK_SEQ[base];
  return seq[(seq.indexOf(ch) + 1) % seq.length];
}

// 文字 -> { keyId, direction }（フリックの基本入力。baseのみ収録）
const CHAR_TO_FLICK = (() => {
  const map = {};
  for (const key of FLICK_KEYS) {
    if (key.center && !key.isModifier) map[key.center] = { keyId: key.id, direction: 'center' };
    for (const [dir, ch] of Object.entries(key.flicks)) {
      map[ch] = { keyId: key.id, direction: dir };
    }
  }
  return map;
})();

// 学習ガイド用: 目的の文字を打つためのキー・方向・「小゛゜」を押す回数
function flickGuideFor(char) {
  const base = FORM_TO_BASE[char];
  if (base && base !== char) {
    const info = CHAR_TO_FLICK[base];
    if (!info) return null;
    return { keyId: info.keyId, direction: info.direction, mods: FLICK_SEQ[base].indexOf(char) };
  }
  const info = CHAR_TO_FLICK[char];
  return info ? { keyId: info.keyId, direction: info.direction, mods: 0 } : null;
}

// ------------------------------------------------------------
// 1文字ぶんの入力判定。フリックの基本文字と「小゛゜」を受けて
// 'correct'（確定）/ 'pending'（変換待ち）/ 'wrong'（ミス）を返す。
// ------------------------------------------------------------
class CharMatcher {
  constructor(expected) {
    this.expected = expected;
    this.current = null; // 今キーから入った文字（変換途中を含む）
  }
  feedChar(ch) {
    this.current = ch;
    if (ch === this.expected) return 'correct';
    // expected が ch の濁点/小書き変化で到達できるなら変換待ち
    if (FLICK_SEQ[ch] && FLICK_SEQ[ch].includes(this.expected)) return 'pending';
    return 'wrong';
  }
  feedMod() {
    if (this.current == null) return 'wrong';
    this.current = nextForm(this.current);
    return this.current === this.expected ? 'correct' : 'pending';
  }
}

// ============================================================
// 練習用データ
// ============================================================

// 行（あ行・か行…）ごとのグループ。基礎練習モードで使用。
const KANA_GROUPS = {
  a:  ['あ', 'い', 'う', 'え', 'お'],
  ka: ['か', 'き', 'く', 'け', 'こ'],
  sa: ['さ', 'し', 'す', 'せ', 'そ'],
  ta: ['た', 'ち', 'つ', 'て', 'と'],
  na: ['な', 'に', 'ぬ', 'ね', 'の'],
  ha: ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ma: ['ま', 'み', 'む', 'め', 'も'],
  ya: ['や', 'ゆ', 'よ'],
  ra: ['ら', 'り', 'る', 'れ', 'ろ'],
  wa: ['わ', 'を', 'ん', 'ー'],
};
const GROUP_LABELS = {
  a: 'あ行', ka: 'か行', sa: 'さ行', ta: 'た行', na: 'な行',
  ha: 'は行', ma: 'ま行', ya: 'や行', ra: 'ら行', wa: 'わ行',
};
const ALL_KANA = Object.values(KANA_GROUPS).flat();

// 難易度別の単語プール（濁点・小書きにも対応したので自然な語が使える）
const WORD_POOLS = {
  easy: [
    'すし', 'ねこ', 'いぬ', 'うみ', 'やま', 'そら', 'ほし', 'つき', 'はな',
    'とり', 'くるま', 'りんご', 'みかん', 'さくら', 'あめ', 'ゆき', 'かぜ',
    'もり', 'かわ', 'いし', 'はね', 'たまご', 'えほん', 'みず', 'ひので',
  ],
  normal: [
    'でんしゃ', 'ひこうき', 'こうえん', 'がっこう', 'せんせい', 'ともだち',
    'おにぎり', 'みそしる', 'てがみ', 'えんぴつ', 'おんがく', 'きょうしつ',
    'たんじょうび', 'なつやすみ', 'ふゆやすみ', 'おかあさん', 'おとうさん',
    'からあげ', 'やきにく', 'のみもの', 'たべもの', 'どうぶつ', 'しんぶん',
  ],
  hard: [
    'しんかんせん', 'うんどうかい', 'たいいくかん', 'としょかん', 'びじゅつかん',
    'おもちゃばこ', 'きゃくせき', 'しゅくだい', 'りょこう', 'びょういん',
    'でんわばんごう', 'こうつうあんぜん', 'ちょきんばこ', 'じてんしゃ',
    'ぎゅうにゅう', 'りょうり', 'きゅうしょく', 'ぱそこん', 'ちきゅう', 'しゃしん',
  ],
};
const WORDS = [...WORD_POOLS.easy, ...WORD_POOLS.normal]; // 旧ことばモード用
