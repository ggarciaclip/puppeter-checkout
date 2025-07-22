# Configuraciones MCP para diferentes clientes

## Claude Desktop (macOS)

**Archivo**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "payclip-testing": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "/Users/gustavo.garcia/Desktop/clip/puppeter_checkout/mcp-server",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Claude Desktop (Windows)

**Archivo**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "payclip-testing": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "C:\\Users\\tu-usuario\\Desktop\\clip\\puppeter_checkout\\mcp-server",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Claude Desktop (Linux)

**Archivo**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "payclip-testing": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "/home/tu-usuario/Desktop/clip/puppeter_checkout/mcp-server",
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

## Configuración Alternativa con npm

Si prefieres usar npm para ejecutar el servidor:

```json
{
  "mcpServers": {
    "payclip-testing": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/ruta/completa/a/mcp-server"
    }
  }
}
```

## Configuración con Variables de Entorno

Para pasar variables de entorno específicas:

```json
{
  "mcpServers": {
    "payclip-testing": {
      "command": "node",
      "args": ["index.js"],
      "cwd": "/ruta/completa/a/mcp-server",
      "env": {
        "NODE_ENV": "production",
        "VERBOSE_LOGS": "false",
        "DEBUG": "false"
      }
    }
  }
}
```

## Configuración de Desarrollo

Para desarrollo con auto-reload:

```json
{
  "mcpServers": {
    "payclip-testing-dev": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/ruta/completa/a/mcp-server",
      "env": {
        "NODE_ENV": "development",
        "DEBUG": "true"
      }
    }
  }
}
```

## Verificación de la Configuración

Una vez configurado, puedes verificar que funciona:

1. **Reinicia Claude Desktop**
2. **Abre una nueva conversación**
3. **Pregunta**: "¿Qué herramientas tienes disponibles?"
4. **Deberías ver**: Las herramientas de PayClip Testing listadas

## Ejemplo de Uso

Una vez configurado, puedes usar comandos como:

```
"Ejecuta todos los tests de PayClip en DEV"
"Muéstrame los resultados más recientes de HOSTED_CHECKOUT"
"Lista todas las configuraciones de test disponibles"
"Ejecuta solo 2 tests de LINK_DE_PAGO con grabación"
```

## Troubleshooting

### Error: "Server not found"

- Verifica que la ruta (`cwd`) sea correcta
- Verifica que `node` esté en el PATH
- Verifica que el archivo `index.js` exista

### Error: "Permission denied"

```bash
chmod +x /ruta/a/mcp-server/index.js
```

### Error: "Module not found"

```bash
cd /ruta/a/mcp-server
npm install
```

### Verificar que el servidor arranca

```bash
cd /ruta/a/mcp-server
npm run validate
```
