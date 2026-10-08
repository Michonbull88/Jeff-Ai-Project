import { ExternalLink } from "lucide-react";
import { safeUrl } from "@/lib/validation";
import type { Source } from "@/types";
export function Sources({ sources }: { sources: Source[] }) {
  return (
    <div className="sources">
      <span>Sources</span>
      <div>
        {sources.map((source) => {
          const url = safeUrl(source.url);
          return url ? (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title={source.title}
            >
              {new URL(url).hostname.replace(/^www\./, "")}
              <ExternalLink size={11} />
            </a>
          ) : null;
        })}
      </div>
    </div>
  );
}
