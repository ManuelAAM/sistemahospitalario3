const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve('./hospital.db');
console.log('🏥 Verificando base de datos en:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('❌ Error al abrir la DB:', err.message);
    process.exit(1);
  }

  console.log('✅ Base de datos abierta correctamente\n');

  // 1. Contar pacientes total
  db.get(`SELECT COUNT(*) as count FROM patients`, (err, row) => {
    if (err) {
      console.error('Error:', err.message);
      return;
    }
    console.log('📊 Total de pacientes:', row.count);

    // 2. Contar pacientes con floor
    db.get(`SELECT COUNT(*) as count FROM patients WHERE floor IS NOT NULL AND floor != ''`, (err, row) => {
      if (err) {
        console.error('Error:', err.message);
        return;
      }
      console.log('🏢 Pacientes con floor:', row.count);

      // 3. Pacientes de Medicina Interna
      db.get(`SELECT COUNT(*) as count FROM patients WHERE floor = 'Piso 3 - Medicina Interna'`, (err, row) => {
        if (err) {
          console.error('Error:', err.message);
          return;
        }
        console.log('🩺 Pacientes de Medicina Interna:', row.count);

        // 4. Contar asignaciones
        db.get(`SELECT COUNT(*) as count FROM patient_assignments`, (err, row) => {
          if (err) {
            console.error('Error:', err.message);
            return;
          }
          console.log('📋 Total de asignaciones:', row.count);

          // 5. Buscar Laura Martínez
          db.get(`SELECT id, name FROM users WHERE name = 'Enf. Laura Martínez'`, (err, row) => {
            if (err) {
              console.error('Error:', err.message);
              db.close();
              return;
            }
            
            if (row) {
              console.log('👩‍⚕️ Laura Martínez encontrada:', row);
              const nurseId = row.id;

              // 6. Contar asignaciones de Laura
              db.get(`SELECT COUNT(*) as count FROM patient_assignments WHERE nurse_id = ? AND status = 'Active'`, [nurseId], (err, assignRow) => {
                if (err) {
                  console.error('Error:', err.message);
                  db.close();
                  return;
                }
                
                console.log('✨ Asignaciones de Laura Martínez:', assignRow.count);

                // 7. Mostrar pacientes asignados
                if (assignRow.count > 0) {
                  db.all(`
                    SELECT p.name, p.floor, pa.shift_type 
                    FROM patient_assignments pa 
                    JOIN patients p ON pa.patient_id = p.id 
                    WHERE pa.nurse_id = ? AND pa.status = 'Active'
                    ORDER BY pa.shift_type, p.name
                  `, [nurseId], (err, patients) => {
                    if (err) {
                      console.error('Error:', err.message);
                    } else {
                      console.log('\n👥 Pacientes asignados a Laura Martínez:');
                      patients.forEach(patient => {
                        console.log(`   - ${patient.name} (${patient.floor}) - Turno: ${patient.shift_type}`);
                      });
                    }
                    db.close();
                  });
                } else {
                  console.log('⚠️  No hay pacientes asignados a Laura Martínez');
                  db.close();
                }
              });
            } else {
              console.log('❌ Laura Martínez no encontrada');
              db.close();
            }
          });
        });
      });
    });
  });
});