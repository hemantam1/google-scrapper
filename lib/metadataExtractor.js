// Metadata extraction functionality
const axios = require('axios');
const cheerio = require('cheerio');
const config = require('../config/config');

/**
 * Extracts metadata from a webpage
 * 
 * @param {string} url - URL of the webpage to extract metadata from
 * @returns {Promise<Object>} - Object containing extracted metadata
 */
async function extractMetadata(url) {
  try {
    console.log(`Extracting metadata from: ${url}`);
    
    const response = await axios.get(url, {
      timeout: config.request.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    // Extract metadata
    const metadata = {
      url,
      title: $('title').text().trim(),
      description: $('meta[name="description"]').attr('content') || '',
      keywords: $('meta[name="keywords"]').attr('content') || '',
      h1Tags: [],
      h2Tags: [],
      h3Tags: []
    };
    
    // Extract heading tags
    $('h1').each((i, el) => {
      const text = $(el).text().trim();
      if (text) metadata.h1Tags.push(text);
    });
    
    $('h2').each((i, el) => {
      const text = $(el).text().trim();
      if (text) metadata.h2Tags.push(text);
    });
    
    $('h3').each((i, el) => {
      const text = $(el).text().trim();
      if (text) metadata.h3Tags.push(text);
    });
    
    return metadata;
    
  } catch (error) {
    console.error(`Error extracting metadata from ${url}:`, error.message);
    // Return a partial metadata object with error information
    return {
      url,
      error: error.message,
      title: '',
      description: '',
      keywords: '',
      h1Tags: [],
      h2Tags: [],
      h3Tags: []
    };
  }
}

/**
 * Extracts metadata from multiple webpages with concurrency control
 * 
 * @param {Array<string>} urls - Array of URLs to extract metadata from
 * @returns {Promise<Array<Object>>} - Array of metadata objects
 */
async function extractMetadataFromUrls(urls) {
  const results = [];
  const concurrentRequests = config.request.concurrentRequests;
  
  console.log(`Extracting metadata from ${urls.length} URLs (${concurrentRequests} concurrent requests)`);
  
  // Process URLs in batches to control concurrency
  for (let i = 0; i < urls.length; i += concurrentRequests) {
    const batch = urls.slice(i, i + concurrentRequests);
    const batchPromises = batch.map(url => extractMetadata(url));
    
    // Wait for the current batch to complete
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    console.log(`Processed ${Math.min(i + concurrentRequests, urls.length)} of ${urls.length} URLs`);
  }
  
  return results;
}

module.exports = { extractMetadata, extractMetadataFromUrls };