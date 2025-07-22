const { DEV, API } = require("../constants/environment");
const CreateCheckout = require("./createCheckout");
const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");

class CreateCheckoutV2 extends CreateCheckout {
  constructor(env) {
    super();
    this.env = env;
    this.url = API.V2[env];
    this.jsonTemplateCache = new Map(); // Cache for loaded JSON templates
  }

  loadJsonTemplate(jsonConfigPath = "createPaymentRequestV2.json") {
    // Check cache first
    if (this.jsonTemplateCache.has(jsonConfigPath)) {
      return this.jsonTemplateCache.get(jsonConfigPath);
    }

    try {
      const jsonPath = path.join(__dirname, "../../", jsonConfigPath);
      const jsonData = fs.readFileSync(jsonPath, "utf8");
      const template = JSON.parse(jsonData);

      // Cache the template for future use
      this.jsonTemplateCache.set(jsonConfigPath, template);
      return template;
    } catch (error) {
      console.error(
        `Error loading JSON template from ${jsonConfigPath}:`,
        error
      );
      throw new Error(`Failed to load JSON template: ${jsonConfigPath}`);
    }
  }

  generateBody(data) {
    try {
      const { currency, amount, email, phone, jsonConfigPath } = data;

      // Load the appropriate JSON template for this request
      const jsonTemplate = this.loadJsonTemplate(jsonConfigPath);

      // Clone the JSON template to avoid modifying the original
      const requestBody = JSON.parse(JSON.stringify(jsonTemplate));

      // Override with provided data
      if (amount !== undefined) {
        requestBody.amount = amount;
      }
      if (currency !== undefined) {
        requestBody.currency = currency;
      }
      if (
        email !== undefined &&
        requestBody.metadata &&
        requestBody.metadata.customer_info
      ) {
        requestBody.metadata.customer_info.email = email;
      }
      if (
        phone !== undefined &&
        requestBody.metadata &&
        requestBody.metadata.customer_info
      ) {
        requestBody.metadata.customer_info.phone = phone;
      }

      return JSON.stringify(requestBody);
    } catch (error) {
      console.error("Error generating body:", error);
      throw new Error("Error at generateBodyCheckoutV2: " + error.toString());
    }
  }

  generateHeader() {
    try {
      const myHeaders = new fetch.Headers();
      const envToken = this.env === DEV ? "AUTH_DEV" : "AUTH_STAGE";
      const token = process.env[envToken];
      myHeaders.append("Authorization", token);
      myHeaders.append("Content-Type", "application/json");
      myHeaders.append(
        "Cookie",
        "visid_incap_2787157=b/3WrsQTRxuud3JivBXm6S2W2mMAAAAAQUIPAAAAAAAFjOYHyzNmNV7vDyJ8+m1g; visid_incap_2822146=2BH5qV/HRr2sVxPWQUzmb3QsbGQAAAAAQUIPAAAAAAAaDh5r1MNNFZ1/UOrwtZQo; visid_incap_2823212=ad1NxNgST0abc6aY/OsrmVex2WMAAAAAQUIPAAAAAACf91S5wJlOFHEMJUgbeToK; visid_incap_2841629=ud5F57bbSfazqY5BAvUrt0ux2WMAAAAAQUIPAAAAAAB70r13RzKGJpkZjyoYmfI1; __cf_bm=cY1eemlLnDSKKYx3MTKabLft1mxDctiBCumXQB7Rz9s-1723053748-1.0.1.1-jPtk5PU_MgUqsSmIky7LCMY2prjOkHK5Nvcjr7ewgVDfX.5vA_mkoJ49Qz4lF29MdsZ9K58td86JSjxb5Yqnbw"
      );
      return myHeaders;
    } catch (error) {
      console.error("Error generating headers:", error);
      throw new Error(
        "Error at generateHeadersCheckoutV2: " + error.toString()
      );
    }
  }

  getUrl() {
    return this.url;
  }
}

module.exports = CreateCheckoutV2;
