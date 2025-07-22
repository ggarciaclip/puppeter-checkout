# PayClip Testing MCP Server - Ejemplos Prácticos

## 🎯 Casos de Uso Comunes

### 1. Ejecutar Tests Básicos

#### Test completo en DEV (modo silencioso)

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev"
  }
}
```

#### Test completo en STAGE (modo verbose)

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "stage",
    "verbose": true
  }
}
```

### 2. Tests por Tipo de Payment

#### Solo HOSTED_CHECKOUT en DEV

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "type": "HOSTED_CHECKOUT"
  }
}
```

#### Solo LINK_DE_PAGO en STAGE con grabación

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "stage",
    "type": "LINK_DE_PAGO",
    "record": true
  }
}
```

#### Solo SUBSCRIPTION primeros 2 tests

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "type": "SUBSCRIPTION",
    "just": 2
  }
}
```

### 3. Tests Limitados

#### Ejecutar solo el primer test case

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "just": 1
  }
}
```

#### Ejecutar primeros 3 tests con verbose

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "stage",
    "just": 3,
    "verbose": true
  }
}
```

### 4. Tests con Grabación

#### HOSTED_CHECKOUT con video recording

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "type": "HOSTED_CHECKOUT",
    "record": true
  }
}
```

#### Test limitado con grabación y verbose

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "stage",
    "type": "LINK_DE_PAGO",
    "just": 2,
    "record": true,
    "verbose": true
  }
}
```

### 5. Combinaciones Avanzadas

#### Test completo con todas las opciones

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "stage",
    "type": "HOSTED_CHECKOUT",
    "just": 2,
    "record": true,
    "verbose": true
  }
}
```

#### Test con argumentos personalizados

```json
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "type": "SUBSCRIPTION",
    "customArgs": "--timeout=30000"
  }
}
```

## 📊 Consultar Resultados

### Ver resultados más recientes

#### HOSTED_CHECKOUT en DEV

```json
{
  "tool": "get_test_results",
  "arguments": {
    "environment": "dev",
    "paymentType": "HOSTED_CHECKOUT"
  }
}
```

#### LINK_DE_PAGO en STAGE

```json
{
  "tool": "get_test_results",
  "arguments": {
    "environment": "stage",
    "paymentType": "LINK_DE_PAGO"
  }
}
```

#### SUBSCRIPTION en DEV

```json
{
  "tool": "get_test_results",
  "arguments": {
    "environment": "dev",
    "paymentType": "SUBSCRIPTION"
  }
}
```

## 🔍 Consultar Configuraciones

### Listar todos los tests disponibles

```json
{
  "tool": "list_available_tests",
  "arguments": {}
}
```

### Ver parámetros de DEV

```json
{
  "tool": "get_test_parameters",
  "arguments": {
    "environment": "dev"
  }
}
```

### Ver parámetros de STAGE

```json
{
  "tool": "get_test_parameters",
  "arguments": {
    "environment": "stage"
  }
}
```

## 🧪 Tests Unitarios

### Ejecutar unit tests

```json
{
  "tool": "run_unit_tests",
  "arguments": {}
}
```

## 🚀 Generar Comandos

### Comando básico para DEV

```json
{
  "tool": "generate_test_command",
  "arguments": {
    "environment": "dev"
  }
}
```

### Comando específico con filtros

```json
{
  "tool": "generate_test_command",
  "arguments": {
    "environment": "stage",
    "type": "HOSTED_CHECKOUT",
    "just": 2,
    "verbose": true
  }
}
```

### Comando con grabación

```json
{
  "tool": "generate_test_command",
  "arguments": {
    "environment": "dev",
    "type": "LINK_DE_PAGO",
    "record": true
  }
}
```

## 🎯 Flujos de Trabajo Recomendados

### 1. Desarrollo de Nuevas Features

```json
// 1. Ejecutar un test rápido para verificar
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "just": 1,
    "verbose": true
  }
}

// 2. Ver los resultados
{
  "tool": "get_test_results",
  "arguments": {
    "environment": "dev",
    "paymentType": "HOSTED_CHECKOUT"
  }
}

// 3. Si todo está bien, ejecutar suite completa
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "type": "HOSTED_CHECKOUT"
  }
}
```

### 2. Testing de Regresión

```json
// 1. Ejecutar todos los tipos en DEV
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev"
  }
}

// 2. Ejecutar todos los tipos en STAGE
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "stage"
  }
}

// 3. Revisar resultados de cada tipo
{
  "tool": "get_test_results",
  "arguments": {
    "environment": "stage",
    "paymentType": "HOSTED_CHECKOUT"
  }
}
```

### 3. Debugging de Problemas

```json
// 1. Ejecutar con verbose y grabación
{
  "tool": "run_payclip_test",
  "arguments": {
    "environment": "dev",
    "type": "HOSTED_CHECKOUT",
    "just": 1,
    "record": true,
    "verbose": true
  }
}

// 2. Revisar logs detallados
{
  "tool": "get_test_results",
  "arguments": {
    "environment": "dev",
    "paymentType": "HOSTED_CHECKOUT"
  }
}

// 3. Generar comando para ejecución manual si es necesario
{
  "tool": "generate_test_command",
  "arguments": {
    "environment": "dev",
    "type": "HOSTED_CHECKOUT",
    "verbose": true,
    "record": true
  }
}
```

## 🔄 Scripts de Automatización

### Test Diario Completo

```bash
# Secuencia de comandos para test completo diario
# 1. DEV HOSTED_CHECKOUT
# 2. DEV LINK_DE_PAGO
# 3. DEV SUBSCRIPTION
# 4. STAGE HOSTED_CHECKOUT
# 5. STAGE LINK_DE_PAGO
# 6. STAGE SUBSCRIPTION
```

### Test de Smoke (rápido)

```bash
# Solo primeros tests de cada tipo para verificación rápida
# DEV: just=1 para cada tipo
# STAGE: just=1 para cada tipo
```

### Test de Feature Específica

```bash
# Solo un tipo específico en ambos ambientes
# Con grabación y verbose para análisis detallado
```

## 📈 Métricas y Monitoreo

### KPIs a Monitorear

- Tiempo de ejecución por tipo de test
- Tasa de éxito/fallo por ambiente
- Cantidad de screenshots generados
- Tamaño de logs JSON
- Tests ejecutados por día/semana

### Alertas Recomendadas

- Fallos consecutivos en STAGE
- Tiempo de ejecución superior a threshold
- Errores en unit tests
- Falta de ejecución por más de 24h

---

**💡 Tip**: Usa el comando `list_available_tests` regularmente para ver el estado actual de todas las configuraciones.
