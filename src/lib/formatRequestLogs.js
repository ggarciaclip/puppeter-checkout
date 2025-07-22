function formatRequestLogs(requests) {
  // Clean and order requests
  const cleanedRequests = cleanupRequestLogs(requests);

  const logData = {
    "📊 test_summary": {
      "📈 total_requests": cleanedRequests.length,
      "📈 original_requests": requests.length,
      "🧹 cleaned_requests": requests.length - cleanedRequests.length,
      "✅ successful_requests": cleanedRequests.filter((req) =>
        [200, 201, 204].includes(req.statusCode)
      ).length,
      "❌ failed_requests": cleanedRequests.filter(
        (req) => ![200, 201, 204].includes(req.statusCode)
      ).length,
      "🕐 generated_at": new Date().toISOString(),
    },
    "🌐 requests": cleanedRequests.map((request, index) => {
      const correctCodes = [200, 201, 204];
      const isSuccess = correctCodes.includes(request.statusCode);

      return {
        "🔢 request_number": index + 1,
        "🔗 url": request.url,
        "📊 http_status": {
          code: request.statusCode,
          status: isSuccess ? "✅ Success" : "❌ Failed",
          emoji: isSuccess ? "🟢" : "🔴",
        },
        "📋 headers": request.headers,
        "📦 payload": request.payload,
        "📨 response": request.response,
        "⏰ timestamp": request.timestamp,
        "🏷️ metadata": {
          is_successful: isSuccess,
          response_size: JSON.stringify(request.response || {}).length,
          has_payload: !!request.payload,
        },
      };
    }),
  };

  return JSON.stringify(logData, null, 2);
}

function cleanupRequestLogs(requests) {
  if (!Array.isArray(requests)) {
    return requests;
  }

  // Step 1: Remove prevention_data URLs
  let cleaned = requests.filter(
    (req) => !req.url?.includes("/prevention_data/")
  );

  // Step 2: Remove data:image/svg+xml URLs (SVG data URLs)
  cleaned = cleaned.filter((req) => !req.url?.startsWith("data:image/svg+xml"));

  // Step 3: Remove card_tokens with null payload and response
  cleaned = cleaned.filter((req) => {
    const isCardTokens = req.url?.includes("card_tokens");
    const hasNullData =
      (req.payload === null || req.payload === undefined) &&
      (req.response === null || req.response === undefined);
    return !(isCardTokens && hasNullData);
  });

  // Step 4: Remove duplicates (based on URL and method)
  const seen = new Set();
  cleaned = cleaned.filter((req) => {
    const key = `${req.method || "GET"}-${req.url || ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  // Step 5: Move GET payment-request to the beginning
  const paymentRequestIndex = cleaned.findIndex((req) => {
    const url = req.url || "";
    const method = req.method || "GET";
    return method === "GET" && url.includes("/api/payment-request/");
  });

  if (paymentRequestIndex > 0) {
    const paymentRequest = cleaned[paymentRequestIndex];
    cleaned.splice(paymentRequestIndex, 1);
    cleaned.unshift(paymentRequest);
  }

  return cleaned;
}

module.exports = { formatRequestLogs };
