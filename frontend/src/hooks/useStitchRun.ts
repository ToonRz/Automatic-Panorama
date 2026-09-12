import { useEffect, useRef, useState } from "react";

import { ApiError, submitStitch } from "../api";
import { COLD_START_THRESHOLD_MS, STITCH_REQUEST_TIMEOUT_MS } from "../constants/availability";
import { FALLBACK_CONFIG } from "../constants/config";
import { MIN_FILES } from "../constants/thresholds";
import type { DebugStateKey } from "../dev/debugStates";
import type { BackendAvailability } from "./useBackendAvailability";
import type { ApiErrorDetail, ClientConfig, Detector, StitchResponse } from "../types";
import { validatePreparedFiles, validateSelection } from "../utils/preflight";
import { prepareImage, type PreparedImage } from "../utils/prepareImage";

export type ScreenState = "empty" | "preparing" | "ready" | "working" | "complete" | "failed";

interface RunSettings {
  detector: Detector;
  ratioThreshold: number;
  ransacThreshold: number;
}

export interface FailedDetail {
  status: number;
  detail: ApiErrorDetail;
}

type Phase =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "working"; startedAt: number }
  | { kind: "complete"; result: StitchResponse; settings: RunSettings }
  | { kind: "failed"; error: FailedDetail };

// Tiny 16x16 solid-color PNGs, one per palette accent, standing in for a real
// photograph the way docs/mockups/ui-mock.html uses drawn artwork rather than
// a photo: synthetic and reusable (CLAUDE.md rule 7), never a stand-in for a
// production upload. A JPEG-typed File still decodes fine as a PNG byte
// stream; the browser sniffs content, not the `type` field.
const FAKE_FRAME_PNGS = [
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mPQ760jCTGMahjVMHw1AACgMDoQDL2v/QAAAABJRU5ErkJggg==",
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mPIf3yeJMQwqmFUw/DVAABb7iEfemNqDwAAAABJRU5ErkJggg==",
  "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAFklEQVR42mN4fzKbJMQwqmFUw/DVAABQKiMfwB5kKgAAAABJRU5ErkJggg==",
];

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// PNG decoders stop at the IEND chunk, so trailing zero bytes are ignored by
// the image pipeline while still giving `file.size` the realistic figure the
// UI displays.
function makeFakeFile(name: string, sizeBytes: number, type: string, variant: number): File {
  const png = decodeBase64(FAKE_FRAME_PNGS[variant % FAKE_FRAME_PNGS.length]);
  const bytes = new Uint8Array(Math.max(sizeBytes, png.length));
  bytes.set(png);
  return new File([bytes], name, { type });
}

function makeFakeFiles(count: number): File[] {
  return Array.from({ length: count }, (_, index) =>
    makeFakeFile(`IMG_44${12 + index}.jpg`, 3_100_000 + index * 40_000, "image/jpeg", index),
  );
}

/**
 * `fetch` rejects an aborted request with this, whether the abort came from
 * the timeout timer or from `cancel()` (docs/integration-spec.md section
 * 8.1). A `cancel()` bumps `requestIdRef` first, so by the time this would
 * matter here the request-id guard has already discarded it — anything that
 * reaches this check is therefore the timeout, not a user cancel.
 */
function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export interface UseStitchRunResult {
  state: ScreenState;
  files: File[];
  preparedImages: Array<PreparedImage | null>;
  setFiles: (files: File[]) => void;
  fileErrors: Array<string | null>;
  totalError: string | null;
  selectionError: string | null;
  hasPreflightErrors: boolean;
  detector: Detector;
  setDetector: (detector: Detector) => void;
  ratioThreshold: number;
  setRatioThreshold: (value: number) => void;
  ransacThreshold: number;
  setRansacThreshold: (value: number) => void;
  result: StitchResponse | null;
  resultSettings: RunSettings | null;
  isStale: boolean;
  error: FailedDetail | null;
  /**
   * Seconds left in the `SERVICE_BUSY` countdown (docs/integration-spec.md
   * section 7.3), or `null` when the failed state is not a busy rejection or
   * the countdown has finished.
   */
  busySecondsLeft: number | null;
  isColdStart: boolean;
  submit: (overrides?: Partial<RunSettings>) => void;
  /** docs/integration-spec.md section 8.2: only meaningful during `working`. */
  cancel: () => void;
  /** The section 8.2 note; cleared by the next submit or selection. */
  cancelledNote: string | null;
  /** Dev-only, mock-mode-only escape hatch for the state switcher. */
  forceDebugState: (key: DebugStateKey) => void;
}

