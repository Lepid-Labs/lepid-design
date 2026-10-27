import { useEffect, useId, useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { cx } from "./cx.js";
import { Progress } from "./feedback.js";
import { IconButton } from "./IconButton.js";
import { SR_ONLY } from "./sr-only.js";
import { dragMayAccept, fileProblem, formatBytes, timeLeft } from "./upload-files.js";

export interface UploadContext {
  /** Report bytes sent so far (an XHR upload's progress event, a chunked loop). */
  onProgress: (loaded: number, total: number) => void;
  /** Aborted when the person removes the file mid-upload. */
  signal: AbortSignal;
}

export interface FileUploadProps {
  /** The dropzone's title: "Attach files". */
  label: ReactNode;
  /** What it takes, in words: "Images or PDFs, up to 10 MB". */
  hint?: ReactNode;
  /** The native accept list: "image/*,.pdf". Checked again on drop. */
  accept?: string;
  /** The accept list as people say it, for errors: "images or PDFs". */
  acceptLabel?: string;
  /** Largest file in bytes. */
  maxSize?: number;
  multiple?: boolean;
  /** Your upload: send the file, report progress, resolve when it is stored, reject
   *  with an Error whose message says what went wrong. The library never networks. */
  upload: (file: File, context: UploadContext) => Promise<unknown>;
  onUploaded?: (file: File, result: unknown) => void;
  onRemove?: (file: File) => void;
  disabled?: boolean;
  className?: string;
}

type Status = "uploading" | "done" | "error";
interface Item {
  id: number;
  file: File;
  status: Status;
  /** Share sent, 0..1. */
  sent: number;
  started: number;
  error?: string;
  /** Failed the accept or size check: nothing to retry. */
  refused?: boolean;
  preview?: string;
  abort?: AbortController;
}

let seq = 0;
const kind = (f: File) => (f.name.includes(".") ? f.name.split(".").pop()!.toUpperCase() : f.type.split("/")[1]?.toUpperCase() ?? "FILE");

/** A dropzone that is a real file input's label, so a click, Enter or Space opens
 *  the picker and screen readers find a file input, and a list where each file
 *  shows its thumbnail, type, size and its own progress, then success, or an error
 *  with Retry that keeps the file. Remove cancels. Changes are announced politely. */
export function FileUpload({ label, hint, accept, acceptLabel, maxSize, multiple = true, upload, onUploaded, onRemove, disabled, className }: FileUploadProps) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState<"over" | "invalid">();
  const [said, say] = useState("");
  const latest = useRef(items);
  latest.current = items;
  useEffect(() => () => latest.current.forEach((i) => (i.abort?.abort(), i.preview && URL.revokeObjectURL(i.preview))), []);

  const patch = (key: number, next: Partial<Item>) => setItems((list) => list.map((i) => (i.id === key ? { ...i, ...next } : i)));
  const start = (item: Item) => {
    const abort = new AbortController();
    patch(item.id, { status: "uploading", sent: 0, started: Date.now(), error: undefined, abort });
    upload(item.file, { signal: abort.signal, onProgress: (loaded, total) => patch(item.id, { sent: total > 0 ? loaded / total : 0 }) }).then(
      (result) => {
        patch(item.id, { status: "done", sent: 1, abort: undefined });
        say(`${item.file.name} uploaded.`);
        onUploaded?.(item.file, result);
      },
      (err) => {
        if (abort.signal.aborted) return;
        const error = err instanceof Error && err.message ? err.message : "The upload failed.";
        patch(item.id, { status: "error", error, abort: undefined });
        say(`${item.file.name} didn't upload: ${error} Retry is available.`);
      },
    );
  };
  const add = (files: FileList | null) => {
    const picked = [...(files ?? [])].slice(0, multiple ? undefined : 1);
    if (!picked.length) return;
    const added = picked.map((file): Item => {
      const error = fileProblem(file, { accept, maxSize, acceptLabel });
      const preview = !error && file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      return { id: ++seq, file, status: error ? "error" : "uploading", sent: 0, started: Date.now(), error, refused: !!error, preview };
    });
    setItems((list) => [...(multiple ? list : []), ...added]);
    const refused = added.filter((i) => i.error);
    say(refused.length ? refused.map((i) => i.error).join(" ") : `Uploading ${added.length === 1 ? added[0].file.name : `${added.length} files`}.`);
    added.filter((i) => !i.error).forEach(start);
  };
  const remove = (item: Item) => {
    item.abort?.abort();
    if (item.preview) URL.revokeObjectURL(item.preview);
    setItems((list) => list.filter((i) => i.id !== item.id));
    say(`${item.file.name} removed.`);
    onRemove?.(item.file);
    input.current?.focus();
  };

  const dragOver = (e: DragEvent<HTMLLabelElement>) => {
    if (disabled || !e.dataTransfer.types.includes("Files")) return;
    e.preventDefault(); // without it the browser opens the file instead
    setDrag(dragMayAccept([...e.dataTransfer.items].map((i) => i.type), accept) ? "over" : "invalid");
  };

  return (
    <div className={cx("ld-upload-field", className)}>
      <label
        className="ld-dropzone"
        data-ld-drag={drag}
        onDragEnter={dragOver}
        onDragOver={dragOver}
        onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setDrag(undefined)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDrag(undefined);
          add(e.dataTransfer.files);
        }}
      >
        <input
          ref={input}
          type="file"
          className="ld-dropzone__input"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          aria-describedby={hint ? `${id}-hint` : undefined}
          onChange={(e) => {
            add(e.target.files);
            e.target.value = ""; // so picking the same file again still fires
          }}
        />
        <span className="ld-dropzone__icon" aria-hidden="true" />
        <span className="ld-dropzone__title">{label}</span>
        <span className="ld-dropzone__prompt" aria-hidden="true">
          {drag === "invalid" ? "That file type isn't accepted" : drag ? "Drop to upload" : "Drop files here or browse"}
        </span>
        {hint && (
          <span className="ld-dropzone__hint" id={`${id}-hint`}>
            {hint}
          </span>
        )}
      </label>
      {items.length > 0 && (
        <ul className="ld-upload-list" aria-label="Files">
          {items.map((item) => {
            const { file, status } = item;
            const pct = Math.round(item.sent * 100);
            const meta =
              status === "uploading"
                ? [`${pct}%`, timeLeft(item.sent, 1, Date.now() - item.started)].filter(Boolean).join(" · ")
                : status === "done"
                  ? "Uploaded"
                  : item.error;
            return (
              <li key={item.id} className="ld-upload" data-ld-upload={status}>
                <span className="ld-upload__thumb" aria-hidden="true">
                  {item.preview ? <img src={item.preview} alt="" /> : kind(file)}
                </span>
                <span className="ld-upload__name">{file.name}</span>
                <span className="ld-upload__size">
                  {kind(file)} · {formatBytes(file.size)}
                </span>
                <span className="ld-upload__status">{meta}</span>
                {status === "uploading" && <Progress className="ld-upload__progress" value={pct} aria-label={`Uploading ${file.name}`} />}
                <span className="ld-upload__actions">
                  {status === "error" && !item.refused && (
                    <button type="button" className="ld-btn ld-btn--sm" onClick={() => start(item)} aria-label={`Retry ${file.name}`}>
                      Retry
                    </button>
                  )}
                  <IconButton label={`${status === "uploading" ? "Cancel" : "Remove"} ${file.name}`} onClick={() => remove(item)}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true">
                      <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                    </svg>
                  </IconButton>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p role="status" style={SR_ONLY}>
        {said}
      </p>
    </div>
  );
}
