import { describe, expect, it } from 'vitest';
import { loadContent } from '../src/data/contentLoader';
import { StoryEngine } from '../src/engine/StoryEngine';

/**
 * property/dialogue-beat-revisions-20260926.md（六處分拍）與
 * property/narrative-integration-revision-20260926.md（曾雅琳角色弧）的整合驗收。
 * 感情線微選擇本身的驗收在 tests/romanceMicrochoices.test.ts。
 */

function texts(sceneId: string): string[] {
  const content = loadContent();
  return content.scenes.get(sceneId)!.lines.map((line) => line.text);
}

describe('對話分拍：六處長段落各自拆成兩個連續項目', () => {
  it('s1-final-cut：正式 00 過場已承接視線轉移與文件標題揭露，文字不再重複演出', () => {
    // property/dialogue-beat-revisions-20260926.md 的原分拍已被 2026-09-28 接入的正式
    // 00_final_documents.mp4 取代：影片已經演完「雅琳舉起資料夾 → 予安點頭 → 雅琳放下資料夾」，
    // 文字改從資料夾已在桌上、雨澄仍盯著螢幕開始（見 ChatGPT-20260928-0833）。
    const lines = texts('s1-final-cut');
    expect(lines).toContain('16:40。藍色資料夾已經躺在我桌上。雨澄仍盯著螢幕，像剛才什麼也沒發生。');
    expect(lines).toContain('封面印著：「離職與權益說明——林雨澄」。');
    expect(lines).toContain('「離職」兩字是公司範本，「職位裁撤」是雅琳用黑筆補在旁邊的。');
    // 影片已承擔的動作不應在文字裡重演。
    expect(lines).not.toContain('我抬頭。雅琳站在兩排辦公桌外，舉了一下手裡的藍色資料夾。');
    expect(lines).not.toContain('我看了看雨澄的座位，朝雅琳點頭。');
    expect(lines).not.toContain('她把資料夾放下，封面印著：「離職與權益說明——林雨澄」。');
  });

  it('s3-meeting：封閉感與荒謬陳設分開兩拍', () => {
    const lines = texts('s3-meeting');
    expect(lines).toContain('17:00，月球會議室。關上門，外面的談話聲就聽不見了。');
    expect(lines).toContain('三杯水圍著藍色資料夾，玻璃牆上貼著卡通太空人。');
  });

  it('s4-notice：裁撤原因與程序資訊分開兩拍，都保留會議室背景', () => {
    const content = loadContent();
    const scene = content.scenes.get('s4-notice')!;
    const reason = scene.lines.find((line) => line.text === '主要客戶解約後，公司取消了你負責的產品線，也決定不把這個職位轉到其他團隊。');
    const procedure = scene.lines.find((line) => line.text === '日期、給付、保險、設備處理和聯絡窗口，都列在文件裡。');
    expect(reason?.background).toBe('moon-meeting-room-rain');
    expect(procedure?.background).toBe('moon-meeting-room-rain');
  });

  it('s6-receipt：書面效力與後續項目分開兩拍', () => {
    const lines = texts('s6-receipt');
    expect(lines).toContain('這是職位裁撤通知，日期和公司計算的給付都列在這頁，以書面為準。');
    expect(lines).toContain('後面是保險、設備、作品資料的申請方式，還有提問和申訴窗口。');
  });

  it('s7-not-in-file：簽名意義與選擇權分開兩拍，兩拍都只在 choice4=protect 出現', () => {
    const content = loadContent();
    const scene = content.scenes.get('s7-not-in-file')!;
    const first = scene.lines.find((line) => line.text === '這一處只確認你收到文件，不等於接受所有內容，也不等於放棄提問。');
    const second = scene.lines.find((line) => line.text === '你可以先不簽，帶回電子副本與紙本。');
    const protectCondition = [{ variable: 'choice4', operator: 'eq', value: 'protect' }];
    expect(first?.conditions).toEqual(protectCondition);
    expect(second?.conditions).toEqual(protectCondition);
  });
});

describe('曾雅琳角色弧：Scene 1／3／6 的新增台詞', () => {
  it('Scene 1：事前爭取失敗', () => {
    const lines = texts('s1-final-cut');
    expect(lines).toContain('我退回三次。最後保住的是「不用當場簽」、另一個聯絡窗口，還有把績效兩個字拿掉。');
    expect(lines).toContain('所以等一下不要把它說成公司很體貼。');
  });

  it('Scene 3：承認雙重角色', () => {
    const lines = texts('s3-meeting');
    expect(lines).toContain('妳是來保護公司，還是保護我？');
    expect(lines).toContain('兩件事都在我的職責裡。有衝突的時候，我至少把衝突寫進紀錄。');
    expect(lines).toContain('決定內容由周主管說明。');
  });

  it('Scene 6：揭露過去的沉默與代價', () => {
    const lines = texts('s6-receipt');
    expect(lines).toContain('我以前在另一張桌子旁邊，聽主管說「像家人就先簽」。');
    expect(lines).toContain('我拿著平板，沒有出聲。她簽了。');
    expect(lines).toContain('我升職了。');
    expect(lines).toContain('所以現在，沒說話不能再被寫成同意。');
  });

  it('END 04：雨澄離場後補一句記錄與終止，不是安慰或教訓的長篇演說', () => {
    const content = loadContent();
    const scene = content.scenes.get('ending-over-line')!;
    const line = scene.lines.find((item) => item.text === '這次我已經記下來，也已經說停。');
    expect(line?.speaker).toBe('zeng-yalin');
  });
});

describe('舊存檔反推：新增的敘事記憶分支不會讓既有反推邏輯誤判為歧義', () => {
  it('TRUE END 加感情線微選擇後的舊存檔（沒有 decisions 欄位）仍能反推出五個主要決策點', () => {
    const engine = new StoryEngine(loadContent());
    engine.continue(); // content-warning → s1-final-cut
    engine.choose('look-detail');
    engine.continue();
    engine.continue();
    engine.choose('invite-clear');
    engine.choose('notice-direct');
    engine.choose('answer-admit');
    engine.continue();
    engine.choose('reason-afraid');
    engine.continue(); // s5-reason-afraid → s5-reason-converge
    engine.continue(); // s5-reason-converge → s6-receipt
    engine.choose('doc-protect');
    engine.choose('recommend-witness');
    engine.continue(); // s7-recommend-witness → s7-recommend-converge
    engine.choose('keep-advocate');
    engine.continue();
    expect(engine.currentScene.id).toBe('ending-true');
    engine.continue(); // ending-true → ending-true-recommend-router（自動 route 到 s7Memory 對應分支）
    engine.continue(); // ending-true-recommend-witness → ending-true-recommend-converge
    engine.choose('question-weeks');
    engine.continue(); // ending-true-question-weeks → ending-true-finale
    expect(engine.currentScene.id).toBe('ending-true-finale');

    const { decisions, ...legacy } = engine.snapshot;
    expect(decisions).toHaveLength(5);

    const reloaded = new StoryEngine(loadContent());
    reloaded.restore(legacy);
    expect(reloaded.currentScene.id).toBe('ending-true-finale');
    expect(reloaded.decisionPoints.map((decision) => decision.choiceId)).toEqual([
      'invite-clear', 'notice-direct', 'answer-admit', 'doc-protect', 'keep-advocate',
    ]);
  });
});
