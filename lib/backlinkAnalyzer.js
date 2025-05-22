// Backlink analysis for top-ranking pages
const { analyzeSERP } = require('./serpAnalyzer');
const { findBacklinksForUrl, getUniqueReferringDomains } = require('./backlinkFinder');
const { exportToJson, exportToCsv } = require('./exporters');

/**
 * Analyzes backlinks for top-ranking pages for a keyword
 * 
 * @param {string} keyword - Keyword to analyze
 * @param {number} numResults - Number of top results to analyze (default: 10)
 * @param {number} maxBacklinksPerUrl - Maximum number of backlinks to find per URL (default: 100)
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeTopRankingBacklinks(keyword, numResults = 10, maxBacklinksPerUrl = 100) {
  try {
    console.log(`\n===== ANALYZING TOP ${numResults} RANKING PAGES FOR "${keyword}" =====`);
    
    // Step 1: Get top-ranking pages for the keyword
    const topPages = await analyzeSERP(keyword, numResults);
    
    // Step 2: For each top page, find backlinks
    const backlinksAnalysis = [];
    
    for (let i = 0; i < topPages.length; i++) {
      const page = topPages[i];
      console.log(`\n[${i + 1}/${topPages.length}] Analyzing backlinks for: ${page.url}`);
      
      // Find backlinks for this URL
      const backlinks = await findBacklinksForUrl(page.url, maxBacklinksPerUrl);
      
      // Get unique referring domains
      const uniqueDomains = getUniqueReferringDomains(backlinks);
      
      backlinksAnalysis.push({
        position: page.position,
        url: page.url,
        title: page.title,
        backlinksCount: backlinks.length,
        uniqueDomainsCount: uniqueDomains.length,
        backlinks: backlinks,
        uniqueDomains: uniqueDomains
      });
      
      console.log(`Found ${backlinks.length} backlinks from ${uniqueDomains.length} unique domains`);
    }
    
    return {
      keyword,
      topPages,
      backlinksAnalysis
    };
    
  } catch (error) {
    console.error(`Error analyzing top-ranking backlinks for "${keyword}":`, error.message);
    throw error;
  }
}

/**
 * Exports backlink analysis results
 * 
 * @param {Object} analysis - Analysis results
 * @param {string} outputPrefix - Prefix for output filenames
 * @returns {Promise<Object>} - Paths to exported files
 */
async function exportBacklinkAnalysis(analysis, outputPrefix) {
  try {
    console.log(`\n===== EXPORTING BACKLINK ANALYSIS RESULTS =====`);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePrefix = outputPrefix || `backlink_analysis_${timestamp}`;
    
    // Export full analysis
    const fullAnalysisPath = await exportToJson(analysis, `${filePrefix}_full`);
    
    // Create a summary for CSV export
    const summary = analysis.backlinksAnalysis.map(item => ({
      keyword: analysis.keyword,
      position: item.position,
      url: item.url,
      title: item.title,
      backlinksCount: item.backlinksCount,
      uniqueDomainsCount: item.uniqueDomainsCount
    }));
    
    // Export summary to CSV
    const summaryPath = await exportToCsv(summary, `${filePrefix}_summary`);
    
    // Export unique domains for each URL
    for (const item of analysis.backlinksAnalysis) {
      const domains = item.uniqueDomains.map(domain => ({
        targetUrl: item.url,
        targetPosition: item.position,
        referringDomain: domain
      }));
      
      if (domains.length > 0) {
        const position = String(item.position).padStart(2, '0');
        await exportToCsv(domains, `${filePrefix}_pos${position}_domains`);
      }
    }
    
    // Export backlinks for each URL
    for (const item of analysis.backlinksAnalysis) {
      if (item.backlinks.length > 0) {
        const position = String(item.position).padStart(2, '0');
        await exportToCsv(item.backlinks, `${filePrefix}_pos${position}_backlinks`);
      }
    }
    
    return {
      fullAnalysisPath,
      summaryPath
    };
    
  } catch (error) {
    console.error('Error exporting backlink analysis:', error.message);
    throw error;
  }
}

module.exports = { 
  analyzeTopRankingBacklinks,
  exportBacklinkAnalysis
};