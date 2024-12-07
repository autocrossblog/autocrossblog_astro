import fs from 'fs/promises';
import path from 'path';
import { isUnpicCompatible, unpicOptimizer, astroAsseetsOptimizer } from './images-optimization';
import type { ImageMetadata } from 'astro';
import type { OpenGraph } from '@astrolib/seo';

const load = async function () {
  let images: Record<string, () => Promise<unknown>> | undefined = undefined;
  try {
    images = import.meta.glob('~/assets/images/**/*.{jpeg,jpg,png,tiff,webp,gif,svg,JPEG,JPG,PNG,TIFF,WEBP,GIF,SVG}');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    // continue regardless of error
  }
  return images;
};

let _images: Record<string, () => Promise<unknown>> | undefined = undefined;

/** */
export const fetchLocalImages = async () => {
  _images = _images || (await load());
  if (_images) {
//    console.log('Loaded images:', Object.keys(_images));
  }
  return _images;
};

/** */
export const findImage = async (
  imagePath?: string | ImageMetadata | null
): Promise<string | ImageMetadata | undefined | null> => {
  if (!imagePath || typeof imagePath !== 'string') {
    console.error(`Invalid image path: ${imagePath}`);
    return null;
  }

  if (!imagePath.startsWith('~/assets/images')) {
    console.warn(`Invalid image path: ${imagePath}`);
    return null;
  }

  // Handle absolute paths
  if (path.isAbsolute(imagePath)) {
    console.log(`Processing absolute file path: ${imagePath}`);
    const images = await fetchLocalImages();
    const key = imagePath.replace(/\\/g, '/').replace('/src/assets', '~/assets');
    return images && typeof images[key] === 'function'
      ? ((await images[key]()) as { default: ImageMetadata })['default']
      : null;
  }

  // Handle "~/assets" paths
  if (imagePath.startsWith('~/assets/images')) {
    const images = await fetchLocalImages();
    const key = imagePath.replace('~/', '/src/');
    return images && typeof images[key] === 'function'
      ? ((await images[key]()) as { default: ImageMetadata })['default']
      : null;
  }

  console.error(`Unknown image path format: ${imagePath}`);
  return null;
};


/** */
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

const isValidImageUrl = (url: string): boolean => /\.(jpeg|jpg|png|tiff|webp|gif|svg)$/i.test(url);


export const generateGalleryImages = async (
  directoryPath: string,
  astroSite: URL | undefined = new URL(''),
  breakpoints: number[] = [300, 600, 1200, 1600, 2000],
  defaultWidth = 1200,
  defaultHeight = 800
): Promise<
  Array<{
    srcset: string;
    url: string;
    width?: number;
    height?: number;
  }>
> => {
  console.log("Processing directory:", directoryPath);

  // Ensure the path is valid
  if (!directoryPath || typeof directoryPath !== 'string') {
    throw new Error('A valid directory path is required');
  }

  const fullPath = path.resolve(directoryPath);
  let files: string[];

  try {
    files = await fs.readdir(fullPath);
  } catch (err) {
    console.error(`Error reading directory ${fullPath}:`, err);
    return [];
  }

  console.log(`Found files in ${fullPath}:`, files);

  // Filter image files
  const validImageFiles = files.filter((file) =>
    /\.(jpeg|jpg|png|tiff|webp|gif|svg)$/i.test(file)
  );

  if (!validImageFiles.length) {
    console.warn(`No valid image files found in ${fullPath}`);
    return [];
  }

  const optimizedImages = await Promise.all(
    validImageFiles.map(async (fileName) => {
      const imagePath = path.join(fullPath, fileName);
      console.log(`Processing image: ${imagePath}`);

      let srcset = '';
      let _image;

      try {
        const optimized = await astroAsseetsOptimizer(
          imagePath,
          breakpoints,
          defaultWidth,
          defaultHeight,
          'jpg'
        );

        srcset = optimized.map((img) => `${img.src} ${img.width}w`).join(', ');
        _image = optimized[0];

        if (typeof _image === 'object') {
          return {
            srcset,
            url: 'src' in _image && typeof _image.src === 'string' ? String(new URL(_image.src, astroSite)) : '',
            width: 'width' in _image && typeof _image.width === 'number' ? _image.width : undefined,
            height: 'height' in _image && typeof _image.height === 'number' ? _image.height : undefined,
          };
        }
      } catch (err) {
        console.error(`Error processing image ${imagePath}:`, err);
      }

      return { srcset: '', url: '' };
    })
  );

  return optimizedImages;
};
