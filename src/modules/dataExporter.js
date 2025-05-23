import { createObjectCsvWriter } from 'csv-writer';
import XLSX from 'xlsx';
import fs from 'fs/promises';
import path from 'path';

/**
 * Exports data to CSV file
 * @param {Array<Object>} data - The data to export
 * @param {string} outputPath - Path to save the CSV file
 * @param {Array<Object>} headers - CSV headers
 * @returns {Promise<string>} - Path to the saved CSV file
 */
export const exportToCsv = async (data, outputPath, headers) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    const csvWriter = createObjectCsvWriter({
      path: outputPath,
      header: headers
    });
    
    await csvWriter.writeRecords(data);
    console.log(`Data exported to CSV: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

/**
 * Exports data to Excel file
 * @param {Object} data - The data to export (object with sheet names as keys)
 * @param {string} outputPath - Path to save the Excel file
 * @returns {Promise<string>} - Path to the saved Excel file
 */
export const exportToExcel = async (data, outputPath) => {
  try {
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Add each sheet to the workbook
    for (const [sheetName, sheetData] of Object.entries(data)) {
      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
    
    // Write to file
    XLSX.writeFile(workbook, outputPath);
    console.log(`Data exported to Excel: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * Exports metadata to CSV and Excel
 * @param {Array<Object>} metadata - The metadata to export
 * @returns {Promise<Object>} - Paths to the saved files
 */
export const exportMetadata = async (metadata) => {
  try {
    const outputDir = path.join(process.cwd(), 'data', 'extracted-metadata');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Prepare data for CSV export
    const flattenedMetadata = metadata.map(item => ({
      url: item.url,
      title: item.title,
      description: item.description,
      keywords: item.keywords,
      h1Tags: Array.isArray(item.h1Tags) ? item.h1Tags.join('|') : '',
      h2Tags: Array.isArray(item.h2Tags) ? item.h2Tags.join('|') : '',
      h3Tags: Array.isArray(item.h3Tags) ? item.h3Tags.join('|') : ''
    }));
    
    // Define CSV headers
    const headers = [
      { id: 'url', title: 'URL' },
      { id: 'title', title: 'Title' },
      { id: 'description', title: 'Description' },
      { id: 'keywords', title: 'Keywords' },
      { id: 'h1Tags', title: 'H1 Tags' },
      { id: 'h2Tags', title: 'H2 Tags' },
      { id: 'h3Tags', title: 'H3 Tags' }
    ];
    
    // Export to CSV
    const csvPath = path.join(outputDir, 'metadata.csv');
    await exportToCsv(flattenedMetadata, csvPath, headers);
    
    // Export to Excel
    const excelPath = path.join(outputDir, 'metadata.xlsx');
    await exportToExcel({ 'Metadata': flattenedMetadata }, excelPath);
    
    return {
      csv: csvPath,
      excel: excelPath
    };
  } catch (error) {
    console.error('Error exporting metadata:', error);
    throw error;
  }
};

/**
 * Exports search results to CSV and Excel
 * @param {Array<Object>} searchResults - The search results to export
 * @returns {Promise<Object>} - Paths to the saved files
 */
export const exportSearchResults = async (searchResults) => {
  try {
    const outputDir = path.join(process.cwd(), 'data', 'search-results');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Define CSV headers
    const headers = [
      { id: 'title', title: 'Title' },
      { id: 'link', title: 'Link' },
      { id: 'snippet', title: 'Snippet' },
      { id: 'displayLink', title: 'Display Link' },
      { id: 'keyword', title: 'Keyword' }
    ];
    
    // Export to CSV
    const csvPath = path.join(outputDir, 'search_results.csv');
    await exportToCsv(searchResults, csvPath, headers);
    
    // Export to Excel
    const excelPath = path.join(outputDir, 'search_results.xlsx');
    await exportToExcel({ 'Search Results': searchResults }, excelPath);
    
    return {
      csv: csvPath,
      excel: excelPath
    };
  } catch (error) {
    console.error('Error exporting search results:', error);
    throw error;
  }
};

/**
 * Exports categorized sites to CSV and Excel
 * @param {Object} categorizedSites - The categorized sites to export
 * @returns {Promise<Object>} - Paths to the saved files
 */
export const exportCategorizedSites = async (categorizedSites) => {
  try {
    const outputDir = path.join(process.cwd(), 'data', 'categorized-sites');
    await fs.mkdir(outputDir, { recursive: true });
    
    // Define CSV headers
    const headers = [
      { id: 'url', title: 'URL' },
      { id: 'category', title: 'Category' },
      { id: 'domain', title: 'Domain' },
      { id: 'title', title: 'Title' },
      { id: 'snippet', title: 'Snippet' },
      { id: 'keyword', title: 'Keyword' }
    ];
    
    // Combine all categories for CSV export
    const allSites = [
      ...categorizedSites.social_media,
      ...categorizedSites.content_platform,
      ...categorizedSites.other
    ];
    
    // Export to CSV
    const csvPath = path.join(outputDir, 'categorized_sites.csv');
    await exportToCsv(allSites, csvPath, headers);
    
    // Export to Excel (with separate sheets for each category)
    const excelPath = path.join(outputDir, 'categorized_sites.xlsx');
    await exportToExcel({
      'Social Media': categorizedSites.social_media,
      'Content Platforms': categorizedSites.content_platform,
      'Other Sites': categorizedSites.other,
      'All Sites': allSites
    }, excelPath);
    
    return {
      csv: csvPath,
      excel: excelPath
    };
  } catch (error) {
    console.error('Error exporting categorized sites:', error);
    throw error;
  }
};

export default {
  exportToCsv,
  exportToExcel,
  exportMetadata,
  exportSearchResults,
  exportCategorizedSites
};