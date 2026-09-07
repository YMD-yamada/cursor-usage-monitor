/**
 * In-app help: launch paths, widget controls, tab map (Japanese).
 */
export function buildUsageHelp() {
  const desktopApps = [
    process.env.USERPROFILE,
    'OneDrive',
    'Desktop',
    '自作アプリ',
  ].filter(Boolean)
  const desktopPath = desktopApps.join('\\')

  return {
    headline: '起動と操作（このPC）',
    launch: [
      {
        label: 'スタート検索',
        detail: '「Usageboard for Cursor」または「Usageboard」と入力 → Enter',
        note: 'ログイン時自動起動も有効（ウィジェット下部のチェック）',
      },
      {
        label: 'デスクトップ「自作アプリ」',
        detail: 'cursor-usage-monitor.lnk → 常駐ウィジェットを起動',
        note: 'フォルダを開く場合は cursor-usage-monitor-folder.lnk',
      },
      {
        label: '初回・再インストール',
        detail: 'Projects\\cursor-usage-monitor で npm run install:resident',
        note: 'ショートカットと自動起動を再登録します',
      },
    ],
    widget: [
      { action: '表示を変える', how: 'ヘッダーの ≡ メニュー。見たい項目のチェックを切替' },
      { action: 'くわしく', how: '同じメニューの「くわしく」からモデル・運用・課金・グラフ・起動方法' },
      { action: '移動', how: 'ヘッダー左（Usageboard）をドラッグ' },
      { action: '右端に固定', how: 'ヘッダーの □ ボタン' },
      { action: '一時的に隠す', how: '× → タスクトレイに常駐（終了ではない）' },
      { action: '完全終了', how: '右下「終了」、またはトレイ右クリック → 終了' },
    ],
    tabs: [
      { id: 'home', label: '1画面', body: '使用量（リセット日・残り・使い切り目安）・PC・セッション・グラフ。メニューで出し分け' },
      { id: 'models', label: 'モデル', body: 'メニュー「くわしく」→ モデルの選び方' },
      { id: 'ops', label: '運用', body: 'メニュー「くわしく」→ 運用・設定' },
      { id: 'billing', label: '課金', body: 'メニュー「くわしく」→ 課金のしくみ' },
    ],
    desktopFolder: desktopPath,
    troubleshoot: [
      'ショートカットを押して PowerShell だけ出る → work-ops-hub の Install-AppShortcuts.ps1 を再実行（Arguments 欠落の修復済み）',
      'ウィジェットが見えない → スタート検索で Usageboard for Cursor、またはトレイアイコンをクリック',
      '使用量が 0% のまま → Cursor でサインインし、Cursor を一度起動してから「再取得」',
    ],
  }
}
