import { LoaderIcon } from './icons';
import cn from 'classnames';

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
      className={cn('flex flex-row items-center justify-center', {
        'w-full h-[calc(100dvh-260px)] lg:h-[calc(100dvh-160px)]': !isInline,
        'w-full h-[320px]': isInline,
      })}
    >
      {status === 'streaming' ? (
        <div className="flex flex-col gap-4 items-center">
          <div className="animate-spin">
            <LoaderIcon />
          </div>
          <div className="text-center">
            <h3
              className={cn('font-semibold mb-2', {
                'text-lg': !isInline,
                'text-base': isInline,
              })}
            >
              🎨 Generating Logo...
            </h3>
            <p
              className={cn('text-muted-foreground', {
                'text-base': !isInline,
                'text-sm': isInline,
              })}
            >
              Creating professional logo designs based on your needs...
            </p>
            <p
              className={cn('text-muted-foreground mt-2', {
                'text-sm': !isInline,
                'text-xs': isInline,
              })}
            >
              Size: 1024x1024px
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div 
            className={cn(
              'relative rounded-lg overflow-hidden',
              {
                'p-0 md:p-8 mt-0 lg:mt-16': !isInline,
                'p-2': isInline,
              }
            )}
          >
            <picture
              className={cn(
                'block rounded-lg overflow-hidden',
                // 棋盘背景样式
                'bg-[linear-gradient(45deg,hsl(var(--muted-foreground)/0.1)_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--muted-foreground)/0.1)_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--muted-foreground)/0.1)_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--muted-foreground)/0.1)_75%)]',
                'bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]'
              )}
            >
              <img
                className={cn('rounded-lg', {
                  'w-full h-full max-w-[700px]': !isInline,
                  'w-[280px] h-[280px] max-w-[300px]': isInline,
                })}
                src={`data:image/png;base64,${content}`}
                alt={title}
              />
            </picture>
          </div>
          {!isInline && (
            <div className="text-center">
              <h3 className="text-lg font-semibold">
                ✅ Logo generation completed
              </h3>
              {/* <p className="text-sm text-muted-foreground mt-1">{title}</p> */}
              <p className="text-xs text-muted-foreground mt-1">
                Size: 1024x1024px | Format: PNG | Transparent Background
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
