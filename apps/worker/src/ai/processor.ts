import type { PrismaClientLike } from '@frameforge/db';
import { createLogger } from '../logger';
import type { WorkerEnv } from '../services/env';
import { OpenAiClient, imageSizeForAspect, type ChatMessage } from '../services/openai';
import type { WorkerStorage } from '../services/storage';

interface AiContext {
  prisma: PrismaClientLike;
  storage: WorkerStorage;
  env: WorkerEnv;
  redis: any;
  jobId: string;
  logger: ReturnType<typeof createLogger>;
}

interface StoryboardScene {
  index: number;
  title: string;
  description: string;
  imagePrompt: string;
  durationSeconds: number;
  camera?: string;
  assetId?: string;
  storageKey?: string;
  url?: string;
}

const MAX_SCENES = 8;

function asJson(value: unknown): any {
  if (value === null || value === undefined) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

function parseJsonObject(text: string): any {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  const source = start >= 0 && end > start ? stripped.slice(start, end + 1) : stripped;
  return JSON.parse(source);
}

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numeric)));
}

function toSceneList(raw: any, prompt: string, count: number, duration: number): StoryboardScene[] {
  const candidates: any[] = Array.isArray(raw?.scenes)
    ? raw.scenes
    : Array.isArray(raw)
      ? raw
      : [];
  const perScene = Math.max(2, Math.round(duration / Math.max(1, candidates.length || count)));
  const scenes = candidates.slice(0, MAX_SCENES).map((scene, index) => ({
    index: index + 1,
    title: String(scene.title ?? `Scene ${index + 1}`).slice(0, 120),
    description: String(scene.description ?? scene.summary ?? '').slice(0, 1200),
    imagePrompt: String(scene.imagePrompt ?? scene.image_prompt ?? scene.prompt ?? descriptionFor(prompt, index))
      .slice(0, 1200),
    durationSeconds: clamp(scene.durationSeconds ?? scene.duration, 2, 30, perScene),
    camera: scene.camera ? String(scene.camera).slice(0, 200) : undefined,
  }));
  if (scenes.length > 0) return scenes;
  return Array.from({ length: count }, (_, index) => ({
    index: index + 1,
    title: `Scene ${index + 1}`,
    description: `Beat ${index + 1} for: ${prompt}`.slice(0, 1200),
    imagePrompt: descriptionFor(prompt, index),
    durationSeconds: perScene,
  }));
}

function descriptionFor(prompt: string, index: number): string {
  return `${prompt}. Cinematic scene ${index + 1}, dramatic lighting, 35mm film, shallow depth of field.`;
}

async function isCanceled(ctx: AiContext, jobId: string): Promise<boolean> {
  try {
    const value = await ctx.redis.get(`ff:cancel:ai:${jobId}`);
    if (value === '1') return true;
  } catch {
    return false;
  }
  try {
    const job: any = await (ctx.prisma as any).aiGenerationJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    return job?.status === 'CANCELED';
  } catch {
    return false;
  }
}

async function setProgress(ctx: AiContext, jobId: string, progress: number): Promise<void> {
  await (ctx.prisma as any).aiGenerationJob.update({
    where: { id: jobId },
    data: { progress: Math.round(progress) },
  });
}

