# PayClip Testing MCP Server - Guía de Inicio Rápido

## 🚀 Instalación en 3 Pasos

### 1. Instalar el Servidor MCP

```bash
cd /Users/gustavo.garcia/Desktop/clip/puppeter_checkout/mcp-server
./install.sh
```

### 2. Configurar Claude Desktop

Abre tu archivo de configuración de Claude Desktop y agrega:

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

**Ubicación del archivo de configuración:**

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

### 3. Reiniciar Claude Desktop

Reinicia Claude Desktop para cargar el nuevo servidor MCP.

## ✅ Verificación

Una vez configurado, deberías ver estas herramientas disponibles en Claude:

- 🧪 **run_payclip_test** - Ejecutar tests con filtros
- 📊 **get_test_results** - Ver resultados recientes
- 📋 **list_available_tests** - Listar configuraciones
- 📄 **get_test_parameters** - Ver parámetros Excel
- 🔧 **run_unit_tests** - Ejecutar unit tests
- 🚀 **generate_test_command** - Generar comandos npm

## 🎯 Primeros Comandos

### Test Básico

```
Por favor ejecuta un test básico en DEV usando la herramienta run_payclip_test
```

### Ver Resultados

```
Muéstrame los resultados más recientes de HOSTED_CHECKOUT en DEV
```

### Listar Tests Disponibles

```
Lista todos los tests disponibles y su estado actual
```

## 📚 Comandos Disponibles por Ambiente

### DEV Environment

```
# Todos los tests (silencioso)
npm run test:dev

# Todos los tests (verbose)
npm run test:dev:verbose

# Por tipo específico
npm run test:dev --type=HOSTED_CHECKOUT
npm run test:dev --type=LINK_DE_PAGO
npm run test:dev --type=SUBSCRIPTION

# Limitados
npm run test:dev --just=1
npm run test:dev --just=2

# Con grabación
npm run test:dev --record=true

# Combinaciones
npm run test:dev --type=HOSTED_CHECKOUT --just=2 --record=true
npm run test:dev:verbose --type=LINK_DE_PAGO --just=1
```

### STAGE Environment

```
# Todos los tests (silencioso)
npm run test:stage

# Todos los tests (verbose)
npm run test:stage:verbose

# Por tipo específico
npm run test:stage --type=HOSTED_CHECKOUT
npm run test:stage --type=LINK_DE_PAGO
npm run test:stage --type=SUBSCRIPTION

# Limitados
npm run test:stage --just=1
npm run test:stage --just=2

# Con grabación
npm run test:stage --record=true

# Combinaciones
npm run test:stage --type=HOSTED_CHECKOUT --just=2 --record=true
npm run test:stage:verbose --type=LINK_DE_PAGO --just=1
```

## 🎯 Tipos de Payment Request

1. **HOSTED_CHECKOUT** - Checkout hospedado
2. **LINK_DE_PAGO** - Links de pago
3. **SUBSCRIPTION** - Suscripciones

## 🔊 Modos de Logging

- **Silencioso (default)**: Solo logs críticos, output limpio
- **Verbose**: Todos los logs, ideal para debugging

## 📁 Ubicación de Resultados

Los resultados se guardan en:

```
completed_tests/test_runs/{ENV}-{PAYMENT_TYPE}/{TIMESTAMP}/
```

Cada test genera:

- 📊 **Excel report** con resumen
- 📸 **Screenshots** de cada paso
- 📋 **JSON logs** estructurados con emojis

## 🆘 Troubleshooting

### Error: "Tools not available"

1. Verifica la configuración en Claude Desktop
2. Reinicia Claude Desktop
3. Comprueba que el servidor está instalado correctamente

### Error: "Command failed"

1. Verifica que estás en el directorio correcto
2. Comprueba que las dependencias del framework principal están instaladas
3. Verifica los tokens de autenticación en `.env`

### Error: "No results found"

1. Ejecuta un test primero
2. Verifica que el directorio `completed_tests` existe
3. Comprueba los permisos de escritura

## 🎉 ¡Listo para Usar!

Ahora puedes usar comandos naturales como:

- "Ejecuta todos los tests de HOSTED_CHECKOUT en DEV"
- "Muéstrame los resultados más recientes de STAGE"
- "Ejecuta solo el primer test de LINK_DE_PAGO con grabación"
- "Genera el comando para ejecutar 2 tests de SUBSCRIPTION en verbose"
- "Lista todas las configuraciones disponibles"

¡El MCP Server traducirá automáticamente tus peticiones a los comandos correspondientes del framework!

---

**💡 Tip**: Usa comandos naturales - el servidor MCP entiende tanto instrucciones específicas como conversaciones casuales sobre testing.
