# 架構

一句話：**規則是純資料的狀態機，畫面是它的投影，教學是坐在旁邊的第三者。** 三層之間只往一個方向講話。

```
   game/engine.js          規則。不知道有畫面這回事。
        ↓ state
   ui/Battle.tsx           把狀態變成一場對戰的介面，並派發動作回去
        ↓ props
   components/BattleCanvas 把狀態畫成一張 3D 牌桌
        ↕
   ui/Coach.tsx            教學：讀狀態、量畫面、指出該看哪裡
```

---

## `src/game/` —— 規則

| 檔案 | 負責 |
| --- | --- |
| `engine.js` | 整套規則：階段、優先權、堆疊、戰鬥、關鍵字、AI。純函式 + reducer，沒有任何 DOM。 |
| `engine.d.ts` | 上面那個的型別介面。 |
| `types.ts` | 卡牌、區域、狀態的型別。 |
| `content.ts` | 基礎卡表。 |
| `expansion.ts` `houseCards.ts` `colourless.ts` `lands.ts` | 擴充卡、自製卡、無色卡、地牌。 |
| `house.ts` `houseKeywords.ts` | 自製規則層：在引擎之上改寫或補上效果。 |
| `tutorialDecks.ts` | 教學專用牌組——每一課要示範什麼，就得確定那張牌會在手上。 |
| `lore.ts` | 卡牌敘述與世界觀文字。 |
| `audio.ts` | 全部用 WebAudio 合成，沒有音檔（單檔限制）。 |

引擎不 import 任何 UI。這是硬規則：規則能不開瀏覽器就測。

## `src/components/BattleCanvas.tsx`

three.js 場景的全部：牌桌、柱子、燈、骰子、牌堆、手牌的排布、拖曳、點擊命中判定、卡牌進場動畫、鏡頭。約 5,700 行，是專案裡最大的單一檔案。

它只接受 props 並回報事件，不碰規則。`renderer.setSize` 會把畫布尺寸寫進 style，所以視窗大小改變時要重新量——`visualViewport` 是行動裝置上唯一可靠的訊號。

## `src/ui/` —— 畫面

| 檔案 | 負責 |
| --- | --- |
| `Battle.tsx` | 對戰畫面的外殼：手牌、按鈕、提示、目標選擇、教學的舞台安排。 |
| `Coach.tsx` | 教學。腳本 `STEPS`、章節、指示框的位置計算、虛線動畫、結束動畫。 |
| `Home.tsx` `DeckSelect.tsx` `DeckBuilder.tsx` `PackOpening.tsx` `Matchmaking.tsx` `CoinFlip.tsx` `PickStrip.tsx` | 其他畫面。 |
| `FxLayer.tsx` `TargetLines.tsx` `EffectPreview.tsx` | 特效層、瞄準線、卡牌效果預覽。 |
| `device.ts` | 手機／桌機的判斷。**看指標裝置，不看寬度**——在 `<html>` 上寫 `data-touch` / `data-compact` / `data-portrait`。 |
| `RotateGate.tsx` | 直立時請使用者轉橫。 |
| `tuner.ts` | 教學排版工具的橋接。只有網址帶 `?tune=` 或 frame 名稱對得上時才會活起來。 |

## `src/render/` —— 卡面

`cardFace.ts` 把一張卡畫成 canvas 材質（邊框、法術力符號、規則文字、攻防），`cardVisuals.ts` 產生卡圖，`borderFx.ts` 是稀有度的邊框效果，`CardFx.tsx` 是那些效果在 DOM 裡的預覽。全部程式生成，沒有一張圖片檔。

## `src/index.css`

4,200 行，一份。分成三段：桌機的樣式、`html[data-touch]` 底下的手機樣式、以及教學那一整塊。手機的規則永遠寫在 `html[data-touch]` 裡，不用 media query 的寬度。

安全區（瀏海）用 `env(safe-area-inset-*)`；教學的指示框同時讀 `--coach-left/right`，那是排版工具用來假裝有瀏海的。兩者用 `max()` 併起來，所以真機上不會被工具的 0 蓋掉。

---

## 教學是怎麼運作的

`Coach.tsx` 裡的 `STEPS` 是一份腳本，每一步可以宣告：

- `chapter` —— 章節。**指示框的位置是以章節為單位決定的**，一個章節裡不會移動。
- `focus` —— 這一步要打亮哪些東西（其餘變暗）。空的就不變暗。
- `wait` / `task` / `hold` —— 要等玩家做完某件事才能繼續，還是按「繼續」。
- `card` / `spot` / `gallery` —— 舉起一張牌並框出某個部位，或攤出六種牌。
- `pin` —— 少數需要指定角落的章節（例如舉牌那一課固定貼左緣）。

位置的決定：章節一開始時量一次畫面，在六個位置（四角、上中、左中）裡挑一個離主角最遠、又不壓到任何東西的。挑完就固定。虛線一律從那個位置的固定一點出發，所以同一章節裡線的起點不會跳。

要調整位置和文字，`npm run build:tuner` 會產生一個把遊戲烤在裡面的單檔工具，可以同時看手機與桌機、一步一步走、拖曳調整，最後複製一段設定回來。

## 測試

`tests/` 用 Playwright 驅動 `dist-hook/` 那份 build（多了 `window.__battle` 這類窗口，讓檢查能直接問「現在誰的回合」而不是去猜像素）。軟體渲染下大約每秒 0.3 幀，所以**任何檢查都不能依賴時間或像素**——只讀 DOM、量矩形、問狀態。

- `offline.test.mjs` —— 發布版不得有任何外部請求，也不得含有測試窗口。
- `viewport.test.mjs` —— 視窗變高時 3D 畫布仍然蓋滿（行動版下方黑條）。
- `tutorial-layout.test.mjs` —— 舉牌那一課：卡在正中、指示框貼左緣垂直置中、不重疊、圖層順序、費用框大小。
- `tutorial-safe-area.test.mjs` —— 每一章的指示框都避開兩側瀏海、不壓主角、章節內不移動。
- `tutorial-first-time.test.mjs` —— 教防守之前對手不曾攻擊、教反擊之前對手不曾施法。
