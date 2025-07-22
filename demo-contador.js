#!/usr/bin/env node

/**
 * Demostración del contador de tareas activas
 * Este script simula el comportamiento del contador sin ejecutar pruebas reales
 */

console.log("🧪 === DEMOSTRACIÓN DEL CONTADOR DE TAREAS ACTIVAS ===\n");

// Simular el comportamiento del contador
let activeTasks = 0;

async function simulateTask(taskId, duration = 2000) {
  console.log(`🚀 Iniciando tarea ${taskId}...`);
  activeTasks++;
  console.log(`📊 Tareas activas: ${activeTasks}`);

  try {
    // Simular trabajo asíncrono
    await new Promise((resolve) => setTimeout(resolve, duration));
    console.log(`✅ Tarea ${taskId} completada`);
  } catch (error) {
    console.log(`❌ Tarea ${taskId} falló: ${error.message}`);
  } finally {
    activeTasks--;
    console.log(`📊 Tareas restantes: ${activeTasks}`);
  }
}

async function simulateAfterHook() {
  console.log("\n🔄 === AFTER HOOK INICIADO ===");

  while (activeTasks > 0) {
    console.log(`⏳ After hook esperando ${activeTasks} tareas activas...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("🎉 Todas las tareas completadas!");
  console.log("🔄 Generando dashboard...");

  // Simular generación de dashboard
  await new Promise((resolve) => setTimeout(resolve, 1000));

  console.log("\n" + "=".repeat(80));
  console.log("🎉 TODAS LAS PRUEBAS COMPLETADAS");
  console.log("=".repeat(80));
  console.log("📊 Dashboard disponible en:");
  console.log(
    "🌐 file:///Users/gustavo.garcia/Desktop/clip/puppeter_checkout/completed_tests/dashboard/index.html"
  );
  console.log("=".repeat(80));
}

async function demo() {
  try {
    console.log("🎯 Simulando 5 tareas concurrentes...\n");

    // Ejecutar múltiples tareas concurrentes
    const tasks = [];
    for (let i = 1; i <= 5; i++) {
      // Diferentes duraciones para simular variabilidad real
      const duration = Math.random() * 3000 + 1000;
      tasks.push(simulateTask(i, duration));
    }

    // Iniciar el after hook mientras las tareas corren
    setTimeout(simulateAfterHook, 1000);

    // Esperar que todas las tareas terminen
    await Promise.allSettled(tasks);

    // Dar tiempo para que el after hook termine
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error("❌ Error en la demostración:", error);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  demo().then(() => {
    console.log("\n✨ Demostración completada");
    process.exit(0);
  });
}

module.exports = { demo };
