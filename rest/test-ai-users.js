// Test AI-Enabled Users Feature
const WhatsAppDB = require('../libraries/database/db-helper');

async function testAIUsers() {
    const db = new WhatsAppDB();

    try {
        console.log('🧪 Testing AI-Enabled Users Feature\n');

        // Connect to database
        await db.connect();
        console.log('✅ Connected to database\n');

        // Test 1: Add a user
        console.log('📝 Test 1: Adding user to AI-enabled list...');
        const addResult = await db.addAIUser(
            '256703722777@s.whatsapp.net',
            '+256703722777',
            'Test User Uganda',
            'Testing dynamic AI feature'
        );
        console.log('✅ User added:', addResult);
        console.log('');

        // Test 2: Check if user is AI-enabled
        console.log('🔍 Test 2: Checking if user is AI-enabled...');
        const isEnabled = await db.isAIEnabled('256703722777@s.whatsapp.net');
        console.log('✅ Is AI-enabled:', isEnabled);
        console.log('');

        // Test 3: Get user details
        console.log('📋 Test 3: Getting user details...');
        const userDetails = await db.getAIUser('256703722777@s.whatsapp.net');
        console.log('✅ User details:', userDetails);
        console.log('');

        // Test 4: List all AI-enabled users
        console.log('📊 Test 4: Listing all AI-enabled users...');
        const allUsers = await db.getAIUsers(false);
        console.log('✅ Total AI-enabled users:', allUsers.length);
        allUsers.forEach(user => {
            console.log(`   - ${user.name || 'Unknown'} (${user.remoteJid})`);
        });
        console.log('');

        // Test 5: Add another user
        console.log('📝 Test 5: Adding second user...');
        const addResult2 = await db.addAIUser(
            '263774108597@s.whatsapp.net',
            '+263774108597',
            'Zimbabwe Test User',
            'Second test user'
        );
        console.log('✅ Second user added:', addResult2);
        console.log('');

        // Test 6: Update interaction time
        console.log('⏰ Test 6: Updating interaction time...');
        const updateResult = await db.updateAIUserInteraction('256703722777@s.whatsapp.net');
        console.log('✅ Interaction updated:', updateResult);
        console.log('');

        // Test 7: Toggle user status
        console.log('🔄 Test 7: Toggling user AI status...');
        const toggleResult = await db.toggleAIUser('263774108597@s.whatsapp.net');
        console.log('✅ User toggled:', toggleResult);
        console.log('');

        // Test 8: Check disabled user
        console.log('🔍 Test 8: Checking disabled user...');
        const isEnabled2 = await db.isAIEnabled('263774108597@s.whatsapp.net');
        console.log('✅ Is AI-enabled (should be false):', isEnabled2);
        console.log('');

        // Test 9: Toggle back
        console.log('🔄 Test 9: Toggling user back to enabled...');
        const toggleResult2 = await db.toggleAIUser('263774108597@s.whatsapp.net');
        console.log('✅ User re-enabled:', toggleResult2);
        console.log('');

        // Test 10: Test non-existent user
        console.log('❌ Test 10: Checking non-existent user...');
        const isEnabledNonExistent = await db.isAIEnabled('999999999999@s.whatsapp.net');
        console.log('✅ Non-existent user is AI-enabled (should be false):', isEnabledNonExistent);
        console.log('');

        // Final summary
        console.log('📊 Final Summary:');
        const finalUsers = await db.getAIUsers(true);
        console.log(`   Total users in database: ${finalUsers.length}`);
        const enabledCount = finalUsers.filter(u => u.enabled).length;
        const disabledCount = finalUsers.filter(u => !u.enabled).length;
        console.log(`   Enabled: ${enabledCount}`);
        console.log(`   Disabled: ${disabledCount}`);
        console.log('');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    } finally {
        await db.close();
        console.log('\n🔌 Database connection closed');
    }
}

// Run the tests
testAIUsers();