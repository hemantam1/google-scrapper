import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extracts metadata from a URL
 * @param {string} url - The URL to extract metadata from
 * @returns {Promise<Object>} - Object containing extracted metadata
 */
export const extractMetadata = async (url) => {
  try {
    console.log(`Extracting metadata from: ${url}`);
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
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
};

/**
 * Processes a list of URLs to extract metadata
 * @param {Array<string>} urls - Array of URLs to process
 * @returns {Promise<Array<Object>>} - Array of metadata objects
 */
export const processUrls = async (urls) => {
  const results = [];
  
  for (const url of urls) {
    try {
      const cleanUrl = url.split(' ')[0]; // Extract only the URL part
      const metadata = await extractMetadata(cleanUrl);
      results.push(metadata);
      
      // Add a small delay to prevent rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Failed to process ${url}:`, error);
    }
  }
  
  return results;
};

/**
 * Saves the extracted metadata to JSON and returns it
 * @param {Array<Object>} metadataResults - The metadata results to save
 * @returns {Promise<Array<Object>>} - The saved metadata results
 */
export const saveMetadata = async (metadataResults) => {
  try {
    const outputPath = path.join(process.cwd(), 'data', 'extracted-metadata');
    
    // Ensure directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Save as JSON
    const jsonPath = path.join(outputPath, 'metadata.json');
    await fs.writeFile(jsonPath, JSON.stringify(metadataResults, null, 2));
    
    console.log(`Metadata saved to ${jsonPath}`);
    return metadataResults;
  } catch (error) {
    console.error('Error saving metadata:', error);
    throw error;
  }
};

export default {
  extractMetadata,
  processUrls,
  saveMetadata
};