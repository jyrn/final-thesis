// Test the fixed date filtering logic
console.log('=== Testing Fixed Date Filtering Logic ===');

function testFixedDateFiltering(startDateStr, endDateStr) {
  console.log('\nInput dates:', { startDate: startDateStr, endDate: endDateStr });

  // Build date filter query (FIXED logic)
  let dateQuery = {};
  if (startDateStr || endDateStr) {
    dateQuery.createdAt = {};
    if (startDateStr) {
      // Parse date in UTC to avoid timezone issues
      const startDateTime = new Date(startDateStr + 'T00:00:00.000Z');
      dateQuery.createdAt.$gte = startDateTime;
      console.log('Start date filter:', startDateTime.toISOString());
    }
    if (endDateStr) {
      // Parse date in UTC to avoid timezone issues
      const endDateTime = new Date(endDateStr + 'T23:59:59.999Z');
      dateQuery.createdAt.$lte = endDateTime;
      console.log('End date filter:', endDateTime.toISOString());
    }
  }

  console.log('MongoDB query:', JSON.stringify(dateQuery, null, 2));
  return dateQuery;
}

// Test with January 2024 range
console.log('\n=== Test 1: January 2024 (FIXED) ===');
const jan2024Query = testFixedDateFiltering('2024-01-01', '2024-01-31');

// Test sample dates against the fixed query
const testDates = [
  { date: '2024-01-15T10:30:00Z', description: 'Mid January 2024' },
  { date: '2024-02-15T10:30:00Z', description: 'Mid February 2024' },
  { date: '2023-12-31T23:59:59Z', description: 'End of December 2023' },
  { date: '2024-01-01T00:00:00Z', description: 'Start of January 2024' },
  { date: '2024-01-31T23:59:59Z', description: 'End of January 2024' },
  { date: '2024-02-01T00:00:00Z', description: 'Start of February 2024' }
];

console.log('\n=== Testing Sample Dates (FIXED) ===');
testDates.forEach(({ date, description }) => {
  const testDate = new Date(date);
  const matchesStart = !jan2024Query.createdAt.$gte || testDate >= jan2024Query.createdAt.$gte;
  const matchesEnd = !jan2024Query.createdAt.$lte || testDate <= jan2024Query.createdAt.$lte;
  const matches = matchesStart && matchesEnd;
  
  console.log(`${description}: ${testDate.toISOString()} - ${matches ? 'MATCHES' : 'NO MATCH'}`);
});

// Compare old vs new logic
console.log('\n=== Comparison: Old vs New Logic ===');
const testDate = '2024-01-31';

// Old logic (problematic)
const oldStartDate = new Date(testDate);
oldStartDate.setHours(0, 0, 0, 0);
const oldEndDate = new Date(testDate);
oldEndDate.setHours(23, 59, 59, 999);

// New logic (fixed)
const newStartDate = new Date(testDate + 'T00:00:00.000Z');
const newEndDate = new Date(testDate + 'T23:59:59.999Z');

console.log('Old logic:');
console.log('  Start:', oldStartDate.toISOString());
console.log('  End:', oldEndDate.toISOString());
console.log('New logic:');
console.log('  Start:', newStartDate.toISOString());
console.log('  End:', newEndDate.toISOString());
