// Backlink finder functionality
const { searchGoogle } = require('./googleSearch');
const config = require('../config/config');
const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Finds backlinks for a specific domain
 * 
 * @param {string} domain - Domain to find backlinks for
 * @param {number} numResults - Number of backlinks to find (default: 50)
 * @returns {Promise<Array>} - Array of backlink objects
 */
async function findBacklinks(domain, numResults = 50) {
  try {
    console.log(`Finding backlinks for domain: ${domain}`);
    
    // Remove protocol and trailing slash if present
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // Search for pages linking to the domain using Google Search
    // The "link:" operator is deprecated but we can use similar queries
    const searchQuery = `"${cleanDomain}" -site:${cleanDomain}`;
    
    const searchResults = await searchGoogle(searchQuery, numResults);
    
    // Format results as backlinks
    const backlinks = searchResults.map(result => ({
      sourceUrl: result.link,
      sourceTitle: result.title,
      targetDomain: cleanDomain,
      snippet: result.snippet
    }));
    
    console.log(`Found ${backlinks.length} potential backlinks for ${domain}`);
    return backlinks;
    
  } catch (error) {
    console.error(`Error finding backlinks for ${domain}:`, error.message);
    throw error;
  }
}

/**
 * Finds backlinks for a specific URL
 * 
 * @param {string} url - URL to find backlinks for
 * @param {number} numResults - Number of backlinks to find (default: 50)
 * @returns {Promise<Array>} - Array of backlink objects
 */
async function findBacklinksForUrl(url, numResults = 50) {
  try {
    console.log(`Finding backlinks for specific URL: ${url}`);
    
    // Search for pages linking to the specific URL
    const searchQuery = `"${url}"`;
    
    const searchResults = await searchGoogle(searchQuery, numResults);
    
    // Format results as backlinks
    const backlinks = searchResults.map(result => ({
      sourceUrl: result.link,
      sourceTitle: result.title,
      targetUrl: url,
      snippet: result.snippet
    }));
    
    console.log(`Found ${backlinks.length} potential backlinks for ${url}`);
    return backlinks;
    
  } catch (error) {
    console.error(`Error finding backlinks for ${url}:`, error.message);
    throw error;
  }
}

/**
 * Gets unique referring domains from a list of backlinks
 * 
 * @param {Array} backlinks - Array of backlink objects
 * @returns {Array} - Array of unique referring domains
 */
function getUniqueReferringDomains(backlinks) {
  // Extract domains from source URLs
  const domains = backlinks.map(backlink => {
    try {
      const url = new URL(backlink.sourceUrl);
      return url.hostname;
    } catch (error) {
      return null;
    }
  }).filter(domain => domain !== null);
  
  // Return unique domains
  return [...new Set(domains)];
}

/**
 * Verifies if backlinks actually contain links to the target
 * Optional function to check if the source pages actually contain links to the target
 * 
 * @param {Array} backlinks - Array of backlink objects
 * @param {string} targetUrl - Target URL or domain to check for
 * @returns {Promise<Array>} - Array of verified backlink objects with additional data
 */
async function verifyBacklinks(backlinks, targetUrl, maxConcurrent = 5) {
  console.log(`Verifying ${backlinks.length} backlinks for ${targetUrl}`);
  
  const verifiedBacklinks = [];
  const targetDomain = targetUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').replace(/\/.*$/, '');
  
  // Process backlinks in batches to control concurrency
  for (let i = 0; i < backlinks.length; i += maxConcurrent) {
    const batch = backlinks.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async (backlink) => {
      try {
        const response = await axios.get(backlink.sourceUrl, {
          timeout: config.request.timeout,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        // Look for links to the target domain
        const links = [];
        $(`a[href*="${targetDomain}"]`).each((i, el) => {
          const href = $(el).attr('href');
          const anchorText = $(el).text().trim();
          const isNofollow = $(el).attr('rel')?.includes('nofollow') || false;
          
          links.push({
            href,
            anchorText,
            isNofollow
          });
        });
        
        // If links were found, mark as verified
        if (links.length > 0) {
          return {
            ...backlink,
            verified: true,
            links,
            statusCode: response.status
          };
        }
        
        // No links found
        return {
          ...backlink,
          verified: false,
          links: [],
          statusCode: response.status
        };
        
      } catch (error) {
        // Error fetching the page
        return {
          ...backlink,
          verified: false,
          error: error.message,
          statusCode: error.response?.status || 0
        };
      }
    });
    
    // Wait for the current batch to complete
    const batchResults = await Promise.all(batchPromises);
    verifiedBacklinks.push(...batchResults);
    
    console.log(`Verified ${verifiedBacklinks.length} of ${backlinks.length} backlinks`);
  }
  
  return verifiedBacklinks;
}

module.exports = { 
  findBacklinks, 
  findBacklinksForUrl, 
  getUniqueReferringDomains,
  verifyBacklinks
};