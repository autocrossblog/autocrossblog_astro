import { isUnpicCompatible, unpicOptimizer, astroAsseetsOptimizer } from './images-optimization';
import type { ImageMetadata } from 'astro';
import type { OpenGraph } from '@astrolib/seo';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs/promises';
import sizeOf from 'image-size';
import { getImage } from 'astro:assets';


const load = async function () {
  let images: Record<string, () => Promise<unknown>> | undefined = undefined;
  try {
    images = import.meta.glob('~/assets/images/**/*.{jpeg,jpg,png,tiff,webp,gif,svg,JPEG,JPG,PNG,TIFF,WEBP,GIF,SVG}');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // Continue regardless of error
  }
  return images;
};

let _images: Record<string, () => Promise<unknown>> | undefined = undefined;

/** Fetch local images */
export const fetchLocalImages = async () => {
  _images = _images || (await load());
  return _images;
};

/** Find a specific image */
export const findImage = async (
  imagePath?: string | ImageMetadata | null
): Promise<string | ImageMetadata | undefined | null> => {
  // Not string
  if (typeof imagePath !== 'string') {
    return imagePath;
  }

  // Absolute paths
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('/')) {
    return imagePath;
  }

  // Relative paths or not "~/assets/"
  if (!imagePath.startsWith('~/assets/images')) {
    return imagePath;
  }

  const images = await fetchLocalImages();
  const key = imagePath.replace('~/', '/src/');
  return images && typeof images[key] === 'function'
    ? ((await images[key]()) as { default: ImageMetadata })['default']
    : null;
};

/** Adapt OpenGraph Images */
export const adaptOpenGraphImages = async (
  openGraph: OpenGraph = {},
  astroSite: URL | undefined = new URL('')
): Promise<OpenGraph> => {
  if (!openGraph?.images?.length) {
    return openGraph;
  }

  const images = openGraph.images;
  const defaultWidth = 1200;
  const defaultHeight = 626;

  const adaptedImages = await Promise.all(
    images.map(async (image) => {
      if (image?.url) {
        const resolvedImage = (await findImage(image.url)) as ImageMetadata | string | undefined;
        if (!resolvedImage) {
          return {
            url: '',
          };
        }

        let _image;
        if (
          typeof resolvedImage === 'string' &&
          (resolvedImage.startsWith('http://') || resolvedImage.startsWith('https://')) &&
          isUnpicCompatible(resolvedImage)
        ) {
          _image = (await unpicOptimizer(resolvedImage, [defaultWidth], defaultWidth, defaultHeight, 'jpg'))[0];
        } else if (resolvedImage) {
          const dimensions =
            typeof resolvedImage !== 'string' && resolvedImage?.width <= defaultWidth
              ? [resolvedImage?.width, resolvedImage?.height]
              : [defaultWidth, defaultHeight];
          _image = (
            await astroAsseetsOptimizer(resolvedImage, [dimensions[0]], dimensions[0], dimensions[1], 'jpg')
          )[0];
        }

        if (typeof _image === 'object') {
          return {
            url: 'src' in _image && typeof _image.src === 'string' ? String(new URL(_image.src, astroSite)) : '',
            width: 'width' in _image && typeof _image.width === 'number' ? _image.width : undefined,
            height: 'height' in _image && typeof _image.height === 'number' ? _image.height : undefined,
          };
        }
        return {
          url: '',
        };
      }

      return {
        url: '',
      };
    })
  );

  return { ...openGraph, ...(adaptedImages ? { images: adaptedImages } : {}) };
};


/**
 * Resizes an image to multiple breakpoints and formats.
 * @param {string} inputPath - The path to the input image.
 * @param {number[]} breakpoints - List of widths for resizing.
 * @param {string} format - Desired output format (e.g., 'jpeg', 'png', 'webp').
 * @param {string} outputDir - Directory to save the resized images.
 * @returns {Promise<{ images: Array<{ path: string, width: number, height: number }>, srcset: string }>}
 */

export async function generateGalleryImages(inputPath, breakpoints, format, outputDir, publicOutputDir) {
  const results = [];

  // Ensure both output directories exist
  await fs.mkdir(outputDir, { recursive: true });
  await fs.mkdir(publicOutputDir, { recursive: true });

  const srcset = [];

  // Get the original image's metadata to calculate aspect ratio
  const metadata = await sharp(inputPath).metadata();
  if (!metadata.width || !metadata.height) {
    throw new Error('Unable to retrieve image dimensions for aspect ratio calculation.');
  }

  const aspectRatio = metadata.width / metadata.height;

  for (const width of breakpoints) {
    const outputFilename = `${path.basename(inputPath, path.extname(inputPath))}-${width}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);
    const publicOutputPath = path.join(publicOutputDir, outputFilename);

    let height = Math.round(width / aspectRatio); // Calculate height based on the aspect ratio

    try {
      // Check if the image already exists in `generated-images`
      await fs.access(outputPath);
      console.log(`Image already exists: ${outputPath}`);
    } catch {
      console.log(`Generating image: ${outputPath}`);
      // Generate the image if it doesn't exist
      await sharp(inputPath)
        .resize({ width, height }) // Set both width and calculated height
        .toFormat(format)
        .toFile(outputPath);
    }

    // Copy the image from `generated-images` to `public/assets/images`
    try {
      await fs.copyFile(outputPath, publicOutputPath);
      console.log(`Copied image to public directory: ${publicOutputPath}`);
    } catch (error) {
      console.error(`Error copying image to public directory: ${error.message}`);
    }

    // Generate a relative path for the public directory
    const relativePath = path.relative('public', publicOutputPath).replace(/\\/g, '/');
    srcset.push(`/${relativePath} ${width}w`);
    results.push({ path: `/${relativePath}`, width, height }); // Include height in the results
  }

  return {
    images: results,
    srcset: srcset.join(', '), // Generate `srcset` string
  };
}
