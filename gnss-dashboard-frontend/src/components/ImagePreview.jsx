export default function ImagePreview({ photo, onClose }) {
  if (!photo) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center">
      <div className="relative max-w-4xl max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute -top-8 right-0 text-white text-sm"
        >
          Close
        </button>

        <img
          src={photo.imageUrl}
          alt={photo.name || "GNSS photo"}
          className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}
