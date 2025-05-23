import { google } from 'googleapis';
import fs from 'fs/promises';
import path from 'path';

// Google Search API configuration
const API_KEY = 'AIzaSyBZsiMCnaVzNAZ2a9oApnHbF7up3mrGRwk';
const CSE_ID = '4374d492fffa642c3';

/**
 * Performs a Google search with the given keyword
 * @param {string} keyword - The keyword to search for
 * @param {number} numResults - Number of results to retrieve (max 100)
 * @returns {Promise<Array<Object>>} - Array of search result objects
 */
export const searchGoogle = async (keyword, numResults = 100) => {
  try {
    console.log(`Searching Google for: ${keyword}`);
    const customsearch = google.customsearch('v1');
    
    // Google CSE only allows 10 results per request, so we need to make multiple requests
    const searchResults = [];
    const maxResultsPerRequest = 10;
    const numRequests = Math.ceil(numResults / maxResultsPerRequest);
    
    for (let i = 0; i < numRequests; i++) {
      const startIndex = i * maxResultsPerRequest + 1;
      
      if (startIndex > 100) break; // Google CSE has a hard limit of 100 results
      
      try {
        const response = await customsearch.cse.list({
          auth: API_KEY,
          cx: CSE_ID,
          q: keyword,
          start: startIndex,
          num: maxResultsPerRequest
        });
        
        if (response.data.items && response.data.items.length > 0) {
          searchResults.push(...response.data.items);
        }
        
        // Add a delay to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error in search request ${i+1}:`, error.message);
        
        // If we hit a rate limit or other API error, wait longer before retrying
        if (error.code === 429 || error.code === 403) {
          console.log('Rate limit hit, waiting 5 seconds before continuing...');
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    // Format results
    const formattedResults = searchResults.map(item => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink
    }));
    
    return formattedResults;
  } catch (error) {
    console.error('Error performing Google search:', error);
    return [];
  }
};

/**
 * Performs multiple keyword searches and combines results
 * @param {Array<string>} keywords - Array of keywords to search for
 * @param {number} numResultsPerKeyword - Number of results to retrieve per keyword
 * @returns {Promise<Array<Object>>} - Array of search result objects
 */
export const searchMultipleKeywords = async (keywords, numResultsPerKeyword = 10) => {
  const allResults = [];
  const uniqueUrls = new Set();
  
  for (const keyword of keywords) {
    try {
      const results = await searchGoogle(keyword, numResultsPerKeyword);
      
      // Add only unique URLs
      for (const result of results) {
        if (!uniqueUrls.has(result.link)) {
          uniqueUrls.add(result.link);
          allResults.push({
            ...result,
            keyword
          });
        }
      }
      
      // Add a delay between searches
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error searching for keyword "${keyword}":`, error);
    }
  }
  
  return allResults;
};

/**
 * Saves search results to a file
 * @param {Array<Object>} results - The search results to save
 * @param {string} keyword - The keyword used for the search
 * @returns {Promise<string>} - Path to the saved file
 */
export const saveSearchResults = async (results, keyword) => {
  try {
    const outputPath = path.join(process.cwd(), 'data', 'search-results');
    
    // Ensure directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Save as JSON
    const sanitizedKeyword = keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const jsonPath = path.join(outputPath, `${sanitizedKeyword}_results.json`);
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
    
    console.log(`Search results for "${keyword}" saved to ${jsonPath}`);
    return jsonPath;
  } catch (error) {
    console.error('Error saving search results:', error);
    throw error;
  }
};

/**
 * Extracts keywords from metadata and performs searches
 * @param {Array<Object>} metadata - Array of metadata objects
 * @param {number} numResultsPerKeyword - Number of results to retrieve per keyword
 * @returns {Promise<Array<Object>>} - Array of search result objects
 */
export const searchFromMetadata = async (metadata, numResultsPerKeyword = 10) => {
  // Extract keywords from metadata
  const keywordSet = new Set();
  
  metadata.forEach(item => {
    // Add keywords from meta tags
    if (item.keywords) {
      item.keywords.split(',').forEach(kw => {
        const trimmed = kw.trim();
        if (trimmed) keywordSet.add(trimmed);
      });
    }
    
    // Add h1 tags as keywords
    item.h1Tags.forEach(tag => keywordSet.add(tag));
    
    // Add some h2 tags as keywords (limit to first 3 to avoid too many searches)
    item.h2Tags.slice(0, 3).forEach(tag => keywordSet.add(tag));
  });
  
  // Convert Set to Array and limit to 100 keywords
  const keywords = [...keywordSet].slice(0, 100);
  console.log(`Extracted ${keywords.length} keywords for searching`);
  
  // Perform searches
  const allResults = await searchMultipleKeywords(keywords, numResultsPerKeyword);
  
  // Save all results together
  const outputPath = path.join(process.cwd(), 'data', 'search-results');
  await fs.mkdir(outputPath, { recursive: true });
  const jsonPath = path.join(outputPath, 'all_search_results.json');
  await fs.writeFile(jsonPath, JSON.stringify(allResults, null, 2));
  
  return allResults;
};

export default {
  searchGoogle,
  searchMultipleKeywords,
  saveSearchResults,
  searchFromMetadata
};