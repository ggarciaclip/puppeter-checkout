# PayClip Testing MCP Server

## 🚀 Descripción

Servidor MCP (Model Context Protocol) para el Framework de Testing E2E de PayClip. Permite ejecutar y gestionar todos los tipos de tests de manera interactiva a través de herramientas MCP.

## 🛠️ Instalación

### 1. Instalar Dependencias

```bash
cd mcp-server
npm install
```

### 2. Configurar en tu Cliente MCP

Agrega la siguiente configuración a tu cliente MCP (como Claude Desktop):

```json
{
  "mcpServers": {
    "payclip-testing": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "/Users/gustavo.garcia/Desktop/clip/puppeter_checkout/mcp-server"
    }
  }
}
```

### 3. Iniciar el Servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

## 🧰 Herramientas Disponibles

### 1. `run_payclip_test`

Ejecuta tests de PayClip E2E con opciones personalizables.

**Parámetros:**

- `environment` (requerido): `dev` o `stage`
- `type` (opcional): `HOSTED_CHECKOUT`, `LINK_DE_PAGO`, `SUBSCRIPTION`
- `just` (opcional): Número de tests a ejecutar (1, 2, 3, etc.)
- `record` (opcional): Habilitar grabación de video (`true`/`false`)
- `verbose` (opcional): Modo verbose para logs detallados (`true`/`false`)
- `customArgs` (opcional): Argumentos adicionales personalizados

**Ejemplos:**

```javascript
// Test básico en DEV
{
  "environment": "dev"
}

// Test específico con filtros
{
  "environment": "stage",
  "type": "HOSTED_CHECKOUT",
  "just": 2,
  "verbose": true
}

// Test con grabación
{
  "environment": "dev",
  "type": "LINK_DE_PAGO",
  "record": true
}
```

### 2. `get_test_results`

Obtiene los resultados más recientes de tests ejecutados.

**Parámetros:**

- `environment` (requerido): `dev` o `stage`
- `paymentType` (requerido): `HOSTED_CHECKOUT`, `LINK_DE_PAGO`, `SUBSCRIPTION`

**Ejemplo:**

```javascript
{
  "environment": "dev",
  "paymentType": "HOSTED_CHECKOUT"
}
```

### 3. `list_available_tests`

Lista todas las configuraciones de tests disponibles y el estado actual.

**Parámetros:** Ninguno

### 4. `get_test_parameters`

Obtiene información sobre los parámetros de test desde archivos Excel.

**Parámetros:**

- `environment` (requerido): `dev` o `stage`

### 5. `run_unit_tests`

Ejecuta los tests unitarios del framework.

**Parámetros:** Ninguno

### 6. `generate_test_command`

Genera el comando npm exacto para una configuración de test específica.

**Parámetros:**

- `environment` (requerido): `dev` o `stage`
- `type` (opcional): Tipo de payment
- `just` (opcional): Límite de tests
- `record` (opcional): Grabación de video
- `verbose` (opcional): Modo verbose

## 🎯 Casos de Uso Comunes

### Ejecutar Tests por Ambiente

```javascript
// Todos los tests en DEV (modo silencioso)
run_payclip_test({ environment: "dev" });

// Todos los tests en STAGE (modo verbose)
run_payclip_test({ environment: "stage", verbose: true });
```

### Ejecutar Tests por Tipo

```javascript
// Solo HOSTED_CHECKOUT en DEV
run_payclip_test({
  environment: "dev",
  type: "HOSTED_CHECKOUT",
});

// Solo LINK_DE_PAGO en STAGE con grabación
run_payclip_test({
  environment: "stage",
  type: "LINK_DE_PAGO",
  record: true,
});

// Solo SUBSCRIPTION primeros 3 tests
run_payclip_test({
  environment: "dev",
  type: "SUBSCRIPTION",
  just: 3,
});
```

### Combinaciones Avanzadas

