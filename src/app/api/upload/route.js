import { NextResponse } from 'next/server';

const validateImageFile = (file) => {
  const maxSize = 32 * 1024 * 1024; 
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

  if (!file) {
    return { valid: false, error: 'No file selected' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large. Maximum size is 32MB.' };
  }

  return { valid: true };
};

const uploadToImgBB = async (file) => {
  try {
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    
    // Validate API key exists
    if (!IMGBB_API_KEY) {
      console.error('IMGBB_API_KEY is not set in environment variables');
      return {
        success: false,
        error: 'Image upload service is not configured. Please contact support.'
      };
    }

    // Validate API key format (ImgBB keys are typically 32 characters)
    if (IMGBB_API_KEY.length < 10) {
      console.error('IMGBB_API_KEY appears to be invalid (too short)');
      return {
        success: false,
        error: 'Invalid image upload configuration. Please contact support.'
      };
    }
    
    console.log('Uploading image to ImgBB...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    
    const formData = new URLSearchParams();
    formData.append('image', base64);
    formData.append('key', IMGBB_API_KEY);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log('ImgBB response status:', response.status);
    console.log('ImgBB response:', responseText.substring(0, 200));

    if (!response.ok) {
      let errorDetails;
      try {
        const errorData = JSON.parse(responseText);
        errorDetails = errorData.error?.message || errorData.error || responseText;
      } catch {
        errorDetails = responseText;
      }
      
      if (response.status === 400) {
        return {
          success: false,
          error: 'Invalid ImgBB API key. Please check your environment configuration.'
        };
      }
      
      throw new Error(`ImgBB API error: ${response.status} - ${errorDetails}`);
    }

    // Parse the response text as JSON (body already read above)
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse ImgBB response as JSON:', parseError);
      return {
        success: false,
        error: 'Invalid response from image upload service'
      };
    }

    if (data.success) {
      console.log('Image uploaded successfully:', data.data.url);
      return {
        success: true,
        url: data.data.url,
        deleteUrl: data.data.delete_url,
        id: data.data.id
      };
    } else {
      throw new Error(data.error?.message || 'Upload failed');
    }
  } catch (error) {
    console.error('ImgBB upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const validation = validateImageFile(file);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const result = await uploadToImgBB(file);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'File uploaded successfully',
        url: result.url,
        deleteUrl: result.deleteUrl,
        id: result.id
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to upload file' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
