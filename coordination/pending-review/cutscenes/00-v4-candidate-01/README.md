# 00 v4 combined candidate 01

狀態：**SUPERSEDED BY STORY REVISION**。2026-09-28 使用者把 00-A 改為雅琳在予安桌上放資料夾、00-B 改為空手雅琳與雨澄擦身而過；本候選的 00-A／B 已不符合分鏡。整支檔案只保留作歷史紀錄，不得部署、重剪或挪作新版素材。

> 本候選的三支來源早於 `property/runway-video-spec-v2-review.md` v2.1 的量化攝影機契約。使用者已指出原 prompts 未充分寫明移動／zoom 速度；本檔保留作比較，不代表通過新版攝影機驗收，也不因此自動重跑。

## 來源與順序

| 順序 | 檔案 | Runway task | 實際長度 | SHA-256 |
| ---: | --- | --- | ---: | --- |
| 1 | `00-A.mp4` | `95681111-cc58-41aa-b906-00536f26a050` | 2.04s | `ca8f4951e651660bbf6d5622a3d365062f37d164dbcdc181536432da1ae2da6c` |
| 2 | `00-B.mp4` | `a4ab6894-051c-4c1f-9a24-6fa36dccc70e` | 2.04s | `8b57d0ea3d64c8a2b42622fe9bcbe111fc407b4ca76f411f85d67064744584ef` |
| 3 | `00-C.mp4` | `9ca8cf3c-b63e-4cd9-a155-d19d96f243dd` | 2.04s | `45b534c435fcb36fc71fd1f78a21641831e5f80dac465acf81fbc401bc559b12` |

合併順序保存在 [`concat.txt`](concat.txt)。三段都由既有完成影片分頁匯出；本次沒有呼叫 Runway，也沒有生成、重試或建立變體。

## 合併輸出

- 檔案：[`00-v4-candidate-01.mp4`](00-v4-candidate-01.mp4)
- 長度：6.13s（147 frames）
- 規格：1280×720、24fps、H.264 High、yuv420p、無音訊
- 剪接：A → B → C 直接硬切；無轉場、無補幀、無重新編碼
- SHA-256：`f16c2b662e5bb3d72a7c0d1ff6456e3849e8653c61706a7ecc7e88da444d5d8c`

使用者親自確認前，不得改名為正式檔、移入 `public/assets/cutscenes/`、接 runtime、重新剪輯或重送任何來源鏡頭。
