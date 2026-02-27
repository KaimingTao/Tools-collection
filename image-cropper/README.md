# Image Cropper

A simple web application to upload an image, select a crop area, and download the cropped result.

## Features

- Drag and drop image upload
- File picker upload option
- Set crop position and size by `X`, `Y`, `Width`, and `Height` (pixels)
- Move the crop overlay by dragging inside the selection
- Resize the crop overlay by dragging corner handles
- Transparent crop area preview with dimmed outside region
- Download cropped image as PNG
- Touch support for crop dragging/resizing on mobile

## Files

- `index.html` - app structure
- `style.css` - app styling
- `app.js` - cropper logic

## How to Use

1. Open `index.html` in a web browser.
2. Upload an image:
   - Drag and drop it into the upload area, or
   - Click **Browse File** to select one.
3. Enter crop values in the parameter boxes (**Crop X**, **Crop Y**, **Crop Width**, **Crop Height**), or drag/resize directly on the image.
4. Drag the crop rectangle to move it, or drag corner handles to adjust size.
5. Click **Download Cropped Image** to save the result as `cropped-image.png`.

## Notes

- Crop values are automatically limited to the image boundaries.
- Overlay and parameter boxes stay synchronized in both directions.
- If a non-image file is uploaded, the app shows a validation message.
