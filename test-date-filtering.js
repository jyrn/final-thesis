const mongoose = require('mongoose');

// Test script to verify date filtering logic
async function testDateFiltering() {
  try {
    // Connect to MongoDB (using the same connection string from your app)
    await mongoose.connect('mongodb://localhost:27017/peso-jobs', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Test date filtering logic
    const testStartDate = '2024-01-01';
    const testEndDate = '2024-01-31';

    console.log('\n=== Testing Date Filtering Logic ===');
    console.log('Input dates:', { testStartDate, testEndDate });

    // Build date filter query (same logic as backend)
    let dateQuery = {};
    if (testStartDate || testEndDate) {
      dateQuery.createdAt = {};
      if (testStartDate) {
        const startDateTime = new Date(testStartDate);
        startDateTime.setHours(0, 0, 0, 0); // Start of day
        dateQuery.createdAt.$gte = startDateTime;
        console.log('Start date filter:', startDateTime);
        console.log('Start date ISO:', startDateTime.toISOString());
      }
      if (testEndDate) {
        const endDateTime = new Date(testEndDate);
        endDateTime.setHours(23, 59, 59, 999); // End of day
        dateQuery.createdAt.$lte = endDateTime;
        console.log('End date filter:', endDateTime);
        console.log('End date ISO:', endDateTime.toISOString());
      }
    }

    console.log('\nMongoDB query:', JSON.stringify(dateQuery, null, 2));

    // Test with different date formats
    console.log('\n=== Testing Different Date Formats ===');
    
    const testDates = [
      '2024-01-15',
      '2024-01-15T10:30:00Z',
      '2024-02-15',
      '2023-12-15'
    ];

    testDates.forEach(dateStr => {
      const testDate = new Date(dateStr);
      console.log(`\nDate: ${dateStr}`);
      console.log(`Parsed: ${testDate.toISOString()}`);
      console.log(`Matches filter: ${testDate >= dateQuery.createdAt.$gte && testDate <= dateQuery.createdAt.$lte}`);
    });

    // Test current month filtering
    console.log('\n=== Testing Current Month Filtering ===');
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    console.log('Current month start:', startOfMonth.toISOString());
    console.log('Current month end:', endOfMonth.toISOString());

    const currentMonthQuery = {
      createdAt: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    };

    console.log('Current month query:', JSON.stringify(currentMonthQuery, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the test
testDateFiltering();
