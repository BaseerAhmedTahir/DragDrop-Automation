/**
 * HTTP Connector for making external API requests
 */

export const executeHttpRequest = async (config) => {
  const { url, method = 'GET', headers = '{}', body } = config;
  
  if (!url) {
    throw new Error('URL is required for HTTP requests');
  }

  try {
    // Parse headers if provided as JSON string
    let parsedHeaders = {};
    if (headers && typeof headers === 'string') {
      try {
        parsedHeaders = JSON.parse(headers);
      } catch (e) {
        console.warn('Invalid JSON in headers, using empty headers');
      }
    } else if (headers && typeof headers === 'object') {
      parsedHeaders = headers;
    }

    // Set default content type for POST/PUT requests with body
    if ((method === 'POST' || method === 'PUT') && body && !parsedHeaders['Content-Type']) {
      parsedHeaders['Content-Type'] = 'application/json';
    }

    // Add User-Agent header
    parsedHeaders['User-Agent'] = 'AutoFlow-Workflow-Engine/1.0';

    const requestOptions = {
      method: method.toUpperCase(),
      headers: parsedHeaders,
    };

    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && body) {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    console.log(`🌐 Making ${method.toUpperCase()} request to: ${url}`);
    console.log(`📋 Headers:`, parsedHeaders);
    if (requestOptions.body) {
      console.log(`📄 Body:`, requestOptions.body);
    }

    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(url, {
      ...requestOptions,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    const result = {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data: responseData
    };

    if (response.ok) {
      console.log(`✅ HTTP request successful (${response.status})`);
      const responsePreview = typeof responseData === 'string' && responseData.length > 200 
        ? responseData.substring(0, 200) + '...' 
        : responseData;
      console.log(`📊 Response:`, responsePreview);
    } else {
      console.log(`❌ HTTP request failed (${response.status}): ${response.statusText}`);
      const errorPreview = typeof responseData === 'string' && responseData.length > 200 
        ? responseData.substring(0, 200) + '...' 
        : responseData;
      console.log(`📊 Error response:`, errorPreview);
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`⏰ HTTP request timeout for: ${url}`);
      throw new Error(`HTTP request timeout after 30 seconds`);
    }
    console.error(`💥 HTTP request error:`, error.message);
    throw new Error(`HTTP request failed: ${error.message}`);
  }
};