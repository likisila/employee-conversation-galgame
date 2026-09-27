# v4 關鍵影格審查入口

狀態：**停止生成，等待使用者審查。** 這是目前唯一用來檢查 v4 分鏡的關鍵影格入口。

- [`active/`](active/)：v4 暫留 00、04、06 的 7 張現役候選；所有生成與審查一律從這裡選圖。
- [`retired/README.md`](retired/README.md)：18 張退役／被取代影格的逐檔狀態、原路徑與原因。
- `runway-v2/`、`runway-v3/`：舊路徑相容來源池，不再代表影格狀態。暫時保留是因現行 runtime storyboard manifest 尚指向它們。

## 現役檔名

| 檔名 | 段落 | 原始來源 | 狀態 |
| --- | --- | --- | --- |
| `active/00-A.png` | 00 | `runway-v2/00-A.png` | ACTIVE REVIEW |
| `active/00-B.png` | 00 | `runway-v3/00-B-v3.png` | ACTIVE REVIEW；統一檔名移除版本尾碼 |
| `active/00-C.png` | 00 | `runway-v2/00-C.png` | ACTIVE REVIEW |
| `active/04-B.png` | 04 | `runway-v2/04-B.png` | ACTIVE REVIEW |
| `active/04-C.png` | 04 | `runway-v2/04-C.png` | ACTIVE REVIEW |
| `active/06-B.png` | 06 | `runway-v3/06-B.png` | ACTIVE REVIEW |
| `active/06-C.png` | 06 | `runway-v3/06-C.png` | ACTIVE REVIEW |

這 7 張是逐位元相同的相容副本，不是重生成或重畫。使用者核准 v4、Claude 更新 runtime／optimizer／manifest 路徑後，才可刪除舊來源中的重複檔。

## 預覽

### 00

![00-A](active/00-A.png)
![00-B](active/00-B.png)
![00-C](active/00-C.png)

### 04

![04-B](active/04-B.png)
![04-C](active/04-C.png)

### 06

![06-B](active/06-B.png)
![06-C](active/06-C.png)
