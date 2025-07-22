# 🛠️ Dev Tools - Herramientas de Desarrollo

Esta carpeta contiene herramientas y archivos de desarrollo para el sistema de testing de PayClip.

## 📁 Contenido

### 🧪 Scripts de Testing

- `test-error-logging.js` - Script para probar el sistema de logging de errores con información de línea
- `test-log-isolation.js` - Script para probar el aislamiento de logs entre test cases
- `update-error-logs.js` - Script para detectar automáticamente archivos que necesitan actualización de error logging

### 📋 Documentación de Implementaciones

- `ERROR_LOGGING_IMPLEMENTATION_COMPLETE.md` - Documentación completa del sistema de error logging con información de línea
- `LOG_ISOLATION_IMPLEMENTATION_COMPLETE.md` - Documentación del sistema de aislamiento de logs por test case

### 🔍 Scripts de Análisis

- `analyze-logs.js` - Herramienta para analizar logs y detectar problemas de mezclado
- `validate-isolation.js` - Validador de aislamiento de logs entre test cases paralelos

## 🚀 Uso

### Probar Error Logging

```bash
node dev-tools/test-error-logging.js
```

### Verificar Aislamiento de Logs

```bash
node dev-tools/test-log-isolation.js
```

### Detectar Archivos que Necesitan Actualización

```bash
node dev-tools/update-error-logs.js
```

## 📝 Notas

- Estos archivos son para desarrollo y testing interno
- No forman parte del flujo principal de testing de pagos
- Se mantienen separados para organización y claridad
