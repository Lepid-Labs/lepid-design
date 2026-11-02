import { useRef, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { ChipGroup, FilterChip } from "./Chip.js";
import { addTags } from "./tag-input.js";

export interface TagInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> {
  value: string[];
  onChange: (tags: string[]) => void;
  /** Names the group of tags for assistive tech. Default "Tags". */
  groupLabel?: string;
}

/** A list of short values typed into one field: a comma, Enter or leaving the field turns
 *  the text into tags (pasted "a, b, c" too); each tag is a FilterChip with a remove
 *  button, and Backspace in the empty field removes the last one. Duplicates are dropped,
 *  case-blind. Field wires its label, hint and error to the text box. */
export function TagInput({ value, onChange, groupLabel = "Tags", className, onKeyDown, onBlur, ...rest }: TagInputProps) {
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const commit = (text: string) => {
    const next = addTags(value, text);
    if (next.length !== value.length) onChange(next);
  };
  const remove = (at: number) => {
    onChange(value.filter((_, i) => i !== at));
    if (value.length === 1) input.current?.focus(); // no chip left for ChipGroup to move focus to
  };

  return (
    <ChipGroup label={groupLabel} className={className}>
      {value.map((tag, i) => (
        <FilterChip key={i} removeLabel={`Remove ${tag}`} onRemove={() => remove(i)}>
          {tag}
        </FilterChip>
      ))}
      <input
        ref={input}
        className="ld-input"
        {...rest}
        value={draft}
        onChange={(e) => {
          const parts = e.target.value.split(/[,\n]/);
          const last = parts.pop()!;
          if (parts.length) commit(parts.join(","));
          setDraft(parts.length ? last.trimStart() : last);
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.defaultPrevented) return;
          if (e.key === "Enter" && draft.trim()) {
            e.preventDefault(); // add the tag rather than submit the form
            commit(draft);
            setDraft("");
          } else if (e.key === "Backspace" && draft === "" && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={(e) => {
          onBlur?.(e);
          commit(draft);
          setDraft("");
        }}
      />
    </ChipGroup>
  );
}
