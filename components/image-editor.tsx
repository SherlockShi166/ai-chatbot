import { LoaderIcon } from "./icons";
import cn from "classnames";

interface ImageEditorProps {
  title: string;
  content: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  status: string;
  isInline: boolean;
}

export function ImageEditor({
  title,
  content,
  status,
  isInline,
}: ImageEditorProps) {
  return (
    <div
      className={cn("flex flex-row items-center justify-center w-full", {
        "h-[calc(100dvh-60px)]": !isInline,
        "h-[200px]": isInline,
      })}
    >
      {status === "streaming" ? (
        <div className="flex flex-col gap-4 items-center">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
          <div className="text-center">
            <h3 className={cn("font-semibold mb-2", {
              "text-lg": !isInline,
              "text-base": isInline,
            })}>
              🎨 Generating Logo...
            </h3>
            <p className={cn("text-muted-foreground", {
              "text-base": !isInline,
              "text-sm": isInline,
            })}>
              Creating professional logo designs based on your needs...
            </p>
            <p className={cn("text-muted-foreground mt-2", {
              "text-sm": !isInline,
              "text-xs": isInline,
            })}>
              Size: 1024x1024px
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <picture>
            <img
              className={cn("w-full h-fit max-w-[800px] rounded-lg shadow-lg", {
                "p-0 md:p-20": !isInline,
              })}
              src={`data:image/png;base64,${content}`}
              alt={title}
            />
          </picture>
          <div className="text-center">
            <h3 className="text-lg font-semibold">
              ✅ Logo generation completed
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Size: 1024x1024px | Format: PNG
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
