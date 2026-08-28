import type { SupabaseClient } from "@supabase/supabase-js";
import type { AudioSample } from "mediabunny";
import { extractStoragePath, isManagedStorageUrl } from "@/lib/imageOptimization";

/**
 * Bucket público do áudio dos artigos. Leitura liberada para visitantes (o blog
 * é público); escrita só para admin.
 */
export const ARTICLE_AUDIO_BUCKET = "article-audio";

/** Teto do arquivo aceito na entrada, antes da conversão (500 MB ≈ 1h de WAV estéreo). */
export const MAX_AUDIO_INPUT_BYTES = 500 * 1024 * 1024;

/** Teto do bucket. Se a conversão passar disso, o preset escolhido é pesado demais. */
export const MAX_AUDIO_OUTPUT_BYTES = 100 * 1024 * 1024;

/** Quantas barras a forma de onda guarda. 96 cabe em qualquer largura sem virar sopa. */
export const WAVEFORM_BARS = 96;

/**
 * Presets de conversão.
 *
 * O destino é sempre **AAC-LC dentro de MP4** (`.m4a`). Não é o codec mais
 * eficiente que existe — Opus ganha dele por larga margem a 64 kbps — mas é o
 * único que toca em absolutamente todo navegador e todo iPhone sem ressalva, e
 * um artigo publicado não pode depender de qual navegador o admin usou para
 * subir o arquivo. Opus/WebM ficaria refém do Safari.
 *
 * `voz` é o padrão porque áudio de artigo é narração: mono a 32 kHz cobre toda a
 * banda da fala e corta o arquivo pela metade em relação a estéreo.
 */
export const AUDIO_PRESETS = {
  voz: {
    label: "Voz",
    description: "Narração e entrevista — mono, 64 kbps.",
    numberOfChannels: 1,
    sampleRate: 32000,
    bitrate: 64000,
  },
  musica: {
    label: "Música",
    description: "Trilha e edição sonora — estéreo, 128 kbps.",
    numberOfChannels: 2,
    sampleRate: 44100,
    bitrate: 128000,
  },
} as const;

export type AudioPreset = keyof typeof AUDIO_PRESETS;

/** Fases do envio, para a interface refletir o que está acontecendo. */
export type AudioPhase = "reading" | "converting" | "uploading";

export type CompressedAudio = {
  /** O arquivo já convertido, pronto para o storage. */
  file: File;
  /** Duração em segundos, arredondada. */
  durationSeconds: number;
  /** Envoltória do áudio: `WAVEFORM_BARS` inteiros de 0 a 100. */
  peaks: number[];
  originalBytes: number;
};

export type CompressOptions = {
  preset?: AudioPreset;
  onPhase?: (phase: AudioPhase) => void;
  /** Progresso da conversão, de 0 a 1. */
  onProgress?: (progress: number) => void;
};

/**
 * Garante que existe um encoder de AAC disponível.
 *
 * Chrome, Edge e Safari codificam AAC nativamente pelo WebCodecs. O Firefox não
 * (motivo de patente), então lá carregamos o encoder WASM sob demanda — só o
 * Firefox paga o download, e o formato de saída continua o mesmo em todos.
 */
async function ensureAacEncoder(config: {
  numberOfChannels: number;
  sampleRate: number;
  bitrate: number;
}): Promise<void> {
  const { canEncodeAudio } = await import("mediabunny");
  if (await canEncodeAudio("aac", config)) return;

  const { registerAacEncoder } = await import("@mediabunny/aac-encoder");
  registerAacEncoder();

  if (!(await canEncodeAudio("aac", config))) {
    throw new Error("Este navegador não consegue converter áudio. Tente pelo Chrome, Edge ou Safari.");
  }
}

function clamp(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}

/**
 * Acumula a envoltória de um bloco já decodificado.
 *
 * O `process` da conversão não entrega pacotes curtos: o reamostrador junta
 * vários segundos de áudio antes de repassar o bloco. Medir um RMS por chamada
 * daria uma barra a cada cinco segundos — uma onda de sete degraus, não uma
 * forma de onda. Por isso cada bloco é fatiado pelas barras que ele cobre, e o
 * desenho fica igual independentemente do tamanho que o reamostrador escolher.
 */
