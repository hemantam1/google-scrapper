// Google Search functionality
const { google } = require('googleapis');
const config = require('../config/config');

/**
 * Performs a Google search for the specified keywords
 * 
 * @param {string} keywords - Search query keywords
 * @param {number} numResults - Number of search results to return (default: 10)
 * @returns {Promise<Array>} - Array of search result objects
 */
async function searchGoogle(keywords, numResults = 10) {
  try {
    const customsearch = google.customsearch('v1');
    
    console.log(`Searching Google for: "${keywords}"`);
    
    // Calculate how many API calls we need to make
    // Google CSE API returns max 10 results per call
    const numCalls = Math.ceil(numResults / 10);
    let allResults = [];
    
    // Make multiple API calls if necessary
    for (let i = 0; i < numCalls; i++) {
      const startIndex = i * 10 + 1;
      
      const response = await customsearch.cse.list({
        auth: config.google.apiKey,
        cx: config.google.cseId,
        q: keywords,
        start: startIndex,
        num: Math.min(10, numResults - allResults.length)
      });
      
      if (response.data.items && response.data.items.length > 0) {
        allResults = [...allResults, ...response.data.items];
      } else {
        break; // No more results
      }
    }
    
    // Format results
    const formattedResults = allResults.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink
    }));
    
    console.log(`Found ${formattedResults.length} results`);
    return formattedResults;
    
  } catch (error) {
    console.error('Error performing Google search:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

module.exports = { searchGoogle };