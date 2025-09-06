import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TranscodeResult {
  outputPath: string;
  width: number;
  height: number;
}

export interface ImageMetadata {
  format: string;
  width: number;
  height: number;
}

@Injectable()
export class ImageTranscodingService {
  private readonly logger = new Logger(ImageTranscodingService.name);

  async checkEngine(): Promise<boolean> {
    try {
      await new Promise((resolve, reject) => {
        const magick = spawn('magick', ['-version']);
        magick.on('close', (code) => {
          if (code === 0) resolve(true);
          else reject(new Error('ImageMagick not found'));
        });
        magick.on('error', reject);
      });
      return true;
    } catch {
      return false;
    }
  }

  async transcode(
    inputPath: string,
    outputPath: string,
  ): Promise<TranscodeResult> {
    const metadata = await this.getMetadata(inputPath);
    await fs.mkdir(outputPath, { recursive: true });

    const outputFilename = 'image.webp';
    const finalOutputPath = path.join(outputPath, outputFilename);

    // Calculate optimal size for mobile while maintaining aspect ratio
    const maxDimension = 1200;
    const aspectRatio = metadata.width / metadata.height;

    let targetWidth = metadata.width;
    let targetHeight = metadata.height;

    if (metadata.width > maxDimension || metadata.height > maxDimension) {
      if (metadata.width > metadata.height) {
        // Landscape: limit width, calculate height
        targetWidth = maxDimension;
        targetHeight = Math.round(maxDimension / aspectRatio);
      } else {
        // Portrait: limit height, calculate width
        targetHeight = maxDimension;
        targetWidth = Math.round(maxDimension * aspectRatio);
      }
    }

    const args = [
      'convert',
      inputPath,
      '-resize',
      `${targetWidth}x${targetHeight}`,
      '-quality',
      '85',
      '-strip',
      '-define',
      'webp:method=6',
      '-define',
      'webp:alpha-quality=90',
      finalOutputPath,
    ];

    await this.runEngine(args);

    const transcodedMetadata = await this.getMetadata(finalOutputPath);

    return {
      outputPath: finalOutputPath,
      width: transcodedMetadata.width,
      height: transcodedMetadata.height,
    };
  }

  private async getMetadata(filePath: string): Promise<ImageMetadata> {
    return new Promise((resolve, reject) => {
      const args = ['identify', '-format', '%m|%w|%h', filePath];

      const magick = spawn('magick', args);
      let output = '';
      let error = '';

      magick.stdout.on('data', (data) => {
        output += data.toString();
      });

      magick.stderr.on('data', (data) => {
        error += data.toString();
      });

      magick.on('close', (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `ImageMagick identify exited with code ${code}: ${error}`,
            ),
          );
          return;
        }

        try {
          const [format, width, height] = output.trim().split('|');

          if (!width || !height) {
            reject(new Error('Unable to read image dimensions'));
            return;
          }

          resolve({
            format: format.toLowerCase(),
            width: parseInt(width),
            height: parseInt(height),
          });
        } catch (e: any) {
          reject(new Error(`Failed to parse metadata: ${e.message}`));
        }
      });
    });
  }

  private runEngine(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Running ImageMagick with args: ${args.join(' ')}`);

      const magick = spawn('magick', args);
      let lastError = '';

      magick.stderr.on('data', (data) => {
        lastError = data.toString();
      });

      magick.on('close', (code) => {
        if (code === 0) {
          this.logger.debug('ImageMagick completed successfully');
          resolve();
        } else {
          this.logger.error(
            `ImageMagick failed with code ${code}: ${lastError}`,
          );
          reject(
            new Error(`ImageMagick failed with code ${code}: ${lastError}`),
          );
        }
      });

      magick.on('error', (error) => {
        this.logger.error(`ImageMagick error: ${error.message}`);
        reject(error);
      });
    });
  }
}
