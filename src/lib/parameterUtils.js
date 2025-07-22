function generateRandomEmail(prefixKey) {
  const prefix = prefixKey || "test_email_dev";
  const randomString = Math.random().toString(36).substring(2, 10);
  const domain = "example.com";
  return `${prefix}_${randomString}@${domain}`;
}

function generateTestRunId() {
  const ahora = new Date();

  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");

  const hora = String(ahora.getHours()).padStart(2, "0");
  const minuto = String(ahora.getMinutes()).padStart(2, "0");
  const segundo = String(ahora.getSeconds()).padStart(2, "0");

  return `${mes}_${dia}_${hora}.${minuto}.${segundo}`;
}

module.exports = {
  generateRandomEmail,
  generateTestRunId,
};
