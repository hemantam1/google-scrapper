// Main application entry point
const { searchGoogle } = require('./lib/googleSearch');
const { extractMetadataFromUrls } = require('./lib/metadataExtractor');
const { findBacklinks, findBacklinksForUrl, verifyBacklinks } = require('./lib/backlinkFinder');
const { exportToJson, exportToCsv } = require('./lib/exporters');
const { analyzeTopRankingBacklinks, exportBacklinkAnalysis } = require('./lib/backlinkAnalyzer');

/**
 * Main function to search, extract metadata, and export results
 * 
 * @param {Object} options - Options for the scraper
 * @param {string} options.keywords - Keywords to search for
 * @param {number} options.numResults - Number of search results to process
 * @param {boolean} options.findBacklinks - Whether to find backlinks
 * @param {string} options.targetDomain - Domain to find backlinks for (if findBacklinks is true)
 * @param {string} options.targetUrl - Specific URL to find backlinks for
 * @param {boolean} options.analyzeCompetitors - Whether to analyze backlinks for top-ranking pages
 * @param {boolean} options.verifyLinks - Whether to verify backlinks by checking source pages
 * @param {string} options.outputPrefix - Prefix for output filenames
 * @returns {Promise<Object>} - Result summary
 */
async function run(options) {
  try {
    console.log('Starting SEO metadata scraper...');
    console.log('Options:', options);
    
    const startTime = Date.now();
    const results = {};
    
    // Search Google and extract metadata
    if (options.keywords && !options.analyzeCompetitors) {
      console.log('\n--- SEARCHING GOOGLE ---');
      const searchResults = await searchGoogle(options.keywords, options.numResults);
      results.searchResults = searchResults;
      
      // Extract URLs from search results
      const urls = searchResults.map(result => result.link);
      
      // Extract metadata from search result URLs
      if (urls.length > 0) {
        console.log('\n--- EXTRACTING METADATA ---');
        const metadata = await extractMetadataFromUrls(urls);
        results.metadata = metadata;
        
        // Export metadata
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filePrefix = options.outputPrefix || `search_${timestamp}`;
        
        console.log('\n--- EXPORTING RESULTS ---');
        await exportToJson(metadata, `${filePrefix}_metadata`);
        await exportToCsv(metadata, `${filePrefix}_metadata`);
      }
    }
    
    // Find backlinks for a domain
    if (options.findBacklinks && options.targetDomain) {
      console.log('\n--- FINDING BACKLINKS FOR DOMAIN ---');
      const backlinks = await findBacklinks(options.targetDomain, options.numBacklinks || 50);
      results.backlinks = backlinks;
      
      // Verify backlinks if requested
      if (options.verifyLinks) {
        console.log('\n--- VERIFYING BACKLINKS ---');
        results.verifiedBacklinks = await verifyBacklinks(backlinks, options.targetDomain);
      }
      
      // Export backlinks
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePrefix = options.outputPrefix || `backlinks_domain_${timestamp}`;
      
      console.log('\n--- EXPORTING BACKLINKS ---');
      await exportToJson(results.verifiedBacklinks || backlinks, `${filePrefix}_backlinks`);
      await exportToCsv(results.verifiedBacklinks || backlinks, `${filePrefix}_backlinks`);
    }
    
    // Find backlinks for a specific URL
    if (options.findBacklinks && options.targetUrl) {
      console.log('\n--- FINDING BACKLINKS FOR SPECIFIC URL ---');
      const backlinks = await findBacklinksForUrl(options.targetUrl, options.numBacklinks || 100);
      results.urlBacklinks = backlinks;
      
      // Verify backlinks if requested
      if (options.verifyLinks) {
        console.log('\n--- VERIFYING URL BACKLINKS ---');
        results.verifiedUrlBacklinks = await verifyBacklinks(backlinks, options.targetUrl);
      }
      
      // Export backlinks
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePrefix = options.outputPrefix || `backlinks_url_${timestamp}`;
      
      console.log('\n--- EXPORTING URL BACKLINKS ---');
      await exportToJson(results.verifiedUrlBacklinks || backlinks, `${filePrefix}_backlinks`);
      await exportToCsv(results.verifiedUrlBacklinks || backlinks, `${filePrefix}_backlinks`);
    }
    
    // Analyze backlinks for top-ranking pages
    if (options.analyzeCompetitors && options.keywords) {
      console.log('\n--- ANALYZING TOP-RANKING COMPETITORS ---');
      const competitorAnalysis = await analyzeTopRankingBacklinks(
        options.keywords, 
        options.numResults || 10, 
        options.numBacklinks || 100
      );
      
      results.competitorAnalysis = competitorAnalysis;
      
      // Export competitor analysis
      console.log('\n--- EXPORTING COMPETITOR ANALYSIS ---');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePrefix = options.outputPrefix || `competitor_analysis_${timestamp}`;
      
      await exportBacklinkAnalysis(competitorAnalysis, filePrefix);
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\nSEO metadata scraper completed in ${duration.toFixed(2)} seconds`);
    
    return {
      success: true,
      duration,
      searchResultsCount: results.searchResults?.length || 0,
      metadataCount: results.metadata?.length || 0,
      backlinksCount: results.backlinks?.length || 0,
      urlBacklinksCount: results.urlBacklinks?.length || 0,
      competitorAnalysis: results.competitorAnalysis ? {
        keyword: results.competitorAnalysis.keyword,
        topPagesCount: results.competitorAnalysis.topPages.length,
        backlinksAnalysisCount: results.competitorAnalysis.backlinksAnalysis.length
      } : null
    };
    
  } catch (error) {
    console.error('Error running SEO metadata scraper:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Command-line interface
 */
function cli() {
  const args = process.argv.slice(2);
  
  // Default options
  const options = {
    keywords: '',
    numResults: 10,
    findBacklinks: false,
    targetDomain: '',
    targetUrl: '',
    numBacklinks: 50,
    analyzeCompetitors: false,
    verifyLinks: false,
    outputPrefix: ''
  };
  
  // Parse command-line arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--keywords' || args[i] === '-k') {
      options.keywords = args[++i];
    } else if (args[i] === '--num-results' || args[i] === '-n') {
      options.numResults = parseInt(args[++i], 10);
    } else if (args[i] === '--find-backlinks' || args[i] === '-b') {
      options.findBacklinks = true;
    } else if (args[i] === '--target-domain' || args[i] === '-d') {
      options.targetDomain = args[++i];
    } else if (args[i] === '--target-url' || args[i] === '-u') {
      options.targetUrl = args[++i];
    } else if (args[i] === '--num-backlinks') {
      options.numBacklinks = parseInt(args[++i], 10);
    } else if (args[i] === '--analyze-competitors' || args[i] === '-c') {
      options.analyzeCompetitors = true;
    } else if (args[i] === '--verify-links' || args[i] === '-v') {
      options.verifyLinks = true;
    } else if (args[i] === '--output-prefix' || args[i] === '-o') {
      options.outputPrefix = args[++i];
    } else if (args[i] === '--help' || args[i] === '-h') {
      showHelp();
      process.exit(0);
    }
  }
  
  // Validate options
  if (!options.keywords && !options.findBacklinks) {
    console.error('Error: Either --keywords or --find-backlinks must be specified');
    showHelp();
    process.exit(1);
  }
  
  if (options.findBacklinks && !options.targetDomain && !options.targetUrl) {
    console.error('Error: Either --target-domain or --target-url must be specified when using --find-backlinks');
    showHelp();
    process.exit(1);
  }
  
  if (options.analyzeCompetitors && !options.keywords) {
    console.error('Error: --keywords must be specified when using --analyze-competitors');
    showHelp();
    process.exit(1);
  }
  
  // Run the scraper
  run(options).then(result => {
    if (result.success) {
      console.log('\nSummary:');
      console.log(`- Duration: ${result.duration.toFixed(2)} seconds`);
      
      if (result.searchResultsCount > 0) {
        console.log(`- Search Results: ${result.searchResultsCount}`);
        console.log(`- Metadata Extracted: ${result.metadataCount}`);
      }
      
      if (result.backlinksCount > 0) {
        console.log(`- Domain Backlinks Found: ${result.backlinksCount}`);
      }
      
      if (result.urlBacklinksCount > 0) {
        console.log(`- URL Backlinks Found: ${result.urlBacklinksCount}`);
      }
      
      if (result.competitorAnalysis) {
        console.log(`- Competitor Analysis: Analyzed ${result.competitorAnalysis.topPagesCount} top pages for "${result.competitorAnalysis.keyword}"`);
      }
    } else {
      console.error(`\nError: ${result.error}`);
      process.exit(1);
    }
  });
}

/**
 * Shows help message
 */
function showHelp() {
  console.log(`
SEO Metadata Scraper - A tool to extract metadata from webpages and find backlinks

Usage:
  node index.js [options]

Options:
  --keywords, -k             Keywords to search for
  --num-results, -n          Number of search results to process (default: 10)
  --find-backlinks, -b       Find backlinks
  --target-domain, -d        Domain to find backlinks for
  --target-url, -u           Specific URL to find backlinks for
  --num-backlinks            Number of backlinks to find (default: 50)
  --analyze-competitors, -c  Analyze backlinks for top-ranking pages
  --verify-links, -v         Verify backlinks by checking source pages
  --output-prefix, -o        Prefix for output filenames
  --help, -h                 Show this help message

Examples:
  node index.js --keywords "seo tools" --num-results 20
  node index.js --find-backlinks --target-domain example.com --num-backlinks 100
  node index.js --find-backlinks --target-url https://example.com/page.html
  node index.js --keywords "seo tools" --analyze-competitors --num-results 10
  node index.js --find-backlinks --target-url https://example.com/page.html --verify-links
  `);
}

// If this file is run directly, execute the CLI
if (require.main === module) {
  cli();
} else {
  // Export for use as a module
  module.exports = { run };
}