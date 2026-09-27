# Runway image-to-video integration audit

Date: 2026-09-27

Scope: current Runway Dev image-to-video requirements, checked against this repository's seven active cutscenes and 18 PNG start keyframes. Only first-party Runway documentation is used for API claims.

## Verdict

The repository has enough creative information for a supervised pilot, but **not enough yet for an unattended, mismatch-free 18-shot generation run**.

The positive side is substantial: the active slate, shot durations, start states, end states, character/prop continuity, cue locations, and 18 start images are all present in [`property/cutscene-storyboard-v3.md`](../../property/cutscene-storyboard-v3.md). Every selected PNG is 1672×941, about 1.47–2.02 MB, and therefore fits Runway's documented image constraints.

The remaining blockers are operational and prompt-contract issues:

1. [`property/sora-cutscenes.json`](../../property/sora-cutscenes.json) is explicitly a legacy Sora manifest. Its active `prompt` fields describe whole two- or three-shot segments. Sending those fields directly as one Runway request would contradict both the storyboard's “one shot per generation” rule and Runway's recommendation to keep one clip to one simple scene/action.
2. The common prompt template and several item prompts rely heavily on negative instructions such as “no new objects,” “no readable text,” and “no morphing.” Runway says Gen-4 is designed for positive descriptions and that negative phrasing can create unpredictable or opposite results. These prompts need a Runway-specific positive rewrite before generation.
3. The API can anchor a clip to its input image, but it does not promise exact character anatomy, prop identity, seat geometry, or a specified final state. “No mismatch” therefore has to be an acceptance-and-retry policy, not an API expectation.
4. The repository does not yet contain a Runway generation manifest or runner that fixes the model, one PNG per request, one motion prompt per request, exact duration, output filename, download behavior, retry/QC result, and provenance.
5. Static approval remains a project gate. The storyboard says user approval of `runway-v3/REVIEW.md` is required before image-to-video generation.

## Official API facts

### SDK, runtime, authentication, and billing setup

