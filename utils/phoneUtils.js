/**
 * Extract phone number from WhatsApp remoteJid
 * Handles different WhatsApp ID formats:
 * - Individual users: 256703722777@s.whatsapp.net
 * - Group chats: 256704966899-1625215002@g.us
 * - Newsletter channels: 120363169319669622@newsletter
 * 
 * @param {string} remoteJid - The WhatsApp remote JID
 * @returns {object} Extracted information including phone number, type, and original ID
 */
function extractPhoneNumberFromRemoteJid(remoteJid) {
    if (!remoteJid || typeof remoteJid !== 'string') {
        return {
            phoneNumber: null,
            countryCode: null,
            localNumber: null,
            type: 'unknown',
            isValid: false,
            originalJid: remoteJid,
            error: 'Invalid or missing remoteJid'
        };
    }

    const result = {
        phoneNumber: null,
        countryCode: null,
        localNumber: null,
        type: 'unknown',
        isValid: false,
        originalJid: remoteJid,
        groupId: null,
        timestamp: null,
        channelId: null
    };

    try {
        // Individual WhatsApp user: phoneNumber@s.whatsapp.net
        if (remoteJid.includes('@s.whatsapp.net')) {
            const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');

            // Validate phone number (should be numeric and reasonable length)
            if (/^\d{7,15}$/.test(phoneNumber)) {
                result.phoneNumber = phoneNumber;
                result.type = 'individual';
                result.isValid = true;

                // Extract country code (common patterns)
                // Priority order: 3-digit codes, then 2-digit, then 1-digit
                if (phoneNumber.length >= 10) {
                    // Common 3-digit country codes
                    const commonThreeDigit = ['256', '263', '234', '254', '255', '233', '372'];
                    // Common 2-digit country codes  
                    const commonTwoDigit = ['44', '49', '33', '39', '34', '91', '86', '81', '55', '27'];
                    // Common 1-digit country codes
                    const commonOneDigit = ['1', '7'];

                    // Try 3-digit codes first
                    const threeDigit = phoneNumber.substring(0, 3);
                    if (commonThreeDigit.includes(threeDigit) && phoneNumber.length >= 12) {
                        result.countryCode = threeDigit;
                        result.localNumber = phoneNumber.substring(3);
                    }
                    // Try 2-digit codes
                    else {
                        const twoDigit = phoneNumber.substring(0, 2);
                        if (commonTwoDigit.includes(twoDigit) && phoneNumber.length >= 10) {
                            result.countryCode = twoDigit;
                            result.localNumber = phoneNumber.substring(2);
                        }
                        // Try 1-digit codes
                        else {
                            const oneDigit = phoneNumber.substring(0, 1);
                            if (commonOneDigit.includes(oneDigit) && phoneNumber.length >= 10) {
                                result.countryCode = oneDigit;
                                result.localNumber = phoneNumber.substring(1);
                            }
                            // Fallback: assume 3-digit country code for African numbers starting with 2
                            else if (phoneNumber.startsWith('2') && phoneNumber.length >= 12) {
                                result.countryCode = phoneNumber.substring(0, 3);
                                result.localNumber = phoneNumber.substring(3);
                            }
                            // Default fallback
                            else if (phoneNumber.length >= 10) {
                                result.countryCode = phoneNumber.substring(0, 2);
                                result.localNumber = phoneNumber.substring(2);
                            }
                        }
                    }
                }
                // If no country code detected, treat as local number
                if (!result.countryCode) {
                    result.localNumber = phoneNumber;
                }
            }
        }

        // WhatsApp Group: phoneNumber-timestamp@g.us
        else if (remoteJid.includes('@g.us')) {
            const groupPart = remoteJid.replace('@g.us', '');
            const parts = groupPart.split('-');

            if (parts.length === 2) {
                const phoneNumber = parts[0];
                const timestamp = parts[1];

                if (/^\d{7,15}$/.test(phoneNumber) && /^\d{10}$/.test(timestamp)) {
                    result.phoneNumber = phoneNumber;
                    result.groupId = groupPart;
                    result.timestamp = timestamp;
                    result.type = 'group';
                    result.isValid = true;

                    // Extract country code for group admin (same logic as individual)
                    if (phoneNumber.length >= 10) {
                        // Common 3-digit country codes
                        const commonThreeDigit = ['256', '263', '234', '254', '255', '233', '372'];
                        // Common 2-digit country codes  
                        const commonTwoDigit = ['44', '49', '33', '39', '34', '91', '86', '81', '55', '27'];
                        // Common 1-digit country codes
                        const commonOneDigit = ['1', '7'];

                        // Try 3-digit codes first
                        const threeDigit = phoneNumber.substring(0, 3);
                        if (commonThreeDigit.includes(threeDigit) && phoneNumber.length >= 12) {
                            result.countryCode = threeDigit;
                            result.localNumber = phoneNumber.substring(3);
                        }
                        // Try 2-digit codes
                        else {
                            const twoDigit = phoneNumber.substring(0, 2);
                            if (commonTwoDigit.includes(twoDigit) && phoneNumber.length >= 10) {
                                result.countryCode = twoDigit;
                                result.localNumber = phoneNumber.substring(2);
                            }
                            // Try 1-digit codes
                            else {
                                const oneDigit = phoneNumber.substring(0, 1);
                                if (commonOneDigit.includes(oneDigit) && phoneNumber.length >= 10) {
                                    result.countryCode = oneDigit;
                                    result.localNumber = phoneNumber.substring(1);
                                }
                                // Fallback: assume 3-digit country code for African numbers starting with 2
                                else if (phoneNumber.startsWith('2') && phoneNumber.length >= 12) {
                                    result.countryCode = phoneNumber.substring(0, 3);
                                    result.localNumber = phoneNumber.substring(3);
                                }
                                // Default fallback
                                else if (phoneNumber.length >= 10) {
                                    result.countryCode = phoneNumber.substring(0, 2);
                                    result.localNumber = phoneNumber.substring(2);
                                }
                            }
                        }
                    }

                    if (!result.countryCode) {
                        result.localNumber = phoneNumber;
                    }
                }
            }
        }

        // Newsletter/Channel: channelId@newsletter
        else if (remoteJid.includes('@newsletter')) {
            const channelId = remoteJid.replace('@newsletter', '');

            if (/^\d{10,20}$/.test(channelId)) {
                result.channelId = channelId;
                result.type = 'newsletter';
                result.isValid = true;
                // Note: Newsletter channels don't have extractable phone numbers
                // but we mark them as valid for identification purposes
            }
        }

        // Unknown format
        else {
            result.type = 'unknown';
            result.error = 'Unrecognized remoteJid format';
        }

    } catch (error) {
        result.error = `Parsing error: ${error.message}`;
    }

    return result;
}

/**
 * Format phone number for display
 * @param {object} extractedInfo - Result from extractPhoneNumberFromRemoteJid
 * @returns {string} Formatted phone number or identifier
 */
function formatPhoneNumber(extractedInfo) {
    if (!extractedInfo.isValid) {
        return extractedInfo.originalJid || 'Invalid';
    }

    switch (extractedInfo.type) {
        case 'individual':
            if (extractedInfo.countryCode && extractedInfo.localNumber) {
                return `+${extractedInfo.countryCode} ${extractedInfo.localNumber}`;
            }
            return extractedInfo.phoneNumber || extractedInfo.originalJid;

        case 'group':
            const adminPhone = extractedInfo.countryCode && extractedInfo.localNumber
                ? `+${extractedInfo.countryCode} ${extractedInfo.localNumber}`
                : extractedInfo.phoneNumber;
            return `Group (Admin: ${adminPhone})`;

        case 'newsletter':
            return `Newsletter (${extractedInfo.channelId})`;

        default:
            return extractedInfo.originalJid;
    }
}

module.exports = {
    extractPhoneNumberFromRemoteJid,
    formatPhoneNumber
};
