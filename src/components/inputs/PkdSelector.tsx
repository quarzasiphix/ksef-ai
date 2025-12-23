import React, { useEffect, useMemo, useState } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { X } from "lucide-react";

interface PkdSelectorProps {
  selected: string[];
  onChange: (codes: string[]) => void;
}

// Fallback minimal dataset in case remote fetch fails
const fallbackData: { code: string; desc: string; rate?: number }[] = [
  { code: "62.01.Z", desc: "Działalność związana z oprogramowaniem", rate: 12 },
  { code: "62.02.Z", desc: "Działalność związana z doradztwem informatycznym", rate: 12 },
  { code: "62.03.Z", desc: "Zarządzanie urządzeniami informatycznymi", rate: 12 },
  { code: "62.09.Z", desc: "Pozostała działalność IT", rate: 12 },
  { code: "47.91.Z", desc: "Handel internetowy", rate: 17 },
  { code: "70.22.Z", desc: "Pozostałe doradztwo w zakresie zarządzania", rate: 15 },
];

// Updated dataset (2025 fork)
const remoteUrl =
  "https://gist.githubusercontent.com/Razikus/37f5de4d4bd2da828c340664fec06079/raw";

export default function PkdSelector({ selected, onChange }: PkdSelectorProps) {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<typeof fallbackData>(fallbackData);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    // load remote dataset once
    fetch(remoteUrl)
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json)) {
          setData(json as any);
        }
      })
      .catch(() => {
        // keep fallback
      });
  }, []);

  const suggestions = useMemo(() => {
    if (!focused) return [];
    const list = query
      ? data.filter((d) => {
          const q = query.toLowerCase();
          return (
            d.code.toLowerCase().includes(q) ||
            d.desc.toLowerCase().includes(q)
          );
        })
      : data; // all codes when focused and no query
    return list;
  }, [query, data, focused]);

  const addCode = (code: string) => {
    if (!selected.includes(code)) {
      onChange([...selected, code]);
    }
    setQuery("");
  };

  const removeCode = (code: string) => {
    onChange(selected.filter((c) => c !== code));
  };

  const getRate = (code: string) => {
    const found = data.find((d) => d.code === code);
    return found?.rate ?? "?";
  };

  return (
    <div className="space-y-2">
      <Input
        placeholder="Wpisz kod lub nazwę działalności"
        value={query}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => setQuery(e.target.value)}
      />
      {suggestions.length > 0 && (
        <ScrollArea className="border rounded-md h-80 bg-background">
          <div className="divide-y">
            {suggestions.map((s) => (
              <button
                key={s.code}
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-accent"
                onClick={() => addCode(s.code)}
              >
                <span className="font-mono mr-2">{s.code}</span>
                {s.desc}
              </button>
            ))}
          </div>
        </ScrollArea>
      )}
      {selected.length > 0 && (
        <div className="space-y-1">
          {selected.map((code) => (
            <div
              key={code}
              className="flex items-center justify-between border rounded p-2 text-sm"
            >
              <div>
                <span className="font-mono mr-2">{code}</span>
                <span className="text-xs text-muted-foreground">
                  stawka {getRate(code)}%
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCode(code)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 