- Official Node package: `@runwayml/sdk`; it includes TypeScript bindings and requires Node.js 18 or newer. The official Python package is `runwayml` and requires Python 3.8 or newer. The image-to-video SDK call is `client.imageToVideo.create(...)` in Node or `client.image_to_video.create(...)` in Python. [Runway SDK documentation](https://docs.dev.runwayml.com/api-details/sdks/)
- The SDK reads the project API key from `RUNWAYML_API_SECRET`. Direct REST calls use `Authorization: Bearer $RUNWAYML_API_SECRET` and `X-Runway-Version: 2024-11-06`. Runway says not to hard-code the key and recommends a secret manager for production. [Runway setup guide](https://docs.dev.runwayml.com/guides/setup/), [Runway API guide](https://docs.dev.runwayml.com/guides/using-the-api/)
- The Runway Dev project needs purchased credits before generation. The setup guide currently states a $10 minimum initial purchase at $0.01 per credit. [Runway setup guide](https://docs.dev.runwayml.com/guides/setup/)

### Suitable direct models

| Model | Relevant official support | Current price | Fit for this slate |
| --- | --- | --- | --- |
| `gen4_turbo` | Image-to-video; `1280:720` is supported; durations can be any whole duration from 2–10 seconds | 5 credits/second | Best first-pass choice for the existing 2–3 second shots and iterative QC |
| `gen4.5` | Text- or image-to-video; `1280:720` is supported; durations 2–10 seconds | 12 credits/second | Quality escalation for shots that fail acceptance in Turbo |

Sources: [available models](https://docs.dev.runwayml.com/guides/models/), [input ratios](https://docs.dev.runwayml.com/assets/inputs/), [current changelog](https://docs.dev.runwayml.com/api-details/api_changelog/), [pricing](https://docs.dev.runwayml.com/guides/pricing/).

For the storyboard's 40 total seconds, one successful pass would cost approximately 200 credits ($2.00) on `gen4_turbo` or 480 credits ($4.80) on `gen4.5`, before retries. This is a calculation from the official per-second prices, not a Runway quote or a retry estimate.

### Ratio and image suitability

- Gen-4 Turbo accepts output ratios `1280:720`, `1584:672`, `1104:832`, `720:1280`, `832:1104`, and `960:960`. Gen-4.5 additionally lists `672:1584`; both support this project's required `1280:720`. [Runway input documentation](https://docs.dev.runwayml.com/assets/inputs/)
- Gen-4 Turbo prompt images must have width/height between 0.5 and 2.358; Gen-4.5 requires 0.5–2.0. The repository PNGs are 1672/941 ≈ 1.777, so they fit both.
- Runway recommends image references not be smaller than 640×640 or larger than 4K. The 1672×941 sources fit that recommendation. [Runway input documentation](https://docs.dev.runwayml.com/assets/inputs/)
- Runway describes the input image as establishing the visual starting point: composition, subjects, lighting, and style. It recommends a high-quality artifact-free image and motion-focused text. Artifacts in hands or faces may be intensified by video generation. [Runway image-to-video prompting guide](https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide)

### Local PNG submission options

Runway supports three practical paths:

1. **Data URI:** encode the local PNG as `data:image/png;base64,...` and pass it as `promptImage`. Encoded image data is limited to 5 MB; because base64 adds about 33%, Runway advises keeping the binary image at or below about 3.3 MB. All 18 selected repository PNGs fit. Data URIs are simplest for a small local batch but make request bodies larger and submission more serial. [Runway input documentation](https://docs.dev.runwayml.com/assets/inputs/), [API guide example](https://docs.dev.runwayml.com/guides/using-the-api/)
2. **Ephemeral upload (recommended for this batch):** `client.uploads.createEphemeral(fs.createReadStream(path))` returns a reusable `runway://...` URI. Each URI lasts 24 hours; upload size is 512 bytes–200 MB; credits must already have been purchased; uploads are rate-limited. [Runway ephemeral uploads](https://docs.dev.runwayml.com/assets/uploads/)
3. **Hosted HTTPS URL:** images may be up to 16 MB, but the URL must be HTTPS, use a domain rather than an IP address, return valid `Content-Type` and `Content-Length`, support `HEAD`, avoid redirects, and be at most 2048 characters. [Runway input documentation](https://docs.dev.runwayml.com/assets/inputs/)

Ephemeral upload is the cleanest option here because it avoids making the 18 source PNGs public, avoids base64 request overhead, and permits reuse during retries inside the 24-hour window.

### Task waiting, throttling, and output retention

- A generation call creates a task. The SDK's `.waitForTaskOutput()` / `.wait_for_task_output()` waits for completion; its default timeout is ten minutes. Runway permits disabling the timeout but explicitly advises against it. Direct REST clients poll `GET /v1/tasks/{id}`. [Runway SDK documentation](https://docs.dev.runwayml.com/api-details/sdks/)
- Tasks above the project's concurrency allowance can enter `THROTTLED` and queue approximately in submission order. Video models share the video concurrency pool. The runner should use bounded concurrency rather than submitting all 18 shots blindly. [Runway usage tiers](https://docs.dev.runwayml.com/usage/tiers/)
- Successful tasks return one or more signed URLs in `output`. Those URLs expire within 24–48 hours. Runway expects callers to download outputs to their own storage and says not to expose the temporary URLs directly in a product. [Runway output documentation](https://docs.dev.runwayml.com/assets/outputs/)

## Continuity implications

### Facts from Runway

- Runway recommends that image-to-video prompts focus almost entirely on motion because the input image already conveys appearance, composition, lighting, and style. It recommends simple, direct prompts, adding one motion element at a time, and treating each short generation as one scene. [Gen-4 video prompting guide](https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide), [image-to-video prompting guide](https://help.runwayml.com/hc/en-us/articles/48324313115155-Image-to-Video-Prompting-Guide)
- For multiple subjects, Runway recommends positional or simple identifiers (“the subject on the left,” “the woman,” “the man”) rather than re-describing identity in detail. [Gen-4 video prompting guide](https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide)
- Runway warns against negative phrasing, abstract instructions, and overloaded prompts containing multiple actions, scene changes, or style shifts. [Gen-4 video prompting guide](https://help.runwayml.com/hc/en-us/articles/39789879462419-Gen-4-Video-Prompting-Guide)
- Runway's longer-film guidance says a storyboard frame normally maps to one 5–10 second generation and warns that a single-angle character reference can still produce subtle identity variation across generations; character plates help reduce, not eliminate, variation. [Runway longer-video guidance](https://help.runwayml.com/hc/en-us/articles/26871350018835-How-to-create-longer-videos-and-films)

### Inference for this project

Each direct image-to-video request is an independent task with its own prompt image and text. The official endpoint does not describe persistent shared scene memory across those 18 calls. Therefore the approved PNG is the primary identity/scene anchor for each shot, while consistency between independently generated shots must be verified editorially.

The current PNGs already contain integrated characters, room geometry, and props, which is much safer than asking the video model to reconstruct those elements from text. However, an exact end state such as “the folder lies flat,” “the window is closed but the draft is not deleted,” or “three glasses remain correctly assigned” is still a review criterion, not something the API contract guarantees.

## Required integration decisions before generation

These are recommendations, not Runway API facts.

1. **Fix the model contract:** use `gen4_turbo` for the first supervised pass; escalate only rejected shots to `gen4.5`. Do not use an unconstrained model router for this continuity-sensitive batch.
2. **Create a Runway-only 18-row manifest:** one row per shot with `shotId`, source PNG, duration, `ratio: "1280:720"`, positive motion prompt, destination MP4, cue segment, attempt number, model, task ID, downloaded output hash, and QC status.
3. **Do not submit `sora-cutscenes.json.items[].prompt`:** those are segment summaries containing two or three shots. Build per-shot prompts from the “18 鏡正式分鏡” table instead.
4. **Rewrite prompts positively:** for example, replace “no camera zoom, no new objects, no readable text” with “The camera holds a locked medium framing. Existing objects remain unchanged. Screens and papers retain abstract, illegible marks throughout.” Keep prohibitions in the human QC checklist, not as the main generation language.
5. **Use ephemeral uploads:** upload the 18 PNGs once, retain the local-path → `runway://` map for that run, and regenerate URIs after 24 hours.
6. **Run sequentially or with low bounded concurrency:** download each success immediately to a temporary local filename, validate it is a playable video, then atomically rename it to the canonical shot output. Preserve task ID and prompt alongside it.
7. **Use an explicit rejection loop:** reject for identity drift, old Yalin design, hand/anatomy errors, folder/tablet confusion, wrong seat/prop ownership, readable text, unrequested camera motion, early action, or wrong end state. Never let a successful API status equal creative approval.
8. **Edit shots into the seven canonical segment files only after shot-level approval.** The API outputs individual shots; continuity across a multi-shot segment is an editorial responsibility.
9. **Handle sound separately:** the reviewed Gen-4 direct image-to-video request contract does not establish the environmental-sound deliverable specified by the storyboard. Treat the Runway clips as picture generation unless a separately verified audio workflow is chosen.
10. **Complete the project's static approval gate before spending credits.** The current documentation explicitly says formal image-to-video generation waits for user approval of the keyframes.

## Minimum safe request shape

Illustrative Node shape for one approved shot:

```ts
import fs from 'node:fs';
import RunwayML from '@runwayml/sdk';

const client = new RunwayML(); // reads RUNWAYML_API_SECRET
const { uri } = await client.uploads.createEphemeral(
  fs.createReadStream('public/assets/cutscenes/keyframes/runway-v3/06-A.png'),
);

const task = await client.imageToVideo
  .create({
    model: 'gen4_turbo',
    promptImage: uri,
    promptText:
      'The woman at the third side of the table slowly draws the untouched glass toward herself. The seated man remains still. The locked camera holds the room geometry and restrained illustrated motion.',
    ratio: '1280:720',
    duration: 2,
  })
  .waitForTaskOutput({ timeout: 10 * 60 * 1000 });

// Download task.output[0] immediately; do not store the signed URL as the asset.
```

The Node SDK timeout is expressed in milliseconds. The repository currently has no Runway dependency pinned, so the implementation should still be type-checked against the installed SDK version.

## Go/no-go checklist

| Gate | Current state |
| --- | --- |
| 18 valid 16:9-ish PNG start frames within Runway limits | Ready |
| Shot-by-shot start/action/end creative specification | Ready |
| Character/prop/scene continuity bible | Ready |
| Correct runtime cue anchors | Ready per latest Claude handoff |
| User static approval | Pending |
| Runway project, key, and credits | Not evidenced in repo (appropriately secret/out-of-repo) |
| Pinned Runway model and SDK version | Missing |
| Runway-specific positive prompt per shot | Missing |
| 18-shot generation manifest and downloader | Missing |
| Retry/QC/provenance record | Missing |
| Environmental-sound workflow | Missing |

**Decision:** no-go for unattended production; go for a one- or two-shot supervised proof of concept after static approval and secret/credit setup.
