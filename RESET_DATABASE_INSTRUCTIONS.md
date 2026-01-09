# Instrucciones para Resetear la Base de Datos

Si los pacientes aún aparecen como "Sin Clasificar" después de los cambios, es porque la base de datos existente tiene pacientes antiguos sin triaje asignado.

## Opción 1: Reset Automático (RECOMENDADO)

### Windows:
```powershell
# 1. Abre PowerShell como administrador
# 2. Navega a la carpeta del proyecto
cd "D:\Manny\DocumentsD\Proyecto ADS 3\sistemahospitalario3"

# 3. Ejecuta el script de reset
.\reset-database.ps1

# 4. Inicia la aplicación
npm run tauri dev
```

### Mac/Linux:
```bash
# 1. Navega a la carpeta del proyecto
cd "D/Manny/DocumentsD/Proyecto ADS 3/sistemahospitalario3"

# 2. Ejecuta el script de reset
bash reset-database.sh

# 3. Inicia la aplicación
npm run tauri dev
```

## Opción 2: Reset Manual

### Windows:
1. Presiona `Win + R`
2. Escribe: `%USERPROFILE%\.local\share\hospital-system`
3. Presiona Enter
4. Elimina el archivo `hospital.db` (si existe)
5. Inicia la aplicación con `npm run tauri dev`

### Mac:
1. Abre Finder
2. Presiona `Cmd + Shift + G` (Go to Folder)
3. Copia: `~/.local/share/hospital-system`
4. Presiona Enter
5. Elimina `hospital.db`
6. Inicia con `npm run tauri dev`

### Linux:
```bash
rm ~/.local/share/hospital-system/hospital.db
npm run tauri dev
```

## Qué Sucede Después del Reset

Cuando inices la aplicación después del reset:

1. **Se crea una nueva base de datos limpia**
2. **Se insertan todos los 47 pacientes con triaje preestablecido:**
   - 🔴 ROJO (Crítico): 8 pacientes
   - 🟠 NARANJA (Emergencia): 3 pacientes
   - 🟡 AMARILLO (Urgente): 10 pacientes
   - 🟢 VERDE (Menos urgente): 23 pacientes
   - 🔵 AZUL (No urgente): 3 pacientes

3. **Se ejecuta la función de validación de triaje** que:
   - Verifica que TODOS los pacientes tengan triaje_level
   - Asigna triaje a cualquier paciente faltante (basado en su condition)
   - Muestra en consola cuáles fueron asignados

4. **Se insertan 51 medicamentos** con inventario preestablecido

5. **Se crean enfermeros, doctores, y otros datos iniciales**

## Verificación

Después de resetear e iniciar:

1. **Abre la consola del navegador** (F12 en la aplicación Tauri)
2. **Busca mensajes que digan:**
   - ✅ "Triage assignment complete: X assigned, Y already assigned"
   - ✅ "All patients have triage assigned"
   - ✅ Listado de cada paciente con su triaje asignado

3. **Inicia sesión como enfermero:**
   - Usuario: `enfermero`
   - Contraseña: `Enfermero123`

4. **Ve a "Pacientes Asignados"**

5. **Verifica que TODOS los pacientes muestren:**
   - Nombre
   - 🔴/🟠/🟡/🟢/🔵 Color de triaje
   - Nombre del nivel (Resucitación, Emergencia, etc.)
   - No debe decir "Sin Clasificar"

## Si Aún No Funciona

Si después del reset los pacientes aún no muestran triaje:

1. **Verifica que `hospital.db` fue eliminado:**
   - En Windows: `%USERPROFILE%\.local\share\hospital-system\hospital.db`
   - En Mac: `~/.local/share/hospital-system/hospital.db`
   - En Linux: `~/.local/share/hospital-system/hospital.db`

2. **Revisa la consola para errores:**
   - Abre F12 en la aplicación
   - Busca cualquier mensaje rojo (error)
   - Copia el error completo y reporta

3. **Verifica que los cambios de código estén guardados:**
   - `src/services/database.js` debe contener `ensureTriageAssignment()`
   - `src/services/database.js` debe llamar `await ensureTriageAssignment();` en initDatabase

4. **Reconstruye el proyecto:**
   ```bash
   npm run tauri dev
   ```
   (Esto asegura que se compilen todos los cambios)

## Cambios Realizados

Se implementó una **función de migración automática** que:
- ✅ Se ejecuta cada vez que inicia la aplicación
- ✅ Verifica que TODOS los pacientes tengan triaje asignado
- ✅ Asigna triaje automáticamente basado en la condición del paciente
- ✅ Registra en consola cada asignación para verificación
- ✅ Es tolerante a errores y no detiene la aplicación si falla

---

**Problema Resuelto:** Cualquier paciente sin triaje será asignado automáticamente al iniciar.

**Resultado Esperado:** Todos los pacientes en "Pacientes Asignados" mostrarán su color de triaje (🔴🟠🟡🟢🔵).