/**
 * Single owner of the seven screen states (docs/ui-spec.md section 4), the
 * in-flight request, and the result. `state` is a pure function of `phase`
 * and `files.length`, so no other boolean can disagree with it.
 */
export function useStitchRun(
  config: ClientConfig = FALLBACK_CONFIG,
  prepare: typeof prepareImage = prepareImage,
  availability: BackendAvailability = "online",
): UseStitchRunResult {
  const [files, setFilesInternal] = useState<File[]>([]);
  const [preparedImages, setPreparedImages] = useState<Array<PreparedImage | null>>([]);
  const [fileErrors, setFileErrors] = useState<Array<string | null>>([]);
  const [totalError, setTotalError] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [detector, setDetectorInternal] = useState<Detector>(config.default_detector);
  const [ratioThreshold, setRatioThresholdInternal] = useState(config.ratio_threshold);
  const [ransacThreshold, setRansacThresholdInternal] = useState(
    config.ransac_reproj_threshold,
  );
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [isColdStart, setIsColdStart] = useState(false);
  const [busySecondsLeft, setBusySecondsLeft] = useState<number | null>(null);
  const [cancelledNote, setCancelledNote] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const detectorTouchedRef = useRef(false);
  const ratioTouchedRef = useRef(false);
  const ransacTouchedRef = useRef(false);

  useEffect(() => {
    if (!detectorTouchedRef.current) setDetectorInternal(config.default_detector);
    if (!ratioTouchedRef.current) setRatioThresholdInternal(config.ratio_threshold);
    if (!ransacTouchedRef.current) {
      setRansacThresholdInternal(config.ransac_reproj_threshold);
    }
  }, [config]);

  useEffect(() => {
    if (phase.kind !== "working") {
      setIsColdStart(false);
      return;
    }
    const elapsed = Date.now() - phase.startedAt;
    const remaining = COLD_START_THRESHOLD_MS - elapsed;
    if (remaining <= 0) {
      setIsColdStart(true);
      return;
    }
    setIsColdStart(false);
    const timer = setTimeout(() => setIsColdStart(true), remaining);
    return () => clearTimeout(timer);
  }, [phase]);

  /**
   * docs/integration-spec.md section 7.3: counts down from
   * `context.retry_after_seconds` once per second, with no automatic retry.
   */
  useEffect(() => {
    if (phase.kind !== "failed" || phase.error.detail.code !== "SERVICE_BUSY") {
      setBusySecondsLeft(null);
      return;
    }
    const retryAfter = phase.error.detail.context?.retry_after_seconds;
    const initial = typeof retryAfter === "number" ? retryAfter : 0;
    setBusySecondsLeft(initial);
    if (initial <= 0) return;
    const interval = setInterval(() => {
      setBusySecondsLeft((previous) => (previous === null || previous <= 1 ? 0 : previous - 1));
    }, 1_000);
    return () => clearInterval(interval);
  }, [phase]);

  function setFiles(nextFiles: File[]) {
    setCancelledNote(null);
    const selection = validateSelection(nextFiles, config);
    if (selection.selectionError) {
      setSelectionError(selection.selectionError);
      return;
    }
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setFilesInternal(nextFiles);
    setPreparedImages([]);
    setFileErrors(selection.fileErrors);
    setTotalError(null);
    setSelectionError(null);
    if (selection.fileErrors.some(Boolean) || nextFiles.length === 0) {
      setPhase({ kind: "idle" });
      return;
    }

    setPhase({ kind: "preparing" });
    const budget =
      config.max_input_long_edge_by_count[String(nextFiles.length)] ??
      Math.max(...Object.values(config.max_input_long_edge_by_count));
    void (async () => {
      const prepared: Array<PreparedImage | null> = [];
      const decodeErrors: Array<string | null> = [];
      for (const file of nextFiles) {
        try {
          prepared.push(await prepare(file, budget));
          decodeErrors.push(null);
        } catch {
          prepared.push(null);
          decodeErrors.push(
            `${file.name} can't be read in this browser. Export it as JPG and add it again.`,
          );
        }
      }
      if (requestIdRef.current !== requestId) return;
      const postflight = validatePreparedFiles(
        prepared.map((item) => item?.upload ?? new Blob()),
        config,
      );
      setPreparedImages(prepared);
      setFileErrors(
        decodeErrors.map((error, index) => error ?? postflight.fileErrors[index] ?? null),
      );
      setTotalError(postflight.totalError);
      setPhase({ kind: "idle" });
    })();
  }

  function setDetector(value: Detector) {
    detectorTouchedRef.current = true;
    setDetectorInternal(value);
  }

  function setRatioThreshold(value: number) {
    ratioTouchedRef.current = true;
    setRatioThresholdInternal(value);
  }

  function setRansacThreshold(value: number) {
    ransacTouchedRef.current = true;
    setRansacThresholdInternal(value);
  }

  function submit(overrides?: Partial<RunSettings>) {
    if (phase.kind === "working" || phase.kind === "preparing") return;
    if (busySecondsLeft !== null && busySecondsLeft > 0) return;
    if (
      files.length < MIN_FILES ||
      files.length > config.max_upload_files ||
      fileErrors.some(Boolean) ||
      totalError
    ) {
      return;
    }

    setCancelledNote(null);
    const settings: RunSettings = {
      detector: overrides?.detector ?? detector,
      ratioThreshold: overrides?.ratioThreshold ?? ratioThreshold,
      ransacThreshold: overrides?.ransacThreshold ?? ransacThreshold,
    };
    if (overrides?.detector) setDetector(overrides.detector);

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setPhase({ kind: "working", startedAt: Date.now() });

    // docs/integration-spec.md section 8.1: a sleeping instance can otherwise
    // hang past any point the user will wait for, with no explanation.
    const timeoutTimer = setTimeout(() => controller.abort(), STITCH_REQUEST_TIMEOUT_MS);

    submitStitch(
      preparedImages.map((item) => item?.upload).filter((file): file is File => !!file),
      {
        detector: settings.detector,
        ratioThreshold: settings.ratioThreshold,
        ransacReprojThreshold: settings.ransacThreshold,
      },
      controller.signal,
    ).then(
      (result) => {
        clearTimeout(timeoutTimer);
        if (requestIdRef.current !== requestId) return;
        setPhase({ kind: "complete", result, settings });
      },
      (caughtError: unknown) => {
        clearTimeout(timeoutTimer);
        // A cancelled request bumps requestIdRef before aborting (see
        // `cancel`), so anything reaching this point that still matches was
        // aborted by the timeout, not the user.
        if (requestIdRef.current !== requestId) return;
        if (isAbortError(caughtError)) {
          setPhase({
            kind: "failed",
            error: {
              status: 0,
              detail: {
                code: "REQUEST_TIMEOUT",
                message: "The server took too long to answer.",
              },
            },
          });
          return;
        }
        if (caughtError instanceof ApiError) {
          setPhase({
            kind: "failed",
            error: {
              status: caughtError.status,
              detail: caughtError.detail ?? {
                code: "UNKNOWN_ERROR",
                message: caughtError.message,
              },
            },
          });
          return;
        }
        // docs/integration-spec.md section 7.2: a rejected fetch is a dropped
        // connection when the server was known online, otherwise the server
        // was never reachable in the first place.
        const code = availability === "online" ? "NETWORK_ERROR" : "SERVER_UNREACHABLE";
        setPhase({
          kind: "failed",
          error: {
            status: 0,
            detail: {
              code,
              message:
                code === "NETWORK_ERROR"
                  ? "The connection dropped."
                  : "The server isn't reachable yet.",
            },
          },
        });
      },
    );
  }

  /**
   * docs/integration-spec.md section 8.2: aborts the in-flight request and
   * returns to the pre-submit state with the selection and settings intact.
   * Server work is not cancelled. Bumping `requestIdRef` first means the
   * request's own `.then`/`.catch` always no-ops, whatever order the abort
   * rejection and this update land in.
   */
  function cancel() {
    if (phase.kind !== "working") return;
    requestIdRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setCancelledNote(
      "Cancelled. The server may still be finishing that run, so the next try might report busy for a moment.",
    );
    setPhase({ kind: "idle" });
  }

  function forceDebugState(key: DebugStateKey) {
    // Checked as a literal (not the shared isMockApiEnabled() helper) so
    // esbuild folds this whole branch away within this file's own transform
    // when VITE_MOCK_API is unset, taking the dynamic fixture imports below
    // with it (docs/ui-spec.md section 10 / A12).
    if (import.meta.env.VITE_MOCK_API !== "true") return;

    switch (key) {
      case "empty":
        requestIdRef.current += 1;
        setFilesInternal([]);
        setPreparedImages([]);
        setFileErrors([]);
        setTotalError(null);
        setSelectionError(null);
        setPhase({ kind: "idle" });
        return;
      case "ready":
        requestIdRef.current += 1;
        setFilesInternal(makeFakeFiles(3));
        setPreparedImages([]);
        setFileErrors([]);
        setTotalError(null);
        setSelectionError(null);
        setPhase({ kind: "idle" });
        return;
      case "preparing":
        requestIdRef.current += 1;
        setFilesInternal(makeFakeFiles(3));
        setPreparedImages([]);
        setFileErrors([]);
        setTotalError(null);
        setSelectionError(null);
        setPhase({ kind: "preparing" });
        return;
      case "working":
        requestIdRef.current += 1;
        setFilesInternal(makeFakeFiles(3));
        setPreparedImages([]);
        setFileErrors([]);
        setTotalError(null);
        setSelectionError(null);
        setPhase({ kind: "working", startedAt: Date.now() });
        return;
      case "working-cold-start":
        requestIdRef.current += 1;
        setFilesInternal(makeFakeFiles(3));
        setPreparedImages([]);
        setFileErrors([]);
        setTotalError(null);
        setSelectionError(null);
        setPhase({ kind: "working", startedAt: Date.now() - COLD_START_THRESHOLD_MS - 1_000 });
        return;
      case "complete": {
        requestIdRef.current += 1;
        setFilesInternal(makeFakeFiles(3));
        setPreparedImages([]);
        setFileErrors([]);
        setTotalError(null);
        setSelectionError(null);
        const settings: RunSettings = { detector, ratioThreshold, ransacThreshold };
        import("../fixtures").then((fixtures) => {
          setPhase({
            kind: "complete",
            result: structuredClone(fixtures.successWithOverlayFixture),
            settings,
          });
        });
        return;
      }
      case "failed": {
        requestIdRef.current += 1;
        setFilesInternal(makeFakeFiles(3));
        setPreparedImages([]);
        setFileErrors([]);
        setTotalError(null);
        setSelectionError(null);
        import("../fixtures").then((fixtures) => {
          setPhase({
            kind: "failed",
            error: {
              status: fixtures.insufficientInliersError.status,
              detail: fixtures.insufficientInliersError.detail,
            },
          });
        });
        return;
      }
    }
  }

  const state: ScreenState =
    phase.kind === "idle" ? (files.length < MIN_FILES ? "empty" : "ready") : phase.kind;

  const result = phase.kind === "complete" ? phase.result : null;
  const resultSettings = phase.kind === "complete" ? phase.settings : null;
  const isStale =
    phase.kind === "complete" &&
    (phase.settings.detector !== detector ||
      phase.settings.ratioThreshold !== ratioThreshold ||
      phase.settings.ransacThreshold !== ransacThreshold);
  const error = phase.kind === "failed" ? phase.error : null;
  const hasPreflightErrors = fileErrors.some(Boolean) || totalError !== null;

  return {
    state,
    files,
    preparedImages,
    setFiles,
    fileErrors,
    totalError,
    selectionError,
    hasPreflightErrors,
    detector,
    setDetector,
    ratioThreshold,
    setRatioThreshold,
    ransacThreshold,
    setRansacThreshold,
    result,
    resultSettings,
    isStale,
    error,
    busySecondsLeft,
    isColdStart,
    submit,
    cancel,
    cancelledNote,
    forceDebugState,
  };
}
