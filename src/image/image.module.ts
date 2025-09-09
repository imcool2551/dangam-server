import { Module } from '@nestjs/common';
import { ImageTranscoder } from './components/image-transcoder';

@Module({
  providers: [ImageTranscoder],
  exports: [ImageTranscoder],
})
export class ImageModule {}