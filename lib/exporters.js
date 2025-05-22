// Export functionality for JSON and CSV formats
const fs = require('fs-extra');
const path = require('path');
const { createObjectCsvWriter } = require('csv-writer');
const config = require('../config/config');

/**
 * Exports data to a JSON file
 * 
 * @param {Array|Object} data - Data to export
 * @param {string} filename - Name of the output file
 * @returns {Promise<string>} - Path to the exported file
 */
async function exportToJson(data, filename) {
  try {
    // Ensure directory exists
    await fs.ensureDir(config.output.jsonDir);
    
    // Add .json extension if not present
    if (!filename.endsWith('.json')) {
      filename = `${filename}.json`;
    }
    
    const filePath = path.join(config.output.jsonDir, filename);
    
    // Write data to file
    await fs.writeJson(filePath, data, { spaces: 2 });
    
    console.log(`Data exported to JSON: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error exporting to JSON:', error.message);
    throw error;
  }
}

/**
 * Exports data to a CSV file
 * 
 * @param {Array<Object>} data - Array of objects to export
 * @param {string} filename - Name of the output file
 * @returns {Promise<string>} - Path to the exported file
 */
async function exportToCsv(data, filename) {
  try {
    // Ensure data is an array
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array for CSV export');
    }
    
    // Ensure directory exists
    await fs.ensureDir(config.output.csvDir);
    
    // Add .csv extension if not present
    if (!filename.endsWith('.csv')) {
      filename = `${filename}.csv`;
    }
    
    const filePath = path.join(config.output.csvDir, filename);
    
    // Get headers from the first item in the array
    // For nested arrays (like h1Tags), we'll stringify them
    if (data.length === 0) {
      throw new Error('Cannot export empty data to CSV');
    }
    
    // Process data to handle arrays and complex structures
    const processedData = data.map(item => {
      const processed = {};
      
      Object.keys(item).forEach(key => {
        if (Array.isArray(item[key])) {
          // Join arrays with a delimiter
          processed[key] = item[key].join('||');
        } else if (typeof item[key] === 'object' && item[key] !== null) {
          // Stringify objects
          processed[key] = JSON.stringify(item[key]);
        } else {
          // Keep primitive values as is
          processed[key] = item[key];
        }
      });
      
      return processed;
    });
    
    // Create CSV header from the keys of the first processed item
    const header = Object.keys(processedData[0]).map(id => ({ id, title: id }));
    
    // Create CSV writer
    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header
    });
    
    // Write data to file
    await csvWriter.writeRecords(processedData);
    
    console.log(`Data exported to CSV: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error('Error exporting to CSV:', error.message);
    throw error;
  }
}

module.exports = { exportToJson, exportToCsv };