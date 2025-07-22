async function waitForPaymentTransition(page, isSubscription, is3DS) {
  const timeoutWithout3ds = 20000; // Increased from 15000ms to 20000ms (20s)
  const timeoutWith3ds = 60000; // Increased from 45000ms to 60000ms (60s)
  const firstTimeout = is3DS ? timeoutWith3ds : timeoutWithout3ds;
  const timeouts = [firstTimeout, 10000, 5000]; // Increased: [original, 10s, 5s] instead of [original, 3s, 1s]
  const subscriptionSelector = '[data-testid="DetailSubscription-amount"]';
  const onePaySelector = '[data-testid="SuccesPayment-decimal"]';
  const selector = isSubscription ? subscriptionSelector : onePaySelector;

  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    try {
      console.log(
        `🔄 Intento ${attempt + 1}/${
          timeouts.length
        } - Esperando selector: ${selector} (timeout: ${timeouts[attempt]}ms)`
      );
      await page.waitForSelector(selector, { timeout: timeouts[attempt] });
      console.log(`✅ Selector encontrado en intento ${attempt + 1}`);
      return;
    } catch (e) {
      console.log(
        `⚠️ Intento ${attempt + 1} falló después de ${timeouts[attempt]}ms: ${
          e.message
        }`
      );

      if (attempt === timeouts.length - 1) {
        throw new Error(
          `Failed to get into payment transition page after maximum retries (${timeouts.length} attempts): ` +
            e
        );
      }

      // Small delay between retries
      console.log(`⏳ Esperando 2s antes del siguiente intento...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

module.exports = { waitForPaymentTransition };
