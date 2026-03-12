export default function ImagePreview({ photo, onClose }) {
  if (!photo) return null;

  // Detect media URL from possible fields
  const mediaUrl =
    photo.videoUrl ||
    photo.imageUrl ||
    photo.url ||
    photo.file ||
    "";

  // Detect if it is a video
  const isVideo =
    mediaUrl.toLowerCase().endsWith(".mp4") ||
    mediaUrl.toLowerCase().endsWith(".mov") ||
    mediaUrl.toLowerCase().endsWith(".webm");

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
      <div className="relative max-w-4xl max-h-[90vh]">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute -top-8 right-0 text-white text-sm"
        >
          Close
        </button>

        {/* VIDEO */}
        {isVideo && (
          <video
            controls
            autoPlay
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
          >
            <source src={mediaUrl} type="video/mp4" />
            Your browser does not support video.
          </video>
        )}

        {/* IMAGE */}
        {!isVideo && mediaUrl && (
          <img
            src={mediaUrl}
            alt={photo.name || "GNSS photo"}
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
          />
        )}

        {/* Description */}
        {photo.description && (
          <p className="text-white text-sm mt-2 text-center">
            {photo.description}
          </p>
        )}
      </div>
    </div>
  );
}