export async function processAiJob(ctx: AiContext): Promise<void> {
  const { prisma, storage, env, logger, jobId } = ctx;
  const job: any = await (prisma as any).aiGenerationJob.findUnique({
    where: { id: jobId },
    include: { project: true },
  });

  if (!job) {
    (logger as any).error({ aiJobId: jobId }, 'AI job not found');
    return;
  }
  if (job.status !== 'QUEUED') return;

  await (prisma as any).aiGenerationJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', startedAt: new Date(), progress: 5 },
  });

  const params = asJson(job.params);
  const aspectRatio = job.aspectRatio ?? '16:9';
  const duration = job.durationSeconds ?? 15;
  const sceneCount = clamp(params.sceneCount, 1, MAX_SCENES, Math.max(3, Math.round(duration / 4)));
  const prompt = (job.prompt ?? job.script ?? '').trim();
  const useOpenAi = job.provider === 'openai';

  try {
    if (useOpenAi && !env.OPENAI_API_KEY) {
      throw new Error(
        'This job was created with the OpenAI provider, but OPENAI_API_KEY is not set on the worker.',
      );
    }

    const client = useOpenAi ? new OpenAiClient(env) : null;
    let result: Record<string, unknown>;

    switch (job.kind) {
      case 'SCRIPT': {
        const text = client
          ? await client.chat(buildScriptMessages(prompt, job, duration), {
              model: env.OPENAI_TEXT_MODEL,
              temperature: 0.8,
            })
          : mockScript(prompt, job, duration);
        if (await isCanceled(ctx, job.id)) return finishCanceled(ctx, job.id);
        await (prisma as any).aiGenerationJob.update({
          where: { id: job.id },
          data: { script: text, progress: 80 },
        });
        result = {
          provider: useOpenAi ? 'openai' : 'mock',
          model: useOpenAi ? env.OPENAI_TEXT_MODEL : 'mock-script',
          text,
          mock: !useOpenAi,
        };
        break;
      }

      case 'STORYBOARD':
      case 'TEXT_TO_VIDEO':
      case 'IMAGE_TO_VIDEO': {
        const description = client
          ? await client.chat(buildStoryboardMessages(prompt, job, sceneCount, duration), {
              model: env.OPENAI_TEXT_MODEL,
              json: true,
              temperature: 0.7,
            })
          : null;

        let raw: any = null;
        if (description) {
          try {
            raw = parseJsonObject(description);
          } catch (error) {
            (logger as any).warn(
              { err: (error as Error).message },
              'Storyboard JSON parse failed, using fallback scenes',
            );
          }
        }

        let scenes = toSceneList(raw, prompt, sceneCount, duration);
        await setProgress(ctx, job.id, 35);

        if (client && env.AI_GENERATE_IMAGES) {
          for (const scene of scenes) {
            if (await isCanceled(ctx, job.id)) return finishCanceled(ctx, job.id);
            const image = await client.image(scene.imagePrompt, {
              model: env.OPENAI_IMAGE_MODEL,
              size: imageSizeForAspect(aspectRatio),
            });
            const key = `ai/${job.workspaceId}/${job.id}/scene-${scene.index}.png`;
            await storage.putObject(key, image, 'image/png');
            const asset = await (prisma as any).mediaAsset.create({
              data: {
                workspaceId: job.workspaceId,
                projectId: job.projectId ?? null,
                uploadedById: job.createdById,
                kind: 'IMAGE',
                status: 'READY',
                originalName: `scene-${scene.index}.png`,
                storageKey: key,
                mimeType: 'image/png',
                sizeBytes: BigInt(image.length),
                mock: false,
                metadata: {
                  aiJobId: job.id,
                  sceneIndex: scene.index,
                  prompt: scene.imagePrompt,
                },
              },
            });
            scene.storageKey = key;
            scene.assetId = asset.id;
            scene.url = await storage.getSignedDownloadUrl(key);
            await setProgress(
              ctx,
              job.id,
              35 + Math.round((scene.index / scenes.length) * 45),
            );
          }
        }

        scenes = scenes.map((scene) => ({ ...scene }));
        result = {
          provider: useOpenAi ? 'openai' : 'mock',
          model: useOpenAi ? env.OPENAI_TEXT_MODEL : 'mock-storyboard',
          scenes,
          sceneCount: scenes.length,
          imagesGenerated: scenes.filter((scene) => scene.assetId).length,
          note: useOpenAi
            ? 'OpenAI produces the script, shot list and still frames. Assemble the timeline in the editor.'
            : 'Mock storyboard. Set AI_PROVIDER=openai and OPENAI_API_KEY to generate real output.',
          mock: !useOpenAi,
        };
        break;
      }

      case 'TEXT_TO_SPEECH': {
        const text = String(params.text ?? job.script ?? job.prompt ?? '').trim();
        if (!text) throw new Error('A script or text prompt is required for voiceover generation.');
        if (!client) {
          result = {
            provider: 'mock',
            model: 'mock-tts',
            voice: params.voice ?? env.OPENAI_TTS_VOICE,
            text,
            mock: true,
          };
          break;
        }
        const voice = String(params.voice ?? env.OPENAI_TTS_VOICE);
        const audio = await client.speech(text.slice(0, 4000), {
          model: env.OPENAI_TTS_MODEL,
          voice,
        });
        if (await isCanceled(ctx, job.id)) return finishCanceled(ctx, job.id);
        const key = `ai/${job.workspaceId}/${job.id}/voiceover.mp3`;
        await storage.putObject(key, audio, 'audio/mpeg');
        const asset = await (prisma as any).mediaAsset.create({
          data: {
            workspaceId: job.workspaceId,
            projectId: job.projectId ?? null,
            uploadedById: job.createdById,
            kind: 'AUDIO',
            status: 'READY',
            originalName: `voiceover-${job.id}.mp3`,
            storageKey: key,
            mimeType: 'audio/mpeg',
            sizeBytes: BigInt(audio.length),
            mock: false,
            metadata: { aiJobId: job.id, voice, model: env.OPENAI_TTS_MODEL },
          },
        });
        result = {
          provider: 'openai',
          model: env.OPENAI_TTS_MODEL,
          voice,
          text,
          audioKey: key,
          audioAssetId: asset.id,
          audioUrl: await storage.getSignedDownloadUrl(key),
          mock: false,
        };
        break;
      }

      case 'TRANSCRIPTION': {
        const sourceAssetId = params.sourceAssetId as string | undefined;
        if (!sourceAssetId) throw new Error('Choose an audio or video asset to transcribe.');
        const asset: any = await (prisma as any).mediaAsset.findUnique({
          where: { id: sourceAssetId },
        });
        if (!asset || asset.deletedAt) throw new Error('The source asset could not be found.');
        if (await isCanceled(ctx, job.id)) return finishCanceled(ctx, job.id);
        if (!client) {
          result = {
            provider: 'mock',
            model: 'mock-transcription',
            text: `Mock transcript for ${asset.originalName}. Set OPENAI_API_KEY to transcribe for real.`,
            segments: [],
            mock: true,
          };
          break;
        }
        const buffer = await storage.getObject(asset.storageKey);
        await setProgress(ctx, job.id, 40);
        const transcript = await client.transcribe(buffer, asset.originalName, {
          model: env.OPENAI_TRANSCRIBE_MODEL,
          language: params.language,
        });
        if (await isCanceled(ctx, job.id)) return finishCanceled(ctx, job.id);
        const key = `ai/${job.workspaceId}/${job.id}/transcript.json`;
        await storage.putObject(key, JSON.stringify(transcript, null, 2), 'application/json');
        result = {
          provider: 'openai',
          model: env.OPENAI_TRANSCRIBE_MODEL,
          text: transcript.text,
          language: transcript.language ?? params.language ?? null,
          durationSeconds: transcript.duration ?? null,
          segments: transcript.segments ?? [],
          transcriptKey: key,
          mock: false,
        };
        break;
      }

      default:
        throw new Error(`Unsupported AI job kind: ${job.kind}`);
    }

    if (await isCanceled(ctx, job.id)) return finishCanceled(ctx, job.id);

    await (prisma as any).aiGenerationJob.update({
      where: { id: job.id },
      data: {
        status: 'SUCCEEDED',
        progress: 100,
        completedAt: new Date(),
        errorCode: null,
        errorMessage: null,
        result: result as any,
      },
    });
    (logger as any).info({ aiJobId: job.id, kind: job.kind }, 'AI job completed');
  } catch (error) {
    const message = (error as Error).message ?? 'Unknown AI error';
    (logger as any).error({ err: message, aiJobId: job.id }, 'AI job failed');
    await (prisma as any).aiGenerationJob
      .update({
        where: { id: job.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorCode: 'AI_PROVIDER_ERROR',
          errorMessage: message.slice(0, 2000),
        },
      })
      .catch(() => undefined);
  }
}