function accumulatePeaks(sample: AudioSample, duration: number, peaks: Float32Array): void {
  const frames = sample.numberOfFrames;
  const channels = sample.numberOfChannels;
  if (frames <= 0 || channels <= 0) return;

  const data = new Float32Array(sample.allocationSize({ planeIndex: 0, format: "f32" }) / 4);
  sample.copyTo(data, { planeIndex: 0, format: "f32" });

  const barDuration = duration / WAVEFORM_BARS;
  const start = sample.timestamp;
  const end = start + frames / sample.sampleRate;

  const firstBar = clamp(Math.floor(start / barDuration), WAVEFORM_BARS - 1);
  const lastBar = clamp(Math.floor(end / barDuration), WAVEFORM_BARS - 1);

  for (let bar = firstBar; bar <= lastBar; bar++) {
    const from = clamp(Math.round((bar * barDuration - start) * sample.sampleRate), frames);
    const to = clamp(Math.round(((bar + 1) * barDuration - start) * sample.sampleRate), frames);
    if (to <= from) continue;

    // RMS do trecho, não o pico absoluto: o pico satura quase toda barra e
    // devolve um retângulo; a energia média devolve a forma da fala.
    let sum = 0;
    for (let i = from * channels; i < to * channels; i++) sum += data[i] * data[i];
    const rms = Math.sqrt(sum / ((to - from) * channels));

    if (rms > peaks[bar]) peaks[bar] = rms;
  }
}

/**
 * Converte a envoltória acumulada em inteiros de 0 a 100.
 *
 * A raiz quadrada é compressão de faixa dinâmica para os olhos: sem ela, um pico
 * isolado achata todo o resto da onda em barras de 2px e o desenho não diz mais
 * nada sobre o conteúdo.
 */
function normalizePeaks(raw: Float32Array): number[] {
  let max = 0;
  for (const value of raw) {
    if (value > max) max = value;
  }
  if (max <= 0) return Array.from(raw, () => 0);

  return Array.from(raw, (value) => Math.round(Math.sqrt(value / max) * 100));
}

/**
 * Converte qualquer áudio recebido (MP3, WAV, M4A, FLAC, OGG…) para AAC em MP4
 * **no navegador**, antes de tocar a rede — é o que impede um WAV de 300 MB de
 * virar um objeto de 300 MB no storage.
 *
 * De carona na mesma passagem, calcula a forma de onda: os quadros já estão
 * decodificados e passando pela função, então a envoltória sai de graça. Fazer
 * isso depois custaria um segundo decode do arquivo inteiro.
 */
