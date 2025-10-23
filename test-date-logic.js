// Simple test script to verify date filtering logic without mongoose
console.log('=== Testing Date Filtering Logic ===');

// Test the exact same logic used in the backend
function testDateFiltering(startDateStr, endDateStr) {
  console.log('\nInput dates:', { startDate: startDateStr, endDate: endDateStr });

  // Build date filter query (same logic as backend)
  let dateQuery = {};
  if (startDateStr || endDateStr) {
    dateQuery.createdAt = {};
    if (startDateStr) {
      const startDateTime = new Date(startDateStr);
      startDateTime.setHours(0, 0, 0, 0); // Start of day
      dateQuery.createdAt.$gte = startDateTime;
      console.log('Start date filter:', startDateTime.toISOString());
    }
    if (endDateStr) {
      const endDateTime = new Date(endDateStr);
      endDateTime.setHours(23, 59, 59, 999); // End of day
      dateQuery.createdAt.$lte = endDateTime;
      console.log('End date filter:', endDateTime.toISOString());
    }
  }

  console.log('MongoDB query:', JSON.stringify(dateQuery, null, 2));
  return dateQuery;
}

// Test with January 2024 range
console.log('\n=== Test 1: January 2024 ===');
const jan2024Query = testDateFiltering('2024-01-01', '2024-01-31');

// Test sample dates against the query
const testDates = [
  { date: '2024-01-15T10:30:00Z', description: 'Mid January 2024' },
  { date: '2024-02-15T10:30:00Z', description: 'Mid February 2024' },
  { date: '2023-12-31T23:59:59Z', description: 'End of December 2023' },
  { date: '2024-01-01T00:00:00Z', description: 'Start of January 2024' },
  { date: '2024-01-31T23:59:59Z', description: 'End of January 2024' },
  { date: '2024-02-01T00:00:00Z', description: 'Start of February 2024' }
];

console.log('\n=== Testing Sample Dates ===');
testDates.forEach(({ date, description }) => {
  const testDate = new Date(date);
  const matchesStart = !jan2024Query.createdAt.$gte || testDate >= jan2024Query.createdAt.$gte;
  const matchesEnd = !jan2024Query.createdAt.$lte || testDate <= jan2024Query.createdAt.$lte;
  const matches = matchesStart && matchesEnd;
  
  console.log(`${description}: ${testDate.toISOString()} - ${matches ? 'MATCHES' : 'NO MATCH'}`);
});

// Test current month filtering (October 2024)
console.log('\n=== Test 2: Current Month (October 2024) ===');
const today = new Date('2024-10-21'); // Using current date
const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
const formatDate = (date) => date.toISOString().split('T')[0];

const currentMonthQuery = testDateFiltering(
  formatDate(startOfMonth), 
  formatDate(today)
);

// Test timezone handling
console.log('\n=== Test 3: Timezone Handling ===');
const utcDate = new Date('2024-01-15T00:00:00Z');
const localDate = new Date('2024-01-15');
console.log('UTC date:', utcDate.toISOString());
console.log('Local date:', localDate.toISOString());
console.log('Timezone offset (minutes):', localDate.getTimezoneOffset());

// Test the frontend formatDate function
console.log('\n=== Test 4: Frontend Date Formatting ===');
const frontendFormatDate = (date) => date.toISOString().split('T')[0];
const testDate = new Date('2024-01-15T10:30:00');
console.log('Original date:', testDate.toISOString());
console.log('Frontend formatted:', frontendFormatDate(testDate));
console.log('Backend parsed:', new Date(frontendFormatDate(testDate)).toISOString());
