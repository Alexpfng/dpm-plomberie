import { useState, useRef, useEffect } from "react";
import { Input } from "@/crm/components/ui/input";
import { cn } from "@/crm/lib/utils";
import { Copy, Check, Pencil } from "lucide-react";

interface EditableFieldProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  copyable?: boolean;
  small?: boolean;
  type?: string;
  placeholder?: string;
}

export function EditableField({ label, value = "", onChange, copyable, small, type = "text", placeholder }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocalValue(value); }, [value]);

  const commit = () => {
    setEditing(false);
    if (localValue !== value) onChange(localValue);
  };

  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (editing) {
    return (
      <div>
        <span className={cn("text-muted-foreground", small ? "text-[10px]" : "text-xs")}>{label}</span>
        <Input
          ref={inputRef}
          type={type}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setLocalValue(value); setEditing(false); } }}
          className={cn("h-6 px-1 text-xs border-primary/50", small && "text-[11px]")}
          autoFocus
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div
      className="group cursor-pointer rounded px-0.5 hover:bg-muted/60 transition-colors"
      onClick={() => setEditing(true)}
    >
      <span className={cn("text-muted-foreground", small ? "text-[10px]" : "text-xs")}>{label}</span>
      <div className="flex items-center gap-1">
        <p className={cn("font-medium", small ? "text-xs" : "")}>{value || "—"}</p>
        <Pencil className="h-2.5 w-2.5 text-muted-foreground/0 group-hover:text-muted-foreground/60 transition-opacity" />
        {copyable && value && (
          <button
            onClick={(e) => { e.stopPropagation(); copy(); }}
            className="text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3 text-[hsl(var(--success))]" /> : <Copy className="h-3 w-3" />}
          </button>
        )}
      </div>
    </div>
  );
}