export async function compressAudioFile(
  file: File,
  { preset = "voz", onPhase, onProgress }: CompressOptions = {}
): Promise<CompressedAudio> {
  if (file.size > MAX_AUDIO_INPUT_BYTES) {
    throw new Error(
      `O arquivo precisa ter no máximo ${Math.round(MAX_AUDIO_INPUT_BYTES / 1024 / 1024)} MB antes da conversão.`
    );
  }

  const target = AUDIO_PRESETS[preset];
  const encoderConfig = {
    numberOfChannels: target.numberOfChannels,
    sampleRate: target.sampleRate,
    bitrate: target.bitrate,
  };

  onPhase?.("reading");
  await ensureAacEncoder(encoderConfig);

  const { ALL_FORMATS, BlobSource, BufferTarget, Conversion, Input, Mp4OutputFormat, Output, Quality } =
    await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

  if (!(await input.canRead())) {
    throw new Error("Não foi possível ler este arquivo de áudio. Envie MP3, WAV, M4A, AAC, OGG ou FLAC.");
  }
  if (!(await input.getPrimaryAudioTrack())) {
    throw new Error("O arquivo enviado não tem nenhuma faixa de áudio.");
  }

  const duration = await input.computeDuration();
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("Não foi possível determinar a duração deste áudio.");
  }

  const peaks = new Float32Array(WAVEFORM_BARS);
  const output = new Output({
    // `fastStart: "in-memory"` põe o índice (moov) na frente do arquivo. Sem
    // isso o navegador precisa baixar o MP4 inteiro antes do primeiro segundo
    // de som — o player pareceria travado em conexão lenta.
    format: new Mp4OutputFormat({ fastStart: "in-memory" }),
    target: new BufferTarget(),
  });

  const conversion = await Conversion.init({
    input,
    output,
    video: { discard: true },
    audio: {
      codec: "aac",
      numberOfChannels: target.numberOfChannels,
      sampleRate: target.sampleRate,
      quality: new Quality({ bitrate: target.bitrate }),
      process: (sample) => {
        accumulatePeaks(sample, duration, peaks);
        return sample;
      },
    },
  });

  if (!conversion.isValid) {
    const reason = conversion.discardedTracks.find((track) => track.track.type === "audio")?.reason;
    throw new Error(
      reason === "undecodable_source_codec"
        ? "Este navegador não sabe decodificar o codec deste arquivo. Converta para MP3 ou WAV antes de enviar."
        : "Não foi possível converter este áudio."
    );
  }

  onPhase?.("converting");
  conversion.onProgress = (progress) => onProgress?.(progress);
  await conversion.execute();

  const buffer = output.target.buffer;
  if (!buffer) {
    throw new Error("A conversão do áudio terminou sem gerar arquivo.");
  }
  if (buffer.byteLength > MAX_AUDIO_OUTPUT_BYTES) {
    throw new Error(
      `Mesmo comprimido o áudio ficou acima de ${Math.round(MAX_AUDIO_OUTPUT_BYTES / 1024 / 1024)} MB. ` +
        "Divida o episódio ou use o preset de voz."
    );
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_") || "audio";

  return {
    file: new File([buffer], `${baseName}.m4a`, { type: "audio/mp4", lastModified: Date.now() }),
    durationSeconds: Math.round(duration),
    peaks: normalizePeaks(peaks),
    originalBytes: file.size,
  };
}

export type UploadAudioOptions = CompressOptions & {
  file: File;
  /** Pasta dentro do bucket. Ex.: `"blog"`. */
  folder?: string;
  bucket?: string;
};

export type UploadedAudio = CompressedAudio & {
  publicUrl: string;
  filePath: string;
};

/**
 * Comprime e envia o áudio para o Supabase Storage. Devolve a URL pública, a
 * duração e a forma de onda — tudo que o artigo precisa guardar.
 */
export async function uploadAudioToStorage(
  supabase: SupabaseClient,
  { file, folder = "blog", bucket = ARTICLE_AUDIO_BUCKET, ...compressOptions }: UploadAudioOptions
): Promise<UploadedAudio> {
  const compressed = await compressAudioFile(file, compressOptions);

  const safeFolder = folder.replace(/^\/+|\/+$/g, "");
  const filePath = `${safeFolder}/${generateFileId()}.m4a`;

  compressOptions.onPhase?.("uploading");
  const { error } = await supabase.storage.from(bucket).upload(filePath, compressed.file, {
    contentType: "audio/mp4",
    cacheControl: "31536000",
    upsert: false,
  });

  if (error) {
    throw new Error(`Erro ao enviar o áudio para o servidor: ${error.message}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return { ...compressed, publicUrl: data.publicUrl, filePath };
}

/**
 * Remove um áudio do bucket. Melhor-esforço: trocar o arquivo de um artigo nunca
 * deve falhar porque a limpeza do anterior não deu certo.
 */
export async function deleteAudioFromStorage(
  supabase: SupabaseClient,
  urlOrPath: string,
  bucket: string = ARTICLE_AUDIO_BUCKET
): Promise<boolean> {
  const filePath = extractStoragePath(urlOrPath, bucket);
  if (!filePath) return false;

  try {
    const { error } = await supabase.storage.from(bucket).remove([filePath]);
    if (error) {
      console.warn("Aviso ao remover áudio antigo do storage:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("Erro ao tentar deletar áudio do storage:", err);
    return false;
  }
}

/** Diz se a URL aponta para um arquivo nosso — só isso pode ser apagado. */
export function isManagedAudioUrl(url: string, bucket: string = ARTICLE_AUDIO_BUCKET): boolean {
  return isManagedStorageUrl(url, bucket);
}

/** `3725` → `"1:02:05"`, `185` → `"3:05"`. Usado no player e no admin. */
export function formatAudioDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "0:00";

  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`
    : `${minutes}:${paddedSeconds}`;
}

function generateFileId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
