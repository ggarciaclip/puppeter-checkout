const fs = require("fs");
const path = require("path");
const { getFormattedDateTime } = require("./date_utils");

const SUCCESSFUL_USERS_FILE = path.join(process.cwd(), "successful_users.json");

/**
 * Save a successful card payment user to the JSON file
 * @param {Object} userData - User data to save
 * @param {string} userData.email - User email
 * @param {string} userData.card - User card number (last 4 digits only)
 * @param {string} userData.testCaseId - Test case ID
 * @param {string} userData.paymentRequestId - Payment request ID
 * @param {string} userData.amount - Payment amount
 * @param {boolean} userData.saveMyInfoChecked - Whether save my info was checked
 * @returns {Promise<void>}
 */
async function saveSuccessfulUser(userData) {
  try {
    const {
      email,
      card,
      testCaseId,
      paymentRequestId,
      amount,
      saveMyInfoChecked,
    } = userData;

    // Only save if save my info was checked
    if (!saveMyInfoChecked) {
      console.log(
        `🔒 Usuario no guardado - Save my info no estaba marcado: ${email}`
      );
      return;
    }

    // Mask card number - only show last 4 digits
    const maskedCard = maskCardNumber(card);

    // Create user entry
    const userEntry = {
      email,
      cardLastFour: maskedCard,
      testCaseId,
      paymentRequestId,
      amount,
      timestamp: getFormattedDateTime(),
      savedAt: new Date().toISOString(),
    };

    // Load existing users
    let successfulUsers = [];
    if (fs.existsSync(SUCCESSFUL_USERS_FILE)) {
      try {
        const fileContent = fs.readFileSync(SUCCESSFUL_USERS_FILE, "utf8");
        successfulUsers = JSON.parse(fileContent);
      } catch (error) {
        console.log(
          `⚠️ Error leyendo archivo de usuarios exitosos: ${error.message}`
        );
        successfulUsers = [];
      }
    }

    // Check if user already exists (by email and card)
    const existingUserIndex = successfulUsers.findIndex(
      (user) => user.email === email && user.cardLastFour === maskedCard
    );

    if (existingUserIndex >= 0) {
      // Update existing user
      successfulUsers[existingUserIndex] = {
        ...successfulUsers[existingUserIndex],
        ...userEntry,
        lastUpdated: new Date().toISOString(),
      };
      console.log(
        `🔄 Usuario actualizado en archivo de éxito: ${email} (**** ${maskedCard})`
      );
    } else {
      // Add new user
      successfulUsers.push(userEntry);
      console.log(
        `✅ Nuevo usuario guardado en archivo de éxito: ${email} (**** ${maskedCard})`
      );
    }

    // Save back to file
    fs.writeFileSync(
      SUCCESSFUL_USERS_FILE,
      JSON.stringify(successfulUsers, null, 2)
    );

    console.log(`📁 Total de usuarios exitosos: ${successfulUsers.length}`);
    console.log(`📄 Archivo: ${SUCCESSFUL_USERS_FILE}`);
  } catch (error) {
    console.error(`❌ Error guardando usuario exitoso: ${error.message}`);
  }
}

/**
 * Get all successful users from the JSON file
 * @returns {Array} Array of successful users
 */
function getSuccessfulUsers() {
  try {
    if (fs.existsSync(SUCCESSFUL_USERS_FILE)) {
      const fileContent = fs.readFileSync(SUCCESSFUL_USERS_FILE, "utf8");
      return JSON.parse(fileContent);
    }
    return [];
  } catch (error) {
    console.error(`❌ Error leyendo usuarios exitosos: ${error.message}`);
    return [];
  }
}

/**
 * Mask card number to show only last 4 digits
 * @param {string} cardNumber - Full card number
 * @returns {string} Last 4 digits of the card
 */
function maskCardNumber(cardNumber) {
  if (!cardNumber) return "****";

  // Remove spaces and get only digits
  const digitsOnly = cardNumber.replace(/\D/g, "");

  // Ensure we have at least some digits
  if (digitsOnly.length === 0) return "****";

  // Return last 4 digits, or all digits if less than 4
  if (digitsOnly.length >= 4) {
    return digitsOnly.slice(-4);
  } else {
    return digitsOnly.padStart(4, "*");
  }
}

/**
 * Get statistics about successful users
 * @returns {Object} Statistics object
 */
function getSuccessfulUsersStats() {
  const users = getSuccessfulUsers();

  const stats = {
    totalUsers: users.length,
    uniqueEmails: new Set(users.map((user) => user.email)).size,
    uniqueCards: new Set(users.map((user) => user.cardLastFour)).size,
    latestEntry: users.length > 0 ? users[users.length - 1].timestamp : null,
    saveMyInfoUsers: users.filter((user) => user.saveMyInfoChecked).length,
  };

  return stats;
}

module.exports = {
  saveSuccessfulUser,
  getSuccessfulUsers,
  getSuccessfulUsersStats,
  maskCardNumber,
};
