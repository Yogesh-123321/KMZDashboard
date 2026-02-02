import L from "leaflet";

export function createImageThumbnailIcon(imageUrl) {
  return L.divIcon({
    className: "image-thumb-marker",
    html: `
      <div class="thumb-wrapper">
        <img src="${imageUrl}" />
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
     interactive: true 
  });
}
