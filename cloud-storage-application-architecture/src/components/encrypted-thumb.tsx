"use client";

import { useEffect, useState } from "react";
import { File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { decryptChunk } from "@/lib/crypto-client";
import { getVaultKey } from "@/lib/vault";

/** بصمة مصغرة مشفرة — تُفك محلياً عبر مفتاح الخزنة فقط */
export default function EncryptedThumb({ fileId, className }: { fileId: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;
    (async () => {
      try {
        const key = await getVaultKey(); // صامت — لا تفتح نافذة الخزنة لمجرد العرض
        if (!key) return;
        const metaRes = await fetch(`/api/files/${fileId}/url`, { cache: "no-store" });
        if (!metaRes.ok) return;
        const meta = await metaRes.json();
        if (!meta.thumbnailUrl) return;
        const blobRes = await fetch(meta.thumbnailUrl);
        const buf = await blobRes.arrayBuffer();
        const plain = await decryptChunk(key, new Uint8Array(buf));
        const url = URL.createObjectURL(new Blob([plain.buffer as ArrayBuffer], { type: "image/jpeg" }));
        if (cancelled) URL.revokeObjectURL(url);
        else {
          objectUrl = url;
          setSrc(url);
        }
      } catch {
        /* بلا بصمة */
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-white/[0.02]", className)}>
        <FileIcon size={30} className="text-[#3d4468]" />
      </div>
    );
  }
  return <img src={src} alt="" className={cn("object-cover", className)} />;
}
