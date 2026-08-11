# ABAI 祕法對決

五色魔力的卡牌對決，戰場是一張用 three.js 畫出來的 3D 牌桌。整個遊戲——程式、樣式、字型、卡面、場景——會被打包成**一個 `.html` 檔**，開啟後不會發出任何一個網路請求。這個限制就是這個專案的規格：這個檔案要能從下載資料夾直接打開，在飛機上打開，被瀏覽器改名兩次之後打開，而且仍然是完整的遊戲。

---

## 快速開始

```bash
npm install        # 安裝相依套件
npm run dev        # 開發用伺服器，有熱更新，http://localhost:3000
npm run build      # 打包成 dist-single/index.html —— 這就是要發布的遊戲
```

其他指令：

| 指令 | 做什麼 |
| --- | --- |
| `npm run build` | 打包成單一檔案 `dist-single/index.html`（要發布的就是這個） |
| `npm run build:tuner` | 打包遊戲，再把它烤進教學排版工具 `dist-single/tutorial-tuner.html` |
| `npm run build:hook` | 打包**測試專用**版本到 `dist-hook/`，多了讓測試讀取遊戲狀態的窗口，**絕對不能發布** |
| `npm run typecheck` | TypeScript 檢查 |
| `npm test` | 跑 `tests/` 底下所有檢查（會自動先做 hook build） |
| `npm run clean` | 清掉所有 build 產物 |

## 建置產物放哪裡

`dist/`、`dist-single/`、`dist-hook/` 全部都在 `.gitignore` 裡，**不進版控**。原因很簡單：1.2 MB 的產生檔一旦被 commit，`src/` 一改它就過期了，然後「遊戲到底是什麼行為」就有兩個互相矛盾的答案。

每次 push，GitHub Actions（`.github/workflows/build.yml`）會自動：

1. 型別檢查 + 打包
2. 把 `index.html` 當成 artifact 附在該次 run 上（在 Actions 頁面可以直接下載）
3. 如果是主分支，發布到 GitHub Pages —— 也就是有一個可以直接遊玩的網址

> **第一次要先開啟 Pages**：Repo → Settings → Pages → Source 選 **GitHub Actions**。開完之後推一次就會有網址。

---

## 檔案要放哪裡

如果我傳檔案給你，就照下面這張表放。路徑就是它在專案裡的位置，直接覆蓋同名檔案即可。

| 收到的檔案 | 放到 | 是什麼 |
| --- | --- | --- |
| `Coach.tsx` | `src/ui/` | 教學課程：腳本、指示框位置、虛線 |
| `Battle.tsx` | `src/ui/` | 對戰畫面：手牌、按鈕、教學的舞台安排 |
| `BattleCanvas.tsx` | `src/components/` | 3D 牌桌本體（three.js 場景、鏡頭、互動） |
| `Home.tsx` `DeckSelect.tsx` `DeckBuilder.tsx` `PackOpening.tsx` … | `src/ui/` | 其他各個畫面 |
| `index.css` | `src/` | 全部的樣式（含手機版與教學排版） |
| `colourless.ts` `houseCards.ts` `lands.ts` `expansion.ts` … | `src/game/` | 卡表與卡牌資料 |
| `engine.js` `house.ts` `types.ts` | `src/game/` | 規則引擎 |
| `cardFace.ts` `cardVisuals.ts` `borderFx.ts` … | `src/render/` | 卡面繪製 |
| `tutorial-tuner.html` | `tools/` | 教學排版工具的模板（不是成品） |
| `build-tuner.mjs` `build-hook.mjs` | `tools/` | 建置腳本 |
| `*.test.mjs` `harness.mjs` `run.mjs` | `tests/` | 自動檢查 |
| `package.json` `tsconfig.json` `vite.config.ts` `vite.single.config.ts` `index.html` | 根目錄 | 專案設定與 Vite 進入點 |

放完之後 `git add -A && git commit && git push`，CI 會重新打包出新的可玩檔案。

---

## 專案結構

```
.
├── .github/workflows/build.yml   CI：檢查、打包、發布到 Pages
├── index.html                    Vite 進入點（meta viewport、安全區、標題）
├── vite.config.ts                開發用設定
├── vite.single.config.ts         單檔打包設定（發布用）
├── docs/
│   └── ARCHITECTURE.md           每個檔案負責什麼
├── tools/
│   ├── build-hook.mjs            測試用建置
│   ├── build-tuner.mjs           把遊戲烤進排版工具
│   └── tutorial-tuner.html       排版工具模板
├── tests/                        Playwright 檢查（離線、視窗、教學排版）
└── src/
    ├── main.tsx  App.tsx         啟動與畫面切換
    ├── index.css                 全部樣式
    ├── components/BattleCanvas.tsx   3D 牌桌
    ├── ui/                       各個畫面與教學
    ├── game/                     規則引擎與卡表
    ├── render/                   卡面繪製
    └── net/                      本機對手
```

細節見 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)。

---

## 幾件不要弄壞的事

- **不要在程式裡引用外部網址**（CDN、字型、圖片）。單檔離線是規格，`tests/offline.test.mjs` 會擋。
- **不要 commit 建置產物**。CI 會做。
- **`dist-hook/` 不能發布**。它把遊戲狀態開放給頁面上任何東西，只給測試用。
- **手機/桌機的判斷看的是指標裝置，不是寬度**（`src/ui/device.ts`）。用視窗寬度判斷會讓小視窗的桌機變成手機介面。
- **教學的指示框位置是量出來的，不是寫死的**（`src/ui/Coach.tsx`）。要改位置，用 `npm run build:tuner` 出來的排版工具。
