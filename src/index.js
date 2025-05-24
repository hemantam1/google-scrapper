import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import metadataExtractor from './modules/metadataExtractor.js';
import googleSearch from './modules/googleSearch.js';
import urlCategorizer from './modules/urlCategorizer.js';
import dataExporter from './modules/dataExporter.js';

/**
 * Main function to run the complete workflow
 */
const main = async () => {
  try {
    console.log('Starting article research workflow...');
    
    // 1. Parse input URLs
    const inputUrls = [
      'https://www.kidrovia.com/the-best-school-uniforms-in-the-world-kids-fashion-news/',
      'https://www.kidrovia.com/how-to-dress-kids-with-different-skin-tones-a-comprehensive-guide/',
      'https://www.kidrovia.com/top-10-amazing-luxury-perfumes-for-kids/',
      'https://www.kidrovia.com/top-korean-skincare-products-for-kids/',
      'https://www.kidrovia.com/top-10-kids-brands-from-spain-a-fashion-guide/',
      'https://www.kidrovia.com/top-italian-brands-for-kids/',
      'https://www.kidrovia.com/kids-skin-care-products/',
      'https://www.kidrovia.com/top-10-trendiest-fashion-brands-for-teenagers/',
      'https://www.kidrovia.com/the-best-online-parenting-magazines-for-modern-parents/'
    ];
    
    console.log(`Processing ${inputUrls.length} URLs...`);
    
    // 2. Extract metadata from URLs
    const metadata = await metadataExtractor.processUrls(inputUrls);
    console.log(`Extracted metadata from ${metadata.length} URLs`);
    
    // 3. Save metadata
    await metadataExtractor.saveMetadata(metadata);
    const metadataExportPaths = await dataExporter.exportMetadata(metadata);
    console.log('Metadata exported to:', metadataExportPaths);
    
    // 4. Extract keywords from metadata and perform Google searches
    console.log('Performing Google searches based on extracted keywords...');
    const searchResults = await googleSearch.searchFromMetadata(metadata);
    console.log(`Retrieved ${searchResults.length} search results`);
    
    // 5. Export search results
    const searchExportPaths = await dataExporter.exportSearchResults(searchResults);
    console.log('Search results exported to:', searchExportPaths);
    
    // 6. Categorize search results
    console.log('Categorizing search results...');
    const categorizedResults = urlCategorizer.categorizeSearchResults(searchResults);
    console.log('Categorization complete:');
    console.log(`- Social Media: ${categorizedResults.social_media.length} sites`);
    console.log(`- Content Platforms: ${categorizedResults.content_platform.length} sites`);
    console.log(`- Other Sites: ${categorizedResults.other.length} sites`);
    
    // 7. Save categorized results
    await urlCategorizer.saveCategorizedResults(categorizedResults);
    const categorizedExportPaths = await dataExporter.exportCategorizedSites(categorizedResults);
    console.log('Categorized sites exported to:', categorizedExportPaths);
    
    console.log('Article research workflow completed successfully!');
    console.log(`
    Results can be found in:
    - Metadata: ${path.join(process.cwd(), 'data', 'extracted-metadata')}
    - Search Results: ${path.join(process.cwd(), 'data', 'search-results')}
    - Categorized Sites: ${path.join(process.cwd(), 'data', 'categorized-sites')}
    `);
  } catch (error) {
    console.error('Error in main workflow:', error);
  }
};

// Check if this file is being run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export default main;