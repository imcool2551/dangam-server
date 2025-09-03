import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface UploadUrlResponse {
  uploadUrl: string;
  key: string;
}

interface DownloadUrlResponse {
  downloadUrl: string;
}

async function uploadImageToS3() {
  const SERVER_URL = 'http://localhost:3000';
  const GROUP_ID = 'ngVBCiBGwQ8tz_up';
  const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJXRmFoMWRULXhSZXRXS3V0IiwiZGlzcGxheU5hbWUiOiLsmrDsg4HsmrEiLCJpYXQiOjE3NTY5MDI5NTIsImV4cCI6MTc1NjkyNDU1Mn0.olZiMk_R1N3K9Xg5s-doDOs6DctNsulFgAB_-1LyHEc';
  
  // 업로드할 이미지 파일 경로
  const imagePath = path.join(__dirname, 'images', 'test-image.jpg');
  
  try {
    // 1. 파일 존재 확인
    if (!fs.existsSync(imagePath)) {
      console.error('Image file not found at:', imagePath);
      console.log('Please place a test image file at scripts/images/test-image.jpg');
      return;
    }

    // 2. Presigned URL 요청
    console.log('🔄 Requesting presigned URL...');
    const uploadUrlResponse = await axios.post<UploadUrlResponse>(
      `${SERVER_URL}/s3/groups/${GROUP_ID}/upload-url`,
      {
        fileExtension: 'jpg'
      },
      {
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const { uploadUrl, key } = uploadUrlResponse.data;
    console.log('✅ Presigned URL received');
    console.log('Key:', key);

    // 3. S3에 파일 업로드
    console.log('🔄 Uploading to S3...');
    const fileBuffer = fs.readFileSync(imagePath);
    
    const uploadResponse = await axios.put(uploadUrl, fileBuffer, {
      headers: {
        'Content-Type': 'image/jpeg'
      }
    });

    if (uploadResponse.status === 200) {
      console.log('✅ File uploaded successfully to S3');
      console.log('S3 Key:', key);
    }

    // 4. 다운로드 URL 요청 (선택사항 - 업로드 확인용)
    console.log('🔄 Requesting download URL...');
    const downloadUrlResponse = await axios.get<DownloadUrlResponse>(
      `${SERVER_URL}/s3/groups/${GROUP_ID}/download-url`,
      {
        params: { key },
        headers: {
          'Authorization': `Bearer ${AUTH_TOKEN}`
        }
      }
    );

    const { downloadUrl } = downloadUrlResponse.data;
    console.log('✅ Download URL received');
    console.log('Download URL:', downloadUrl);

  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('❌ Error:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
    } else {
      console.error('❌ Unexpected error:', error);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  uploadImageToS3();
}