async function finishCanceled(ctx: AiContext, jobId: string): Promise<void> {
  await (ctx.prisma as any).aiGenerationJob
    .update({
      where: { id: jobId },
      data: { status: 'CANCELED', completedAt: new Date() },
    })
    .catch(() => undefined);
}

function buildScriptMessages(prompt: string, job: any, duration: number): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are a senior video scriptwriter. Write production-ready voiceover scripts with a strong hook, clear structure and a memorable close. Return plain text only, with scene beats separated by blank lines.',
    },
    {
      role: 'user',
      content: [
        `Brief: ${prompt || 'A cinematic brand film.'}`,
        `Style: ${job.style ?? 'cinematic'}`,
        `Aspect ratio: ${job.aspectRatio ?? '16:9'}`,
        `Target length: ${duration} seconds`,
        'Write the full narration, timed roughly to the target length.',
      ].join('\n'),
    },
  ];
}

function buildStoryboardMessages(
  prompt: string,
  job: any,
  sceneCount: number,
  duration: number,
): ChatMessage[] {
  return [
    {
      role: 'system',
      content:
        'You are a film director and storyboard artist. Respond with a single JSON object: {"scenes":[{"title":string,"description":string,"imagePrompt":string,"durationSeconds":number,"camera":string}]}. imagePrompt must be a self-contained text-to-image prompt with subject, action, lens, lighting and mood. No markdown, no extra keys.',
    },
    {
      role: 'user',
      content: [
        `Concept: ${prompt || 'A cinematic brand film.'}`,
        `Style: ${job.style ?? 'cinematic'}`,
        `Aspect ratio: ${job.aspectRatio ?? '16:9'}`,
        `Total duration: ${duration} seconds across ${sceneCount} scenes.`,
        'Return only the JSON object.',
      ].join('\n'),
    },
  ];
}

function mockScript(prompt: string, job: any, duration: number): string {
  const concept = prompt || 'A cinematic story about bold ideas.';
  return [
    `OPENING — 0:00-0:0${Math.max(2, Math.round(duration * 0.15))}`,
    `Visual: ${concept}`,
    `Voiceover: Every story starts with a spark.`,
    '',
    `MIDDLE — 0:0${Math.max(3, Math.round(duration * 0.3))}-0:${Math.max(
      6,
      Math.round(duration * 0.7),
    )}`,
    `Visual: The idea takes shape in ${job.style ?? 'cinematic'} frames, cut to the rhythm of the score.`,
    `Voiceover: We chase it, shape it, and bring it into focus.`,
    '',
    `CLOSE — 0:${Math.max(7, Math.round(duration * 0.75))}-0:${duration}`,
    `Visual: Final hero frame, logo reveal, soft light.`,
    `Voiceover: FrameForge AI. Make the cut that matters.`,
    '',
    '(Mock script — set AI_PROVIDER=openai and OPENAI_API_KEY for real AI writing.)',
  ].join('\n');
}
