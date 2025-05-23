import URLParser from 'url-parse';
import fs from 'fs/promises';
import path from 'path';

// Define social media domains
const SOCIAL_MEDIA_DOMAINS = [
  'linkedin.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'pinterest.com',
  'reddit.com',
  'medium.com',
  'tumblr.com',
  'quora.com',
  'youtube.com',
  'tiktok.com',
  'snapchat.com',
  'threads.net',
  'flickr.com',
  'vimeo.com',
  'telegram.org',
  'whatsapp.com',
  'discord.com',
  'slack.com',
  'meetup.com'
];

// Define blogging/content platforms
const CONTENT_PLATFORMS = [
  'wordpress.com',
  'blogger.com',
  'medium.com',
  'substack.com',
  'ghost.org',
  'wix.com',
  'squarespace.com',
  'weebly.com',
  'hubspot.com',
  'typepad.com'
];

/**
 * Categorizes a URL as social media, content platform, or other
 * @param {string} url - The URL to categorize
 * @returns {Object} - Categorization result
 */
export const categorizeUrl = (url) => {
  try {
    const parsedUrl = new URLParser(url);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    
    // Check if it's a social media site
    if (SOCIAL_MEDIA_DOMAINS.some(domain => hostname.includes(domain))) {
      return {
        url,
        category: 'social_media',
        domain: hostname
      };
    }
    
    // Check if it's a content platform
    if (CONTENT_PLATFORMS.some(domain => hostname.includes(domain))) {
      return {
        url,
        category: 'content_platform',
        domain: hostname
      };
    }
    
    // Otherwise, it's another type of site
    return {
      url,
      category: 'other',
      domain: hostname
    };
  } catch (error) {
    console.error(`Error categorizing URL ${url}:`, error);
    return {
      url,
      category: 'error',
      domain: '',
      error: error.message
    };
  }
};

/**
 * Categorizes an array of URLs
 * @param {Array<Object>} searchResults - Array of search results
 * @returns {Object} - Object with categorized URLs
 */
export const categorizeSearchResults = (searchResults) => {
  const categories = {
    social_media: [],
    content_platform: [],
    other: [],
    error: []
  };
  
  // Process each search result
  searchResults.forEach(result => {
    const categorization = categorizeUrl(result.link);
    
    // Add the search result data to the categorization
    const enhancedResult = {
      ...categorization,
      title: result.title,
      snippet: result.snippet,
      keyword: result.keyword
    };
    
    // Add to the appropriate category
    categories[categorization.category].push(enhancedResult);
  });
  
  return categories;
};

/**
 * Saves categorized URLs to files
 * @param {Object} categorizedResults - Object with categorized URLs
 * @returns {Promise<string>} - Path to the saved files
 */
export const saveCategorizedResults = async (categorizedResults) => {
  try {
    const outputPath = path.join(process.cwd(), 'data', 'categorized-sites');
    
    // Ensure directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Save each category to a separate file
    for (const [category, results] of Object.entries(categorizedResults)) {
      const jsonPath = path.join(outputPath, `${category}_sites.json`);
      await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
      console.log(`${category} sites saved to ${jsonPath}`);
    }
    
    // Save all categories to a single file
    const allPath = path.join(outputPath, 'all_categorized_sites.json');
    await fs.writeFile(allPath, JSON.stringify(categorizedResults, null, 2));
    console.log(`All categorized sites saved to ${allPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('Error saving categorized results:', error);
    throw error;
  }
};

export default {
  categorizeUrl,
  categorizeSearchResults,
  saveCategorizedResults
};