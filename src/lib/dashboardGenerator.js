const fs = require("fs");
const path = require("path");

/**
 * Genera un dashboard HTML interactivo para visualizar los resultados de las pruebas
 */
class DashboardGenerator {
  constructor() {
    this.testRuns = [];
    this.outputPath = path.join(process.cwd(), "completed_tests", "dashboard");
  }

  /**
   * Escanea todos los test runs y recolecta la información
   */
  async collectTestRunData() {
    const testRunsDir = path.join(
      process.cwd(),
      "completed_tests",
      "test_runs"
    );

    if (!fs.existsSync(testRunsDir)) {
      console.log("⚠️ No se encontró directorio de test runs");
      return;
    }

    const paymentTypes = fs.readdirSync(testRunsDir);

    for (const paymentType of paymentTypes) {
      const paymentTypeDir = path.join(testRunsDir, paymentType);

      if (!fs.statSync(paymentTypeDir).isDirectory()) continue;

      const runIds = fs.readdirSync(paymentTypeDir);

      for (const runId of runIds) {
        const runDir = path.join(paymentTypeDir, runId);

        if (!fs.statSync(runDir).isDirectory()) continue;

        const testCases = await this.collectTestCases(
          runDir,
          paymentType,
          runId
        );

        if (testCases.length > 0) {
          this.testRuns.push({
            paymentType,
            runId,
            timestamp: this.extractTimestamp(runId),
            testCases,
            totalCases: testCases.length,
            successfulCases: testCases.filter((tc) => tc.status === "OK")
              .length,
            failedCases: testCases.filter((tc) => tc.status !== "OK").length,
          });
        }
      }
    }

    // Ordenar por timestamp más reciente primero
    this.testRuns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Recolecta información de casos de prueba individuales
   */
  async collectTestCases(runDir, paymentType, runId) {
    const testCases = [];
    const testCaseDirs = fs.readdirSync(runDir);

    for (const testCaseDir of testCaseDirs) {
      const testCasePath = path.join(runDir, testCaseDir);

      if (!fs.statSync(testCasePath).isDirectory()) continue;

      const testCase = await this.analyzeTestCase(
        testCasePath,
        testCaseDir,
        paymentType,
        runId
      );
      if (testCase) {
        testCases.push(testCase);
      }
    }

    return testCases;
  }

  /**
   * Analiza un caso de prueba individual
   */
  async analyzeTestCase(testCasePath, testCaseId, paymentType, runId) {
    const files = fs.readdirSync(testCasePath);

    const testCase = {
      id: testCaseId,
      paymentType,
      runId,
      status: "UNKNOWN",
      hasScreenshots: false,
      hasVideo: false,
      hasLogs: false,
      hasJsonLogs: false,
      screenshots: [],
      videoPath: null,
      logsPath: null,
      jsonLogsPath: null,
      relativePath: path.relative(process.cwd(), testCasePath),
      errors: [],
    };

    // Analizar archivos
    for (const file of files) {
      const filePath = path.join(testCasePath, file);
      const relativePath = path.relative(process.cwd(), filePath);

      if (file.endsWith(".png")) {
        testCase.hasScreenshots = true;
        testCase.screenshots.push({
          name: file,
          path: relativePath,
          type: this.getScreenshotType(file),
        });
      } else if (file.endsWith(".mp4")) {
        testCase.hasVideo = true;
        testCase.videoPath = relativePath;
      } else if (file === "logs.txt") {
        testCase.hasLogs = true;
        testCase.logsPath = relativePath;
      } else if (file === "logs.json") {
        testCase.hasJsonLogs = true;
        testCase.jsonLogsPath = relativePath;
      }
    }

    // Determinar estado del test
    testCase.status = this.determineTestStatus(testCase.screenshots);

    // Leer logs para detectar errores
    if (testCase.hasLogs) {
      try {
        const logsContent = fs.readFileSync(
          path.join(testCasePath, "logs.txt"),
          "utf8"
        );
        testCase.errors = this.extractErrors(logsContent);
      } catch (error) {
        console.log(
          `⚠️ Error leyendo logs para ${testCaseId}: ${error.message}`
        );
      }
    }

    return testCase;
  }

  /**
   * Determina el tipo de screenshot
   */
  getScreenshotType(filename) {
    if (filename.includes("success")) return "success";
    if (filename.includes("error")) return "error";
    if (filename.includes("form-page-fill")) return "form";
    if (filename.includes("barcode")) return "barcode";
    return "other";
  }

  /**
   * Determina el estado del test basado en screenshots
   */
  determineTestStatus(screenshots) {
    if (screenshots.some((s) => s.type === "success")) return "OK";
    if (screenshots.some((s) => s.type === "error")) return "ERROR";
    return "INCOMPLETE";
  }

  /**
   * Extrae errores de los logs
   */
  extractErrors(logsContent) {
    const errorLines = logsContent
      .split("\n")
      .filter(
        (line) =>
          line.includes("❌") ||
          line.includes("ERROR") ||
          line.includes("Failed")
      )
      .slice(0, 5); // Solo primeros 5 errores

    return errorLines.map((line) => line.trim());
  }

  /**
   * Extrae timestamp del runId
   */
  extractTimestamp(runId) {
    // Formato esperado: MM_DD_HH.MM.SS
    const match = runId.match(/(\d{2})_(\d{2})_(\d{2})\.(\d{2})\.(\d{2})/);
    if (match) {
      const [, month, day, hour, minute, second] = match;
      const year = new Date().getFullYear();
      return new Date(year, month - 1, day, hour, minute, second);
    }
    return new Date();
  }

  /**
   * Genera el HTML del dashboard
   */
  generateHTML() {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard de Pruebas de Checkout</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f7;
            color: #1d1d1f;
            line-height: 1.5;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 700;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            padding: 2rem;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            text-align: center;
            transition: transform 0.2s;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 0.5rem;
        }
        
        .stat-label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .success { color: #28a745; }
        .error { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #007bff; }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .test-run {
            background: white;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .test-run-header {
            background: #f8f9fa;
            padding: 1.5rem;
            border-bottom: 1px solid #e9ecef;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .test-run-header:hover {
            background: #e9ecef;
        }
        
        .test-run-title {
            font-size: 1.3rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        
        .test-run-meta {
            display: flex;
            gap: 1rem;
            font-size: 0.9rem;
            color: #666;
            flex-wrap: wrap;
        }
        
        .test-run-content {
            display: none;
            padding: 1.5rem;
        }
        
        .test-run-content.active {
            display: block;
        }
        
        .test-cases {
            display: grid;
            gap: 1rem;
        }
        
        .test-case {
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1rem;
            transition: border-color 0.2s;
        }
        
        .test-case:hover {
            border-color: #007bff;
        }
        
        .test-case-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
        }
        
        .test-case-id {
            font-weight: 600;
            font-size: 1.1rem;
        }
        
        .status-badge {
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-ok {
            background: #d4edda;
            color: #155724;
        }
        
        .status-error {
            background: #f8d7da;
            color: #721c24;
        }
        
        .status-incomplete {
            background: #fff3cd;
            color: #856404;
        }
        
        .test-case-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
        }
        
        .btn {
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            transition: all 0.2s;
            display: inline-flex;
            align-items: center;
            gap: 0.25rem;
        }
        
        .btn-primary {
            background: #007bff;
            color: white;
        }
        
        .btn-primary:hover {
            background: #0056b3;
        }
        
        .btn-secondary {
            background: #6c757d;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #545b62;
        }
        
        .btn-success {
            background: #28a745;
            color: white;
        }
        
        .btn-success:hover {
            background: #1e7e34;
        }
        
        .btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .errors {
            margin-top: 1rem;
            padding: 1rem;
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            border-radius: 6px;
        }
        
        .errors h4 {
            color: #721c24;
            margin-bottom: 0.5rem;
        }
        
        .error-item {
            font-size: 0.9rem;
            color: #721c24;
            margin-bottom: 0.25rem;
        }
        
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        }
        
        .modal-content {
            background-color: white;
            margin: 5% auto;
            padding: 2rem;
            border-radius: 12px;
            width: 90%;
            max-width: 800px;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #e9ecef;
        }
        
        .close {
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
        }
        
        .close:hover {
            color: black;
        }
        
        .tabs {
            display: flex;
            border-bottom: 1px solid #e9ecef;
            margin-bottom: 1rem;
        }
        
        .tab {
            padding: 0.75rem 1.5rem;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
        }
        
        .tab.active {
            border-bottom-color: #007bff;
            color: #007bff;
            font-weight: 600;
        }
        
        .tab-content {
            display: none;
        }
        
        .tab-content.active {
            display: block;
        }
        
        .log-content {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .json-viewer {
            background: #f8f9fa;
            padding: 1rem;
            border-radius: 6px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.9rem;
            max-height: 400px;
            overflow-y: auto;
        }
        
        .fade-in {
            animation: fadeIn 0.3s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .no-data {
            text-align: center;
            padding: 3rem;
            color: #666;
        }
        
        .filter-bar {
            background: white;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .filter-group {
            display: flex;
            gap: 1rem;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .filter-group label {
            font-weight: 500;
        }
        
        .filter-group select,
        .filter-group input {
            padding: 0.5rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 1rem;
            }
            
            .stats {
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                padding: 1rem;
            }
            
            .test-run-meta {
                flex-direction: column;
                gap: 0.5rem;
            }
            
            .test-case-actions {
                justify-content: flex-start;
            }
            
            .modal-content {
                width: 95%;
                margin: 2% auto;
                padding: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Dashboard de Pruebas de Checkout</h1>
        <p>Visualización interactiva de resultados de pruebas automatizadas</p>
    </div>

    <div class="stats">
        <div class="stat-card">
            <div class="stat-number success">${this.getTotalSuccessfulTests()}</div>
            <div class="stat-label">Pruebas Exitosas</div>
        </div>
        <div class="stat-card">
            <div class="stat-number error">${this.getTotalFailedTests()}</div>
            <div class="stat-label">Pruebas Fallidas</div>
        </div>
        <div class="stat-card">
            <div class="stat-number info">${this.testRuns.length}</div>
            <div class="stat-label">Ejecuciones de Prueba</div>
        </div>
        <div class="stat-card">
            <div class="stat-number warning">${this.getTotalTests()}</div>
            <div class="stat-label">Total de Casos</div>
        </div>
    </div>

    <div class="container">
        <div class="filter-bar">
            <div class="filter-group">
                <label>Filtrar por:</label>
                <select id="paymentTypeFilter">
                    <option value="">Todos los tipos de pago</option>
                    ${this.getUniquePaymentTypes()
                      .map((type) => `<option value="${type}">${type}</option>`)
                      .join("")}
                </select>
                <select id="statusFilter">
                    <option value="">Todos los estados</option>
                    <option value="OK">Exitosos</option>
                    <option value="ERROR">Con errores</option>
                    <option value="INCOMPLETE">Incompletos</option>
                </select>
                <input type="text" id="searchFilter" placeholder="Buscar por ID de caso...">
            </div>
        </div>

        <div id="testRunsContainer">
            ${this.testRuns
              .map((testRun, index) => this.generateTestRunHTML(testRun, index))
              .join("")}
        </div>

        ${
          this.testRuns.length === 0
            ? '<div class="no-data">📊 No se encontraron datos de pruebas</div>'
            : ""
        }
    </div>

    <!-- Modal para logs -->
    <div id="logsModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Logs del Test Case</h2>
                <span class="close">&times;</span>
            </div>
            <div class="tabs">
                <div class="tab active" data-tab="text">Logs de Texto</div>
                <div class="tab" data-tab="json">Logs JSON</div>
            </div>
            <div id="textLogs" class="tab-content active">
                <div class="log-content" id="textLogContent">Cargando logs...</div>
            </div>
            <div id="jsonLogs" class="tab-content">
                <div class="json-viewer" id="jsonLogContent">Cargando logs JSON...</div>
            </div>
        </div>
    </div>

    <script>
        // Data para JavaScript
        const testRunsData = ${JSON.stringify(this.testRuns, null, 2)};
        
        // Funcionalidad del dashboard
        document.addEventListener('DOMContentLoaded', function() {
            initializeDashboard();
        });
        
        function initializeDashboard() {
            // Toggle de test runs
            document.querySelectorAll('.test-run-header').forEach((header, index) => {
                header.addEventListener('click', () => toggleTestRun(index));
            });
            
            // Filtros
            document.getElementById('paymentTypeFilter').addEventListener('change', applyFilters);
            document.getElementById('statusFilter').addEventListener('change', applyFilters);
            document.getElementById('searchFilter').addEventListener('input', applyFilters);
            
            // Modal de logs
            setupLogsModal();
            
            // Inicializar con animaciones
            document.querySelectorAll('.test-run').forEach((el, index) => {
                el.style.animationDelay = index * 0.1 + 's';
                el.classList.add('fade-in');
            });
        }
        
        function toggleTestRun(index) {
            const content = document.querySelector(\`[data-test-run="\${index}"] .test-run-content\`);
            if (content) {
                content.classList.toggle('active');
            }
        }
        
        function applyFilters() {
            const paymentType = document.getElementById('paymentTypeFilter').value;
            const status = document.getElementById('statusFilter').value;
            const search = document.getElementById('searchFilter').value.toLowerCase();
            
            document.querySelectorAll('.test-run').forEach(testRun => {
                const testRunData = testRunsData[parseInt(testRun.dataset.testRun)];
                let show = true;
                
                // Filtro por tipo de pago
                if (paymentType && testRunData.paymentType !== paymentType) {
                    show = false;
                }
                
                // Filtro por estado (al menos un caso con ese estado)
                if (status && !testRunData.testCases.some(tc => tc.status === status)) {
                    show = false;
                }
                
                // Filtro por búsqueda
                if (search && !testRunData.testCases.some(tc => 
                    tc.id.toLowerCase().includes(search)
                )) {
                    show = false;
                }
                
                testRun.style.display = show ? 'block' : 'none';
            });
        }
        
        function setupLogsModal() {
            const modal = document.getElementById('logsModal');
            const closeBtn = document.querySelector('.close');
            
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
            
            window.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
            
            // Tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.addEventListener('click', () => switchTab(tab.dataset.tab));
            });
        }
        
        function switchTab(tabName) {
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            document.querySelector(\`[data-tab="\${tabName}"]\`).classList.add('active');
            document.getElementById(tabName + (tabName === 'text' ? 'Logs' : 'Logs')).classList.add('active');
        }
        
        async function openLogs(testCaseId, runId, paymentType) {
            const modal = document.getElementById('logsModal');
            const title = document.getElementById('modalTitle');
            const textContent = document.getElementById('textLogContent');
            const jsonContent = document.getElementById('jsonLogContent');
            
            title.textContent = \`Logs: \${testCaseId}\`;
            modal.style.display = 'block';
            
            // Encontrar el test case
            const testRun = testRunsData.find(tr => tr.runId === runId && tr.paymentType === paymentType);
            const testCase = testRun?.testCases.find(tc => tc.id === testCaseId);
            
            if (!testCase) {
                textContent.textContent = 'No se encontraron datos del test case';
                jsonContent.textContent = 'No se encontraron datos del test case';
                return;
            }
            
            // Cargar logs de texto
            if (testCase.hasLogs) {
                try {
                    const response = await fetch(testCase.logsPath);
                    const text = await response.text();
                    textContent.textContent = text;
                } catch (error) {
                    textContent.textContent = \`Error cargando logs: \${error.message}\`;
                }
            } else {
                textContent.textContent = 'No hay logs de texto disponibles';
            }
            
            // Cargar logs JSON
            if (testCase.hasJsonLogs) {
                try {
                    const response = await fetch(testCase.jsonLogsPath);
                    const json = await response.json();
                    jsonContent.innerHTML = \`<pre>\${JSON.stringify(json, null, 2)}</pre>\`;
                } catch (error) {
                    jsonContent.textContent = \`Error cargando logs JSON: \${error.message}\`;
                }
            } else {
                jsonContent.textContent = 'No hay logs JSON disponibles';
            }
        }
        
        function openScreenshots(testCaseId, runId, paymentType) {
            const testRun = testRunsData.find(tr => tr.runId === runId && tr.paymentType === paymentType);
            const testCase = testRun?.testCases.find(tc => tc.id === testCaseId);
            
            if (testCase && testCase.hasScreenshots) {
                // Abrir en nueva ventana con galería de imágenes
                const screenshotsWindow = window.open('', '_blank');
                screenShotsWindow.document.write(generateScreenshotGallery(testCase));
            } else {
                alert('No hay screenshots disponibles para este test case');
            }
        }
        
        function openVideo(testCaseId, runId, paymentType) {
            const testRun = testRunsData.find(tr => tr.runId === runId && tr.paymentType === paymentType);
            const testCase = testRun?.testCases.find(tc => tc.id === testCaseId);
            
            if (testCase && testCase.hasVideo) {
                // Abrir video en nueva ventana
                const videoWindow = window.open('', '_blank');
                videoWindow.document.write(\`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Video: \${testCaseId}</title>
                        <style>
                            body { margin: 0; padding: 20px; background: #000; color: white; text-align: center; }
                            video { max-width: 100%; max-height: 80vh; }
                            h1 { color: white; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <h1>📹 Video: \${testCaseId}</h1>
                        <video controls autoplay>
                            <source src="\${testCase.videoPath}" type="video/mp4">
                            Tu navegador no soporta el elemento video.
                        </video>
                    </body>
                    </html>
                \`);
            } else {
                alert('No hay video disponible para este test case');
            }
        }
        
        function generateScreenshotGallery(testCase) {
            return \`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Screenshots: \${testCase.id}</title>
                    <style>
                        body { margin: 0; padding: 20px; background: #f5f5f7; font-family: Arial, sans-serif; }
                        h1 { text-align: center; color: #333; margin-bottom: 30px; }
                        .gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
                        .screenshot { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .screenshot img { width: 100%; height: 200px; object-fit: cover; cursor: pointer; }
                        .screenshot-info { padding: 15px; }
                        .screenshot-name { font-weight: bold; color: #333; }
                        .screenshot-type { color: #666; font-size: 0.9rem; margin-top: 5px; }
                        .modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); }
                        .modal img { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); max-width: 90%; max-height: 90%; }
                        .close { position: absolute; top: 20px; right: 30px; color: white; font-size: 30px; cursor: pointer; }
                    </style>
                </head>
                <body>
                    <h1>📸 Screenshots: \${testCase.id}</h1>
                    <div class="gallery">
                        \${testCase.screenshots.map(screenshot => \`
                            <div class="screenshot">
                                <img src="\${screenshot.path}" alt="\${screenshot.name}" onclick="openModal(this.src)">
                                <div class="screenshot-info">
                                    <div class="screenshot-name">\${screenshot.name}</div>
                                    <div class="screenshot-type">Tipo: \${screenshot.type}</div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                    
                    <div id="modal" class="modal" onclick="closeModal()">
                        <span class="close">&times;</span>
                        <img id="modalImg">
                    </div>
                    
                    <script>
                        function openModal(src) {
                            document.getElementById('modal').style.display = 'block';
                            document.getElementById('modalImg').src = src;
                        }
                        
                        function closeModal() {
                            document.getElementById('modal').style.display = 'none';
                        }
                    </script>
                </body>
                </html>
            \`;
        }
    </script>
</body>
</html>`;
  }

  /**
   * Genera HTML para un test run individual
   */
  generateTestRunHTML(testRun, index) {
    const successRate =
      testRun.totalCases > 0
        ? Math.round((testRun.successfulCases / testRun.totalCases) * 100)
        : 0;

    return `
      <div class="test-run" data-test-run="${index}">
        <div class="test-run-header">
          <div class="test-run-title">
            🧪 ${testRun.paymentType} - ${testRun.runId}
          </div>
          <div class="test-run-meta">
            <span>📅 ${testRun.timestamp.toLocaleString()}</span>
            <span>📊 ${testRun.totalCases} casos</span>
            <span>✅ ${testRun.successfulCases} exitosos</span>
            <span>❌ ${testRun.failedCases} fallidos</span>
            <span>📈 ${successRate}% éxito</span>
          </div>
        </div>
        <div class="test-run-content">
          <div class="test-cases">
            ${testRun.testCases
              .map((testCase) => this.generateTestCaseHTML(testCase, testRun))
              .join("")}
          </div>
        </div>
      </div>`;
  }

  /**
   * Genera HTML para un caso de prueba individual
   */
  generateTestCaseHTML(testCase, testRun) {
    const statusClass =
      testCase.status === "OK"
        ? "status-ok"
        : testCase.status === "ERROR"
        ? "status-error"
        : "status-incomplete";

    return `
      <div class="test-case">
        <div class="test-case-header">
          <div class="test-case-id">📋 ${testCase.id}</div>
          <div class="status-badge ${statusClass}">${testCase.status}</div>
        </div>
        
        <div class="test-case-actions">
          <button class="btn btn-primary" onclick="openLogs('${
            testCase.id
          }', '${testRun.runId}', '${testRun.paymentType}')" 
                  ${
                    !testCase.hasLogs && !testCase.hasJsonLogs ? "disabled" : ""
                  }>
            📄 Ver Logs
          </button>
          
          <button class="btn btn-secondary" onclick="openScreenshots('${
            testCase.id
          }', '${testRun.runId}', '${testRun.paymentType}')" 
                  ${!testCase.hasScreenshots ? "disabled" : ""}>
            📸 Screenshots (${testCase.screenshots.length})
          </button>
          
          <button class="btn btn-success" onclick="openVideo('${
            testCase.id
          }', '${testRun.runId}', '${testRun.paymentType}')" 
                  ${!testCase.hasVideo ? "disabled" : ""}>
            🎥 Video
          </button>
        </div>
        
        ${
          testCase.errors.length > 0
            ? `
          <div class="errors">
            <h4>❌ Errores detectados:</h4>
            ${testCase.errors
              .map((error) => `<div class="error-item">${error}</div>`)
              .join("")}
          </div>
        `
            : ""
        }
      </div>`;
  }

  /**
   * Métodos de cálculo de estadísticas
   */
  getTotalTests() {
    return this.testRuns.reduce((total, run) => total + run.totalCases, 0);
  }

  getTotalSuccessfulTests() {
    return this.testRuns.reduce((total, run) => total + run.successfulCases, 0);
  }

  getTotalFailedTests() {
    return this.testRuns.reduce((total, run) => total + run.failedCases, 0);
  }

  getUniquePaymentTypes() {
    return [...new Set(this.testRuns.map((run) => run.paymentType))];
  }

  /**
   * Genera y guarda el dashboard
   */
  async generate() {
    console.log("🔄 Generando dashboard...");

    await this.collectTestRunData();

    if (!fs.existsSync(this.outputPath)) {
      fs.mkdirSync(this.outputPath, { recursive: true });
    }

    const html = this.generateHTML();
    const htmlPath = path.join(this.outputPath, "index.html");

    fs.writeFileSync(htmlPath, html, "utf8");

    console.log(`✅ Dashboard generado: ${htmlPath}`);
    console.log(`🌐 Abrir en navegador: file://${htmlPath}`);

    return htmlPath;
  }
}

module.exports = { DashboardGenerator };