```javascript
// Test completo con todas las opciones
run_payclip_test({
  environment: "stage",
  type: "HOSTED_CHECKOUT",
  just: 2,
  record: true,
  verbose: true,
});

// Test con argumentos personalizados
run_payclip_test({
  environment: "dev",
  customArgs: "--timeout=30000 --retry=3",
});
```

### Revisar Resultados

```javascript
// Ver resultados más recientes
get_test_results({
  environment: "dev",
  paymentType: "HOSTED_CHECKOUT",
});

// Listar todos los tests disponibles
list_available_tests({});

// Ver parámetros de configuración
get_test_parameters({ environment: "stage" });
```

### Generar Comandos

```javascript
// Generar comando para ejecución manual
generate_test_command({
  environment: "dev",
  type: "LINK_DE_PAGO",
  verbose: true,
});
```

## 📊 Estructura de Respuestas

### Ejecución Exitosa

```
✅ Test execution completed successfully!

🚀 Command: npm run test:dev --type=HOSTED_CHECKOUT
📊 Exit Code: 0
📋 Output: [logs del test]

🎉 Check the completed_tests/test_runs/ directory for detailed results and reports.
```

### Resultados de Tests

```
📊 Latest Results for DEV-HOSTED_CHECKOUT

🕐 Timestamp: 06_07_00.08.14
📁 Path: /path/to/results
📈 Total Tests: 5
✅ Successful: 4
❌ Failed: 1
📊 Excel Report: 06_07_00.08.14_results.xlsx

🧪 Test Cases:
• Guest_MXN_DCC
  - Logs: ✅
  - Screenshots: ✅
  - Status: 🎉 Success
```

### Comandos Generados

```
🚀 Generated Test Command

npm run test:dev:verbose --type=HOSTED_CHECKOUT --just=2

📋 Command Breakdown:
• Environment: DEV
• Mode: Verbose (full logs)
• Payment Type: HOSTED_CHECKOUT
• Test Limit: First 2 tests only

💡 Alternative with environment variable:
VERBOSE_LOGS=true npm run test:dev --type=HOSTED_CHECKOUT --just=2
```

## 🔧 Configuración Avanzada

### Variables de Entorno

El servidor respeta las mismas variables de entorno que el framework principal:

- `AUTH_DEV` - Token de autenticación para DEV
- `AUTH_STAGE` - Token de autenticación para STAGE
- `3DS_TOKEN` - Token para pruebas 3DS
- `VERBOSE_LOGS` - Habilitar logs verbose

### Timeouts y Límites

Los comandos ejecutados a través del MCP server heredan la configuración del framework:

- Timeout por defecto: 15 segundos
- Concurrencia máxima: 4 instancias
- Viewport: 1280x1080

## 🐛 Troubleshooting

### Error: "Module not found"

```bash
cd mcp-server
npm install
```

### Error: "Framework not found"

Verifica que la ruta al framework sea correcta en `index.js`:

```javascript
const FRAMEWORK_ROOT = path.resolve("../");
```

### Error: "Permission denied"

```bash
chmod +x index.js
```

### Logs de Debug

```bash
DEBUG=* npm run dev
```

## 🚀 Desarrollo

### Estructura del Proyecto

```
mcp-server/
├── package.json          # Dependencias del MCP server
├── index.js              # Servidor principal
├── mcp-config.json       # Configuración MCP
└── README.md             # Esta documentación
```

### Agregar Nuevas Herramientas

1. Definir la herramienta en `ListToolsRequestSchema`
2. Implementar la lógica en `CallToolRequestSchema`
3. Documentar en este README

### Testing del Servidor

```bash
# Test básico
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node index.js

# Test con herramienta específica
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_available_tests","arguments":{}}}' | node index.js
```

## 📋 TODO

- [ ] Integración con dashboards web
- [ ] Métricas en tiempo real
- [ ] Notificaciones de completación
- [ ] Soporte para tests programados
- [ ] Integración con CI/CD pipelines

---

**Versión**: 1.0.0  
**Compatibilidad**: MCP SDK 1.0+, Node.js 16+  
**Autor**: PayClip Team
