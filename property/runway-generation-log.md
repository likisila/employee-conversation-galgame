# Runway generation provenance

This log records submitted candidates. A submitted or completed task is not an approved production asset until content QC passes.

## 00-B candidate 01

- Submitted: `2026-09-27T11:24:52Z`
- Status: `REJECTED AS STANDALONE CUTSCENE`
- Task ID: `74646b65-3dbe-4349-9be8-94ff0dcb9d14`
- Shot: `00-B`
- Candidate: `01`
- Start frame: `public/assets/cutscenes/keyframes/runway-v3/00-B-v3.png`
- Start-frame SHA-256: `84cef29d78184ddd10fbbeaddb71f86cdd4b10767aa28accd8325f8563dacf61`
- Start-frame bytes: `1,988,433`
- Model: `gen-4.5`
- Duration: `2s`
- Ratio: `16:9`
- Resolution: `720p`
- Generated audio: `false`
- Credits charged: `24`
- Credits remaining after submission: `595`
- Prompt: `The standing light-haired woman calmly lowers the wide blue paper folder with both hands until it rests flat on the desk, then releases it. A restrained side-follow tracks only the short downward movement. Natural adult motion, quiet rainy-office stillness, and a stable hold on the folder resting on the desk.`
- QC status: `SPEC FAILURE` — the task tested an isolated middle-shot action rather than the complete narrative beat at the playback cue. Do not deploy it as `00_final_documents.mp4`. It may only be reconsidered later as shot 00-B inside an approved, edited 00 sequence.
- Required end state: the paper folder rests fully flat on the desk and both hands have released it.
- Rejection gates: folder becomes a tablet or book; paper thickness disappears; face, hair, clothing or hands drift; fingers merge; new desk objects appear; camera pushes in or composition jumps.
- Output URL/local file: intentionally not promoted or downloaded during the specification rewrite.

## 00-A candidate 01

- Submitted: `2026-09-27T13:39:57Z`
- Status: `PENDING USER QC`
- Task ID: `95681111-cc58-41aa-b906-00536f26a050`
- Shot: `00-A`
- Candidate: `01`
- Start frame: `public/assets/cutscenes/keyframes/current/00-A.png`
- Start-frame SHA-256: `6377f9670be8fd8dc50ed8c8c2193d0cd3a4550cc90551fa01b12146780e31e5`
- Start-frame bytes: `2,004,434`
- Model: `gen-4.5`
- Duration: `2s`
- Ratio: `16:9`
- Resolution: `720p`
- Generated audio: `false`
- Credits charged: `24`
- Credits remaining after submission: `571`
- Prompt: `Single continuous shot in the exact same illustrated rainy-night office and composition as the start frame. The dark-haired woman at the keyboard continues working quietly, with only subtle natural typing motion, while soft rain reflections move gently across the office surfaces. A very short restrained lateral camera drift follows the desk edge, then the composition holds steadily. Her attention remains fixed on the screen throughout. No one enters or leaves, no document or notification appears, she does not look up, and no new action, event, location, time jump, dialogue, text, or plot development occurs.`
- Submission count: exactly one generation task. A prior upload-parameter validation returned before task creation and charged no generation credits; it was not a generation attempt. Do not retry, regenerate or create a variation unless the user explicitly requests it after personally checking this result.
- QC status: reserved for the user. ChatGPT must not auto-approve or auto-reject this candidate.
- Required end state: the same woman remains focused on the screen in the same office composition; only quiet work, rain reflections and a restrained lateral drift have occurred.
- Rejection gates for user reference: character identity or anatomy drift; looking up; a person, document, notification or new object appears; location/time changes; readable text; dialogue; camera jump; any new plot beat.
- Output URL/local file: available through the original Runway task viewer; not downloaded or promoted while awaiting user QC.

## 00-B candidate 02

- Submitted: `2026-09-27T13:42:20Z`
- Status: `PENDING USER QC`
- Task ID: `a4ab6894-051c-4c1f-9a24-6fa36dccc70e`
- Shot: `00-B`
- Candidate: `02`
- Start frame: `public/assets/cutscenes/keyframes/current/00-B.png`
- Start-frame SHA-256: `84cef29d78184ddd10fbbeaddb71f86cdd4b10767aa28accd8325f8563dacf61`
- Start-frame bytes: `1,988,433`
- Model: `gen-4.5`
- Duration: `2.5s`
- Ratio: `16:9`
- Resolution: `720p`
- Generated audio: `false`
- Credits charged: `24`
- Credits remaining after submission: `547`
- Prompt: `Single continuous shot in the exact same illustrated rainy-night office and composition as the start frame. The standing light-haired woman slowly lowers the wide blue paper folder with both hands until it rests fully flat on the desk, then releases it. A restrained side-follow tracks only this short downward movement, then stops. The folder remains visibly thick with a cover, spine, and paper pages, and both released hands hold steadily above the desk. No tablet, screen, glowing device, readable text, extra object, new person, dialogue, location change, time jump, camera cut, or additional plot action appears.`
- Submission count: exactly one generation task for this candidate. Do not retry, regenerate or create a variation until the user personally checks and explicitly confirms next action.
- QC status: reserved for the user. ChatGPT must not auto-approve or auto-reject this candidate.
- Required end state: the blue paper folder rests fully flat on the desk, both hands have released it, and the original office composition remains stable.
- Rejection gates for user reference: folder becomes a tablet/screen/book; paper thickness disappears; hands or identity drift; extra objects or people appear; camera cuts or pushes; any new plot beat.
- Output URL/local file: available through the original Runway task viewer; not downloaded or promoted while awaiting user QC.
