import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import submissionAnalyzer from './modules/submissionAnalyzer.js';
import dataExporter from './modules/dataExporter.js';

/**
 * Main function to run the submission analysis workflow
 */
const analyzeSubmissions = async () => {
  try {
    console.log('Starting submission analysis workflow...');
    
    // 1. Read the categorized sites (focusing on 'other' sites which are most likely to accept submissions)
    const categorizedPath = path.join(process.cwd(), 'data', 'categorized-sites', 'other_sites.json');
    
    console.log(`Reading categorized sites from ${categorizedPath}`);
    let sitesToAnalyze = [];
    
    try {
      const fileContent = await fs.readFile(categorizedPath, 'utf8');
      sitesToAnalyze = JSON.parse(fileContent);
      console.log(`Loaded ${sitesToAnalyze.length} sites to analyze`);
    } catch (error) {
      console.error(`Error loading categorized sites: ${error.message}`);
      console.log('Checking for all_categorized_sites.json instead...');
      
      try {
        const allSitesPath = path.join(process.cwd(), 'data', 'categorized-sites', 'all_categorized_sites.json');
        const allSitesContent = await fs.readFile(allSitesPath, 'utf8');
        const allSites = JSON.parse(allSitesContent);
        
        if (allSites.other && Array.isArray(allSites.other)) {
          sitesToAnalyze = allSites.other;
          console.log(`Loaded ${sitesToAnalyze.length} 'other' sites to analyze from all_categorized_sites.json`);
        } else {
          throw new Error('No "other" sites found in all_categorized_sites.json');
        }
      } catch (secondError) {
        console.error(`Error loading alternative sites file: ${secondError.message}`);
        console.log('Please make sure you have run the main application first to generate categorized sites');
        return;
      }
    }
    
    // 2. Analyze sites for submission opportunities
    // Limit to a reasonable number for initial analysis
    const MAX_SITES_TO_ANALYZE = 50;
    const sitesToProcess = sitesToAnalyze.slice(0, MAX_SITES_TO_ANALYZE);
    
    console.log(`Starting analysis of ${sitesToProcess.length} sites...`);
    const analyzedSites = await submissionAnalyzer.analyzeBatchOfSites(sitesToProcess);
    console.log(`Analysis complete for ${analyzedSites.length} sites`);
    
    // 3. Organize sites by submission potential
    const organizedSites = submissionAnalyzer.organizePotentialSites(analyzedSites);
    console.log('Sites organized by submission potential:');
    console.log(`- High Potential: ${organizedSites.highPotential.length} sites`);
    console.log(`- Medium Potential: ${organizedSites.mediumPotential.length} sites`);
    console.log(`- Low Potential: ${organizedSites.lowPotential.length} sites`);
    console.log(`- Rejected: ${organizedSites.rejected.length} sites`);
    
    // 4. Save organized sites
    const savePath = await submissionAnalyzer.savePotentialSites(organizedSites);
    console.log(`Organized sites saved to ${savePath}`);
    
    // 5. Export to CSV and Excel
    await exportPotentialSites(organizedSites);
    
    console.log('Submission analysis workflow completed successfully!');
  } catch (error) {
    console.error('Error in submission analysis workflow:', error);
  }
};

/**
 * Exports potential sites to CSV and Excel
 * @param {Object} organizedSites - The organized sites to export
 */
const exportPotentialSites = async (organizedSites) => {
  try {
    const outputDir = path.join(process.cwd(), 'data', 'potential-websites');
    
    // Define CSV headers
    const headers = [
      { id: 'url', title: 'URL' },
      { id: 'domain', title: 'Domain' },
      { id: 'acceptsSubmissions', title: 'Accepts Submissions' },
      { id: 'confidence', title: 'Confidence Score' },
      { id: 'submissionPageUrls', title: 'Submission Pages' },
      { id: 'submissionKeywordsFound', title: 'Keywords Found' },
      { id: 'notes', title: 'Notes' },
      { id: 'title', title: 'Site Title' },
      { id: 'snippet', title: 'Description' }
    ];
    
    // Prepare data for export, with array fields joined to strings
    const prepareForExport = (sites) => sites.map(site => ({
      ...site,
      submissionPageUrls: Array.isArray(site.submissionPageUrls) ? site.submissionPageUrls.join('|') : '',
      submissionKeywordsFound: Array.isArray(site.submissionKeywordsFound) ? site.submissionKeywordsFound.join('|') : '',
      notes: Array.isArray(site.notes) ? site.notes.join('|') : ''
    }));
    
    // Combine all potential sites (excluding rejected)
    const allPotentialSites = [
      ...prepareForExport(organizedSites.highPotential),
      ...prepareForExport(organizedSites.mediumPotential),
      ...prepareForExport(organizedSites.lowPotential)
    ];
    
    // Export all potential sites to CSV
    const csvPath = path.join(outputDir, 'potential_submission_sites.csv');
    await dataExporter.exportToCsv(allPotentialSites, csvPath, headers);
    console.log(`Potential sites exported to CSV: ${csvPath}`);
    
    // Export to Excel (with separate sheets for each category)
    const excelPath = path.join(outputDir, 'potential_submission_sites.xlsx');
    await dataExporter.exportToExcel({
      'High Potential': prepareForExport(organizedSites.highPotential),
      'Medium Potential': prepareForExport(organizedSites.mediumPotential),
      'Low Potential': prepareForExport(organizedSites.lowPotential),
      'Rejected': prepareForExport(organizedSites.rejected),
      'All Potential': allPotentialSites
    }, excelPath);
    
    console.log(`Potential sites exported to Excel: ${excelPath}`);
  } catch (error) {
    console.error('Error exporting potential sites:', error);
    throw error;
  }
};

// Check if this file is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  analyzeSubmissions();
}

export default analyzeSubmissions;