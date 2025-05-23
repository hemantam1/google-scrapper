import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import URLParser from 'url-parse';

// Common URL patterns that indicate article submission opportunities
const SUBMISSION_URL_PATTERNS = [
  '/write-for-us',
  '/contribute',
  '/submission',
  '/submit',
  '/guest-post',
  '/write-with-us',
  '/contributors',
  '/guest-blogging',
  '/guest-contributor',
  '/authors',
  '/become-a-contributor',
  '/join-us',
  '/publish',
  '/guidelines'
];

// Keywords that suggest article submission in page content
const SUBMISSION_KEYWORDS = [
  'write for us',
  'submit article',
  'guest post',
  'contribute',
  'become a contributor',
  'guest author',
  'submission guidelines',
  'content submission',
  'article submission',
  'become an author',
  'publish with us',
  'join our writers',
  'guest blogging',
  'submit your content',
  'write for',
  'author guidelines'
];

/**
 * Analyze a site's homepage to check for article submission opportunities
 * @param {string} url - The URL to analyze
 * @returns {Promise<Object>} - Analysis results
 */
export const analyzeSiteForSubmission = async (url) => {
  try {
    console.log(`Analyzing site for submission opportunities: ${url}`);
    const parsedUrl = new URLParser(url);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    
    // Fetch the homepage
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Initialize results
    const result = {
      url,
      domain: parsedUrl.hostname,
      acceptsSubmissions: false,
      confidence: 0, // 0-100 scale
      submissionPageUrls: [],
      submissionKeywordsFound: [],
      notes: []
    };
    
    // Check if there are links to submission pages
    $('a').each((i, el) => {
      const href = $(el).attr('href');
      const linkText = $(el).text().toLowerCase().trim();
      
      if (!href) return;
      
      // Check URL patterns
      for (const pattern of SUBMISSION_URL_PATTERNS) {
        if (href.includes(pattern) || linkText.includes(pattern.replace(/[/-]/g, ' ').trim())) {
          let fullUrl = href;
          if (href.startsWith('/')) {
            fullUrl = `${baseUrl}${href}`;
          } else if (!href.startsWith('http')) {
            fullUrl = `${baseUrl}/${href}`;
          }
          
          if (!result.submissionPageUrls.includes(fullUrl)) {
            result.submissionPageUrls.push(fullUrl);
            result.confidence += 20; // Increase confidence for each submission URL found
          }
        }
      }
      
      // Check link text for keywords
      for (const keyword of SUBMISSION_KEYWORDS) {
        if (linkText.includes(keyword)) {
          if (!result.submissionKeywordsFound.includes(keyword)) {
            result.submissionKeywordsFound.push(keyword);
            result.confidence += 15; // Increase confidence for each keyword found
          }
        }
      }
    });
    
    // Check page content for keywords
    const pageText = $('body').text().toLowerCase();
    for (const keyword of SUBMISSION_KEYWORDS) {
      if (pageText.includes(keyword)) {
        if (!result.submissionKeywordsFound.includes(keyword)) {
          result.submissionKeywordsFound.push(keyword);
          result.confidence += 10; // Increase confidence for each keyword found in body text
        }
      }
    }
    
    // Check for contact forms that might be used for submissions
    const hasContactForm = $('form').length > 0 && 
      (pageText.includes('contact') || pageText.includes('message') || pageText.includes('email'));
    
    if (hasContactForm) {
      result.notes.push('Has contact form that might be used for submissions');
      result.confidence += 5;
    }
    
    // Check for CMS indicators
    const hasWordPress = $('meta[name="generator"]').attr('content')?.includes('WordPress') || 
      $('link[rel="https://api.w.org/"]').length > 0;
    
    if (hasWordPress) {
      result.notes.push('WordPress site (more likely to accept submissions)');
      result.confidence += 10;
    }
    
    // Determine final acceptance status based on confidence score
    result.confidence = Math.min(result.confidence, 100); // Cap at 100
    result.acceptsSubmissions = result.confidence >= 30; // At least 30% confident
    
    if (result.acceptsSubmissions) {
      result.notes.push(`Confidence level: ${result.confidence}%`);
    } else {
      result.notes.push('No clear submission opportunities found');
    }
    
    return result;
  } catch (error) {
    console.error(`Error analyzing site ${url}:`, error.message);
    return {
      url,
      domain: new URLParser(url).hostname,
      acceptsSubmissions: false,
      confidence: 0,
      submissionPageUrls: [],
      submissionKeywordsFound: [],
      notes: [`Error during analysis: ${error.message}`]
    };
  }
};

