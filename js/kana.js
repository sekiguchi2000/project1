// フリックキーボードのデータ定義
// 各キー: center = タップで入力される文字, flicks = フリック方向ごとの文字
// 配置はスマホの標準的なテンキー配列に準拠（3列×4行）

const FLICK_KEYS = [
  // row 0
  { id: 'a',  center: 'あ', flicks: { left: 'い', up: 'う', right: 'え', down: 'お' } },
  { id: 'ka', center: 'か', flicks: { left: 'き', up: 'く', right: 'け', down: 'こ' } },
  { id: 'sa', center: 'さ', flicks: { left: 'し', up: 'す', right: 'せ', down: 'そ' } },
  // row 1
  { id: 'ta', center: 'た', flicks: { left: 'ち', up: 'つ', right: 'て', down: 'と' } },
  { id: 'na', center: 'な', flicks: { left: 'に', up: 'ぬ', right: 'ね', down: 'の' } },
  { id: 'ha', center: 'は', flicks: { left: 'ひ', up: 'ふ', right: 'へ', down: 'ほ' } },
  // row 2
  { id: 'ma', center: 'ま', flicks: { left: 'み', up: 'む', right: 'め', down: 'も' } },
  { id: 'ya', center: 'や', flicks: { up: 'ゆ', down: 'よ' } },
  { id: 'ra', center: 'ら', flicks: { left: 'り', up: 'る', right: 'れ', down: 'ろ' } },
  // row 3
  { id: 'blank', center: '', flicks: {} },
  { id: 'wa', center: 'わ', flicks: { left: 'を', up: 'ん', right: 'ー' } },
  { id: 'mark', center: '、', flicks: { left: '。', up: '？', right: '！' } },
];

// 文字 -> { keyId, direction } の逆引き表（ガイド表示・問題生成に使用）
const CHAR_TO_FLICK = (() => {
  const map = {};
  for (const key of FLICK_KEYS) {
    if (key.center) map[key.center] = { keyId: key.id, direction: 'center' };
    for (const [dir, ch] of Object.entries(key.flicks)) {
      map[ch] = { keyId: key.id, direction: dir };
    }
  }
  return map;
})();

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

// 入力可能な全ひらがな（濁点・小書きを除く基本文字）
const ALL_KANA = Object.values(KANA_GROUPS).flat();

// ことばモード用の単語リスト（このキーボードで入力できる基本ひらがなのみで構成）
const WORDS = [
  'すし', 'みかん', 'さくら', 'ねこ', 'いぬ', 'うみ', 'やま',
  'そら', 'ほし', 'つき', 'はな', 'とり', 'くるま',
  'てかみ', 'おにくり', 'みそしる', 'たまこ',
  'あめ', 'ゆき', 'かせ', 'もり', 'かわ', 'いし', 'はね',
  'ひこうき', 'しんかんせん', 'こうえん',
  'ともたち', 'せんせい', 'おかあさん', 'おとうさん', 'おはよう', 'こんにちは',
  'ありかとう', 'さようなら', 'なつやすみ', 'ふゆやすみ',
  'えほん', 'おんかく', 'うんとうかい', 'たいいくかん',
];
