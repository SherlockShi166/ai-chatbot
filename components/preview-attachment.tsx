import type { Attachment } from 'ai';

import { CrossSmallIcon, LoaderIcon } from './icons';
import { Button } from './ui/button';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
}) => {
  const { name, url, contentType } = attachment;

  return (
    <div data-testid="input-attachment-preview" className="flex flex-col gap-2">
      <div className="w-20 h-20 aspect-video bg-muted rounded-md relative flex flex-col items-center justify-center group">
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={url}
              src={url}
              alt={name ?? 'An image attachment'}
              className="rounded-md size-full object-cover"
            />
          ) : (
            <div className="" />
          )
        ) : (
          <div className="" />
        )}

        {isUploading && (
          <div
            data-testid="input-attachment-loader"
            className="animate-spin absolute text-zinc-500"
          >
            <LoaderIcon />
          </div>
        )}

        {!isUploading && onRemove && (
          <Button
            data-testid="remove-attachment-button"
            className="absolute -top-2 -right-2 w-5 h-5 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onRemove();
            }}
            variant="destructive"
            size="sm"
          >
            <CrossSmallIcon size={12} />
          </Button>
        )}
      </div>
      {/*<div className="text-xs text-zinc-500 max-w-16 truncate">{name}</div>*/}
    </div>
  );
};