/**
 * Analyzes a batch of sites for article submission opportunities
 * @param {Array<Object>} sites - Array of site objects
 * @param {number} batchSize - Number of sites to process in parallel
 * @returns {Promise<Array<Object>>} - Analysis results
 */
export const analyzeBatchOfSites = async (sites, batchSize = 5) => {
  const results = [];
  
  console.log(`Analyzing ${sites.length} sites for submission opportunities...`);
  
  // Process in batches to avoid overwhelming the network
  for (let i = 0; i < sites.length; i += batchSize) {
    const batch = sites.slice(i, i + batchSize);
    console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(sites.length/batchSize)}`);
    
    const batchPromises = batch.map(site => analyzeSiteForSubmission(site.url));
    const batchResults = await Promise.allSettled(batchPromises);
    
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        // Merge the original site data with the analysis results
        results.push({
          ...batch[index],
          ...result.value
        });
      } else {
        console.error(`Failed to analyze ${batch[index].url}:`, result.reason);
        results.push({
          ...batch[index],
          acceptsSubmissions: false,
          confidence: 0,
          submissionPageUrls: [],
          submissionKeywordsFound: [],
          notes: [`Analysis failed: ${result.reason}`]
        });
      }
    });
    
    // Pause between batches to avoid rate limiting
    if (i + batchSize < sites.length) {
      console.log('Pausing between batches...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  return results;
};

/**
 * Filters and organizes analyzed sites
 * @param {Array<Object>} analyzedSites - Array of analyzed site objects
 * @returns {Object} - Filtered sites by category
 */
export const organizePotentialSites = (analyzedSites) => {
  const organized = {
    highPotential: [], // High confidence (70-100%)
    mediumPotential: [], // Medium confidence (40-69%)
    lowPotential: [], // Low confidence (30-39%)
    rejected: [] // Not accepting submissions (<30%)
  };
  
  analyzedSites.forEach(site => {
    if (site.confidence >= 70) {
      organized.highPotential.push(site);
    } else if (site.confidence >= 40) {
      organized.mediumPotential.push(site);
    } else if (site.confidence >= 30) {
      organized.lowPotential.push(site);
    } else {
      organized.rejected.push(site);
    }
  });
  
  return organized;
};

/**
 * Saves organized potential sites to files
 * @param {Object} organizedSites - Organized site objects
 * @returns {Promise<string>} - Path to the saved directory
 */
export const savePotentialSites = async (organizedSites) => {
  try {
    const outputPath = path.join(process.cwd(), 'data', 'potential-websites');
    
    // Ensure directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Save each category to a separate file
    for (const [category, sites] of Object.entries(organizedSites)) {
      const jsonPath = path.join(outputPath, `${category}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(sites, null, 2));
      console.log(`${category} sites saved to ${jsonPath}`);
    }
    
    // Save all categories to a single file
    const allPath = path.join(outputPath, 'all_potential_sites.json');
    const allSites = {
      highPotential: organizedSites.highPotential,
      mediumPotential: organizedSites.mediumPotential,
      lowPotential: organizedSites.lowPotential,
      rejected: organizedSites.rejected,
      summary: {
        total: organizedSites.highPotential.length + 
               organizedSites.mediumPotential.length + 
               organizedSites.lowPotential.length + 
               organizedSites.rejected.length,
        accepted: organizedSites.highPotential.length + 
                 organizedSites.mediumPotential.length + 
                 organizedSites.lowPotential.length,
        rejected: organizedSites.rejected.length
      }
    };
    
    await fs.writeFile(allPath, JSON.stringify(allSites, null, 2));
    console.log(`All potential sites saved to ${allPath}`);
    
    return outputPath;
  } catch (error) {
    console.error('Error saving potential sites:', error);
    throw error;
  }
};

export default {
  analyzeSiteForSubmission,
  analyzeBatchOfSites,
  organizePotentialSites,
  savePotentialSites
};