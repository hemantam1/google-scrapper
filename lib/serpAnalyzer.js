// SERP (Search Engine Results Page) analysis functionality
const { searchGoogle } = require('./googleSearch');

/**
 * Analyzes search results for a specific keyword
 * 
 * @param {string} keyword - Keyword to analyze
 * @param {number} numResults - Number of search results to analyze (default: 10)
 * @returns {Promise<Array>} - Array of top-ranking URLs with metadata
 */
async function analyzeSERP(keyword, numResults = 10) {
  try {
    console.log(`Analyzing SERP for keyword: "${keyword}"`);
    
    // Get search results for the keyword
    const searchResults = await searchGoogle(keyword, numResults);
    
    // Format the results
    const serpData = searchResults.map((result, index) => ({
      position: index + 1,
      url: result.link,
      title: result.title,
      displayUrl: result.displayLink,
      snippet: result.snippet
    }));
    
    console.log(`Found ${serpData.length} results in SERP for "${keyword}"`);
    return serpData;
    
  } catch (error) {
    console.error(`Error analyzing SERP for "${keyword}":`, error.message);
    throw error;
  }
}

/**
 * Extracts unique domains from a list of URLs
 * 
 * @param {Array<string>} urls - List of URLs to extract domains from
 * @returns {Array<string>} - List of unique domains
 */
function extractUniqueDomains(urls) {
  const domains = urls.map(url => {
    try {
      // Extract domain from URL
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (error) {
      // Return the original URL if it's not a valid URL
      return url;
    }
  });
  
  // Return unique domains
  return [...new Set(domains)];
}

module.exports = { analyzeSERP, extractUniqueDomains };